const path = require("node:path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true,
});
const mysql = require("mysql2/promise");
const { materias } = require("./carrera-data");
const normalizar = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
function planificar(existentes) {
  const porNombre = new Map();
  for (const row of existentes) {
    const clave = normalizar(row.nombre);
    if (!porNombre.has(clave)) porNombre.set(clave, []);
    porNombre.get(clave).push(row);
  }
  return materias.map((materia) => {
    const coincidencias = porNombre.get(normalizar(materia.nombre)) || [];
    if (coincidencias.length > 1)
      throw new Error(
        `Hay más de una materia que coincide con «${materia.nombre}». Resolver la duplicación antes de cargar.`,
      );
    const actual = coincidencias[0];
    const cambia =
      actual &&
      (String(actual.anio_carrera) !== materia.anio_carrera ||
        actual.cuatrimestre !== materia.cuatrimestre ||
        Boolean(actual.es_promocional) !== materia.es_promocional ||
        Boolean(actual.es_anual) !== materia.es_anual);
    return {
      ...materia,
      id: actual?.id,
      accion: !actual ? "crear" : cambia ? "actualizar" : "conservar",
    };
  });
}
async function cargar(conn, { aplicar = false } = {}) {
  const [columnas] = await conn.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'materias' AND COLUMN_NAME = 'es_anual'",
  );
  const faltaColumna = !columnas.length;
  const [actuales] = await conn.query("SELECT * FROM materias");
  const previsualizacion = planificar(actuales);
  if (!aplicar)
    return { requiere_migracion: faltaColumna, acciones: previsualizacion };
  if (faltaColumna)
    await conn.query(
      "ALTER TABLE materias ADD COLUMN es_anual BOOLEAN NOT NULL DEFAULT FALSE AFTER cuatrimestre",
    );
  await conn.beginTransaction();
  try {
    const [bloqueadas] = await conn.query(
      "SELECT * FROM materias ORDER BY id FOR UPDATE",
    );
    const acciones = planificar(bloqueadas);
    for (const item of acciones) {
      const valores = [
        item.anio_carrera,
        item.cuatrimestre,
        item.es_promocional,
        item.es_anual,
      ];
      if (item.accion === "crear")
        await conn.query(
          "INSERT INTO materias (nombre, anio_carrera, cuatrimestre, es_promocional, es_anual) VALUES (?, ?, ?, ?, ?)",
          [item.nombre, ...valores],
        );
      else if (item.accion === "actualizar")
        await conn.query(
          "UPDATE materias SET anio_carrera = ?, cuatrimestre = ?, es_promocional = ?, es_anual = ? WHERE id = ?",
          [...valores, item.id],
        );
    }
    await conn.commit();
    return { migracion_aplicada: faltaColumna, acciones };
  } catch (err) {
    await conn.rollback();
    throw err;
  }
}
async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--apply", "--preview"].includes(arg)))
    throw new Error("Usá --preview (sin cambios) o --apply (aplicar).");
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "sistema_academico",
    port: process.env.DB_PORT || 3306,
  });
  try {
    const aplicar = args.includes("--apply");
    const resultado = await cargar(conn, { aplicar });
    console.log(
      aplicar ? "Carga aplicada." : "Vista previa: no se modificó la base.",
    );
    console.log(JSON.stringify(resultado, null, 2));
  } finally {
    await conn.end();
  }
}
if (require.main === module)
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
module.exports = { cargar, planificar };
