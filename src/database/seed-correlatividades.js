const path = require("node:path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true,
});
const mysql = require("mysql2/promise");
const { reglas, nota } = require("./correlatividades-data");
const normalizar = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
function planificar(materias, existentes) {
  function buscar(nombre) {
    const matches = materias.filter(
      (m) => normalizar(m.nombre) === normalizar(nombre),
    );
    if (matches.length !== 1)
      throw new Error(
        `Se requiere una única materia «${nombre}». Cargá primero el plan o resolvé nombres duplicados.`,
      );
    return matches[0].id;
  }
  const acciones = reglas.map((regla) => {
    const materia_id = buscar(regla.materia);
    const filas = [
      ...regla.cursadas.map((nombre) => [
        materia_id,
        buscar(nombre),
        "CURSADA",
      ]),
      ...regla.aprobadas.map((nombre) => [
        materia_id,
        buscar(nombre),
        "APROBADA",
      ]),
    ];
    const actuales = existentes
      .filter((r) => r.materia_id === materia_id)
      .map((r) => `${r.materia_requisito_id}:${r.tipo_requisito}`)
      .sort();
    const esperadas = filas.map(([, id, tipo]) => `${id}:${tipo}`).sort();
    if (
      actuales.length &&
      JSON.stringify(actuales) !== JSON.stringify(esperadas)
    )
      throw new Error(
        `La materia «${regla.materia}» ya tiene una regla diferente. No se sobrescribió: revisarla desde el panel.`,
      );
    return {
      materia: regla.materia,
      materia_id,
      accion: actuales.length ? "conservar" : "crear",
      filas,
    };
  });
  const grafo = new Map();
  const agregar = (desde, hasta) => {
    if (!grafo.has(desde)) grafo.set(desde, []);
    grafo.get(desde).push(hasta);
  };
  for (const r of existentes) agregar(r.materia_id, r.materia_requisito_id);
  for (const a of acciones.filter((a) => a.accion === "crear"))
    for (const [desde, hasta] of a.filas) agregar(desde, hasta);
  const vistos = new Set(),
    camino = new Set();
  function ciclo(id) {
    if (camino.has(id)) return true;
    if (vistos.has(id)) return false;
    camino.add(id);
    for (const vecino of grafo.get(id) || []) if (ciclo(vecino)) return true;
    camino.delete(id);
    vistos.add(id);
    return false;
  }
  for (const id of grafo.keys())
    if (ciclo(id))
      throw new Error(
        "La combinación de reglas genera una dependencia circular. No se aplicó la carga.",
      );
  return acciones;
}
async function cargarCorrelatividades(conn, { aplicar = false } = {}) {
  if (aplicar) await conn.beginTransaction();
  try {
    const [materias] = await conn.query(
      `SELECT id, nombre FROM materias ORDER BY id${aplicar ? " FOR UPDATE" : ""}`,
    );
    const [existentes] = await conn.query(
      `SELECT * FROM correlatividades${aplicar ? " FOR UPDATE" : ""}`,
    );
    const acciones = planificar(materias, existentes);
    if (aplicar) {
      for (const accion of acciones)
        if (accion.accion === "crear")
          await conn.query(
            "INSERT INTO correlatividades (materia_id, materia_requisito_id, tipo_requisito) VALUES ?",
            [accion.filas],
          );
      await conn.query(
        "INSERT INTO configuracion_institucional (clave, valor_texto) VALUES ('carrera.correlatividades.nota', ?) ON DUPLICATE KEY UPDATE clave = VALUES(clave)",
        [nota],
      );
      await conn.commit();
    }
    return {
      acciones: acciones.map(({ filas, ...a }) => ({
        ...a,
        requisitos: filas.length,
      })),
      nota,
    };
  } catch (err) {
    if (aplicar) await conn.rollback();
    throw err;
  }
}
async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--apply", "--preview"].includes(arg)))
    throw new Error("Usá --preview o --apply.");
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "sistema_academico",
    port: process.env.DB_PORT || 3306,
  });
  try {
    console.log(
      JSON.stringify(
        await cargarCorrelatividades(conn, {
          aplicar: args.includes("--apply"),
        }),
        null,
        2,
      ),
    );
  } finally {
    await conn.end();
  }
}
if (require.main === module)
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
module.exports = { cargarCorrelatividades, planificar };
