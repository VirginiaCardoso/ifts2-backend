const { promisePool: db } = require("../config/db");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const tiposPdf = ["resolucion", "promocionables", "correlatividades"];
const carpeta = path.resolve(__dirname, "../../uploads/carrera");
const idValido = (id) => Number.isInteger(id) && id > 0 && id <= 2147483647;
const error = (status, message, extra = {}) =>
  Object.assign(new Error(message), { status, extra });
function idRuta(valor) {
  if (!/^[1-9]\d*$/.test(valor || "") || !idValido(Number(valor)))
    throw error(400, "ID de materia inválido.");
  return Number(valor);
}
function responder(res, err) {
  if (err.status)
    return res.status(err.status).json({ error: err.message, ...err.extra });
  if (
    [
      "ER_NO_REFERENCED_ROW_2",
      "ER_ROW_IS_REFERENCED_2",
      "ER_LOCK_DEADLOCK",
      "ER_LOCK_WAIT_TIMEOUT",
    ].includes(err.code)
  )
    return res.status(409).json({
      error: "Los datos relacionados cambiaron. Recargá e intentá nuevamente.",
    });
  console.error("Error en Carrera:", err);
  return res
    .status(500)
    .json({ error: "No se pudo completar la operación de Carrera." });
}
function manejar(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      responder(res, err);
    }
  };
}
async function transaccion(fn) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
async function bloquearMaterias(conn) {
  await conn.query("SELECT id FROM materias ORDER BY id FOR UPDATE");
}
async function exigirMateria(conn, id) {
  const [rows] = await conn.query("SELECT id FROM materias WHERE id = ?", [id]);
  if (!rows.length) throw error(404, "Materia no encontrada.");
}
function validarProfesores(ids) {
  if (
    !Array.isArray(ids) ||
    !ids.every(idValido) ||
    new Set(ids).size !== ids.length
  )
    throw error(400, "Seleccioná profesores válidos, sin repetidos.");
}
async function asignar(conn, materiaId, ids) {
  validarProfesores(ids);
  if (ids.length) {
    const [rows] = await conn.query(
      "SELECT id FROM profesores WHERE id IN (?)",
      [ids],
    );
    if (rows.length !== ids.length)
      throw error(400, "Uno o más profesores no existen.");
    await conn.query(
      "DELETE FROM profesor_materia WHERE materia_id = ? AND profesor_id NOT IN (?)",
      [materiaId, ids],
    );
    // Conserva el rol de las asignaciones existentes. Las nuevas usan el valor por defecto titular.
    for (const profesorId of ids)
      await conn.query(
        "INSERT INTO profesor_materia (profesor_id, materia_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE profesor_id = VALUES(profesor_id)",
        [profesorId, materiaId],
      );
  } else
    await conn.query("DELETE FROM profesor_materia WHERE materia_id = ?", [
      materiaId,
    ]);
}
async function leerMaterias(conn = db) {
  const [rows] = await conn.query(
    "SELECT id, nombre, anio_carrera, cuatrimestre, es_anual, es_promocional, created_at, updated_at FROM materias ORDER BY anio_carrera, cuatrimestre, nombre, id",
  );
  const [asignaciones] = await conn.query(
    "SELECT pm.materia_id, p.id, p.nombre_completo, pm.rol FROM profesor_materia pm JOIN profesores p ON p.id = pm.profesor_id ORDER BY p.nombre_completo, p.id",
  );
  const porMateria = new Map();
  for (const { materia_id, ...profesor } of asignaciones) {
    if (!porMateria.has(materia_id)) porMateria.set(materia_id, []);
    porMateria.get(materia_id).push(profesor);
  }
  return rows.map((row) => ({
    ...row,
    es_promocional: Boolean(row.es_promocional),
    es_anual: Boolean(row.es_anual),
    profesores: porMateria.get(row.id) || [],
    profesores_ids: (porMateria.get(row.id) || []).map((p) => p.id),
  }));
}
async function leerReglas(conn = db) {
  const [rows] = await conn.query(
    "SELECT c.*, m.nombre AS materia_nombre, r.nombre AS requisito_nombre FROM correlatividades c JOIN materias m ON m.id = c.materia_id JOIN materias r ON r.id = c.materia_requisito_id ORDER BY m.nombre, r.nombre, c.id",
  );
  const grupos = new Map();
  for (const row of rows) {
    if (!grupos.has(row.materia_id))
      grupos.set(row.materia_id, {
        materia_id: row.materia_id,
        materia_nombre: row.materia_nombre,
        cursadas: [],
        aprobadas: [],
      });
    grupos
      .get(row.materia_id)
      [row.tipo_requisito === "CURSADA" ? "cursadas" : "aprobadas"].push({
        id: row.materia_requisito_id,
        nombre: row.requisito_nombre,
      });
  }
  return [...grupos.values()];
}
async function leerConfiguracion(conn = db) {
  const [rows] = await conn.query(
    "SELECT clave, valor_texto FROM configuracion_institucional WHERE clave IN ('carrera.aviso','carrera.pdf.resolucion','carrera.pdf.promocionables','carrera.pdf.correlatividades','carrera.correlatividades.nota')",
  );
  const datos = Object.fromEntries(rows.map((r) => [r.clave, r.valor_texto]));
  const documentos = {};
  for (const tipo of tiposPdf) {
    const metadata = datos[`carrera.pdf.${tipo}`]
      ? JSON.parse(datos[`carrera.pdf.${tipo}`])
      : null;
    documentos[tipo] = metadata
      ? {
          nombre: metadata.nombre,
          url: `/api/carrera/documentos/${tipo}/archivo`,
        }
      : null;
  }
  return {
    aviso: datos["carrera.aviso"] || "",
    documentos,
    nota_correlatividades: datos["carrera.correlatividades.nota"] || "",
  };
}
const obtenerCarrera = manejar(async (req, res) => {
  // Una misma instantánea para plan, reglas y configuración.
  const datos = await transaccion(async (conn) => ({
    materias: await leerMaterias(conn),
    correlatividades: await leerReglas(conn),
    ...(await leerConfiguracion(conn)),
  }));
  res.json(datos);
});
const obtenerMaterias = manejar(async (req, res) => {
  const rows = await leerMaterias();
  if (!req.params.id) return res.json(rows);
  const id = idRuta(req.params.id);
  const materia = rows.find((m) => m.id === id);
  if (!materia) throw error(404, "Materia no encontrada.");
  res.json(materia);
});
const guardarMateria = manejar(async (req, res) => {
  const id = req.params.id ? idRuta(req.params.id) : null;
  const body = req.body || {};
  if (
    typeof body.nombre !== "string" ||
    !body.nombre.trim() ||
    [...body.nombre.trim()].length > 255
  )
    throw error(400, "El nombre es obligatorio y admite hasta 255 caracteres.");
  if (
    !["1", "2", "3"].includes(String(body.anio_carrera)) ||
    (body.es_anual === true
      ? body.cuatrimestre !== null
      : ![1, 2].includes(body.cuatrimestre)) ||
    (body.es_anual !== undefined && typeof body.es_anual !== "boolean") ||
    typeof body.es_promocional !== "boolean"
  )
    throw error(
      400,
      "Indicá año (1 a 3), cuatrimestre (1 o 2, o null si es anual) y estados válidos.",
    );
  if (body.profesores_ids !== undefined) validarProfesores(body.profesores_ids);
  const materiaId = await transaccion(async (conn) => {
    await bloquearMaterias(conn);
    if (id) await exigirMateria(conn, id);
    const valores = [
      body.nombre.trim(),
      String(body.anio_carrera),
      body.cuatrimestre,
      body.es_promocional,
      body.es_anual ?? false,
    ];
    const [result] = id
      ? await conn.query(
          "UPDATE materias SET nombre = ?, anio_carrera = ?, cuatrimestre = ?, es_promocional = ?, es_anual = ? WHERE id = ?",
          [...valores, id],
        )
      : await conn.query(
          "INSERT INTO materias (nombre, anio_carrera, cuatrimestre, es_promocional, es_anual) VALUES (?, ?, ?, ?, ?)",
          valores,
        );
    const target = id || result.insertId;
    if (body.profesores_ids !== undefined)
      await asignar(conn, target, body.profesores_ids);
    return target;
  });
  res.status(id ? 200 : 201).json({
    mensaje: id ? "Materia actualizada." : "Materia creada.",
    materiaId,
  });
});
const guardarProfesores = manejar(async (req, res) => {
  const id = idRuta(req.params.id);
  validarProfesores(req.body?.profesores_ids);
  await transaccion(async (conn) => {
    await bloquearMaterias(conn);
    await exigirMateria(conn, id);
    await asignar(conn, id, req.body.profesores_ids);
  });
  res.json({ mensaje: "Profesores asignados." });
});
const guardarPromocional = manejar(async (req, res) => {
  const id = idRuta(req.params.id);
  if (typeof req.body?.es_promocional !== "boolean")
    throw error(400, "El estado promocional debe ser verdadero o falso.");
  await transaccion(async (conn) => {
    await bloquearMaterias(conn);
    await exigirMateria(conn, id);
    await conn.query("UPDATE materias SET es_promocional = ? WHERE id = ?", [
      req.body.es_promocional,
      id,
    ]);
  });
  res.json({ mensaje: "Estado promocional actualizado." });
});
const eliminarMateria = manejar(async (req, res) => {
  const id = idRuta(req.params.id);
  await transaccion(async (conn) => {
    await bloquearMaterias(conn);
    await exigirMateria(conn, id);
    const [rows] = await conn.query(
      `SELECT
          (SELECT COUNT(*) FROM profesor_materia WHERE materia_id = ?) AS docentes,
          (SELECT COUNT(*) FROM horarios_cursada WHERE materia_id = ?) AS horarios,
          (SELECT COUNT(*) FROM mesas_examenes WHERE materia_id = ?) AS mesas,
          (SELECT COUNT(*) FROM correlatividades WHERE materia_id = ? OR materia_requisito_id = ?) AS correlatividades`,
      [id, id, id, id, id],
    );
    const asociaciones = rows[0];
    const pendientes = Object.entries(asociaciones).filter(
      ([, cantidad]) => Number(cantidad) > 0,
    );
    if (pendientes.length)
      throw error(
        409,
        `No se puede eliminar: tiene ${pendientes.map(([tipo, cantidad]) => `${cantidad} ${tipo}`).join(", ")}. Desvinculá esos registros primero.`,
        { asociaciones },
      );
    await conn.query("DELETE FROM materias WHERE id = ?", [id]);
  });
  res.json({ mensaje: "Materia eliminada." });
});
const guardarRegla = manejar(async (req, res) => {
  const anterior = req.params.id ? idRuta(req.params.id) : null;
  const { materia_id, cursadas, aprobadas } = req.body || {};
  if (
    !idValido(materia_id) ||
    !Array.isArray(cursadas) ||
    !Array.isArray(aprobadas)
  )
    throw error(
      400,
      "Seleccioná la materia y sus requisitos de cursada y aprobación.",
    );
  if (anterior && materia_id !== anterior)
    throw error(
      400,
      "No se puede cambiar la materia de una regla. Editá únicamente sus requisitos.",
    );
  const ids = [...cursadas, ...aprobadas];
  if (
    !ids.length ||
    !ids.every(idValido) ||
    new Set(ids).size !== ids.length ||
    ids.includes(materia_id)
  )
    throw error(
      400,
      "La regla debe incluir requisitos válidos, sin repetidos ni la propia materia.",
    );
  await transaccion(async (conn) => {
    await bloquearMaterias(conn);
    const [materias] = await conn.query("SELECT id FROM materias");
    const existentes = new Set(materias.map((m) => m.id));
    if (![materia_id, ...ids].every((id) => existentes.has(id)))
      throw error(400, "Una de las materias seleccionadas no existe.");
    const [reglas] = await conn.query(
      "SELECT materia_id, materia_requisito_id FROM correlatividades FOR UPDATE",
    );
    if (anterior && !reglas.some((r) => r.materia_id === anterior))
      throw error(404, "Regla no encontrada.");
    if (
      reglas.some(
        (r) => r.materia_id === materia_id && r.materia_id !== anterior,
      )
    )
      throw error(409, "Esa materia ya tiene una regla. Editá la existente.");
    const grafo = new Map();
    for (const r of reglas.filter((r) => r.materia_id !== anterior)) {
      if (!grafo.has(r.materia_id)) grafo.set(r.materia_id, []);
      grafo.get(r.materia_id).push(r.materia_requisito_id);
    }
    grafo.set(materia_id, ids);
    const visitados = new Set();
    const camino = new Set();
    const ciclo = (id) => {
      if (camino.has(id)) return true;
      if (visitados.has(id)) return false;
      camino.add(id);
      for (const requisito of grafo.get(id) || [])
        if (ciclo(requisito)) return true;
      camino.delete(id);
      visitados.add(id);
      return false;
    };
    for (const id of grafo.keys())
      if (ciclo(id))
        throw error(
          400,
          "La regla genera una dependencia circular entre materias.",
        );
    if (anterior)
      await conn.query("DELETE FROM correlatividades WHERE materia_id = ?", [
        anterior,
      ]);
    await conn.query(
      "INSERT INTO correlatividades (materia_id, materia_requisito_id, tipo_requisito) VALUES ?",
      [
        [
          ...cursadas.map((id) => [materia_id, id, "CURSADA"]),
          ...aprobadas.map((id) => [materia_id, id, "APROBADA"]),
        ],
      ],
    );
  });
  res.status(anterior ? 200 : 201).json({
    mensaje: anterior ? "Regla actualizada." : "Regla creada.",
    materiaId: materia_id,
  });
});
const eliminarRegla = manejar(async (req, res) => {
  const id = idRuta(req.params.id);
  await transaccion(async (conn) => {
    await bloquearMaterias(conn);
    const [result] = await conn.query(
      "DELETE FROM correlatividades WHERE materia_id = ?",
      [id],
    );
    if (!result.affectedRows) throw error(404, "Regla no encontrada.");
  });
  res.json({ mensaje: "Regla eliminada." });
});
const guardarAviso = manejar(async (req, res) => {
  const aviso = req.body?.aviso;
  if (
    typeof aviso !== "string" ||
    !aviso.trim() ||
    [...aviso.trim()].length > 255
  )
    throw error(400, "El aviso es obligatorio y admite hasta 255 caracteres.");
  await db.query(
    "INSERT INTO configuracion_institucional (clave, valor_texto) VALUES ('carrera.aviso', ?) ON DUPLICATE KEY UPDATE valor_texto = VALUES(valor_texto)",
    [aviso.trim()],
  );
  res.json({ mensaje: "Aviso actualizado." });
});
function clavePdf(tipo) {
  if (!tiposPdf.includes(tipo)) throw error(400, "Tipo de documento inválido.");
  return `carrera.pdf.${tipo}`;
}
function archivoSeguro(archivo) {
  if (!/^[a-f0-9-]{36}\.pdf$/.test(archivo || ""))
    throw error(500, "Referencia de archivo inválida.");
  return path.join(carpeta, archivo);
}
async function quitarArchivo(archivo) {
  if (archivo)
    await fs.unlink(archivoSeguro(archivo)).catch((err) => {
      if (err.code !== "ENOENT")
        console.error("No se pudo limpiar PDF:", err.message);
    });
}
const guardarPdf = manejar(async (req, res) => {
  const clave = clavePdf(req.params.tipo);
  let nombre;
  try {
    nombre = decodeURIComponent(req.get("X-File-Name") || "documento.pdf");
  } catch {
    throw error(400, "Nombre de archivo inválido.");
  }
  if (
    !/\.pdf$/i.test(nombre) ||
    /[/\\\x00-\x1f\x7f]/.test(nombre) ||
    nombre.length > 180
  )
    throw error(400, "Usá un nombre de archivo PDF de hasta 180 caracteres.");
  if (
    !Buffer.isBuffer(req.body) ||
    req.body.length < 8 ||
    req.body.subarray(0, 5).toString() !== "%PDF-"
  )
    throw error(400, "Seleccioná un archivo PDF válido.");
  await fs.mkdir(carpeta, { recursive: true });
  const archivo = `${randomUUID()}.pdf`;
  await fs.writeFile(archivoSeguro(archivo), req.body, { flag: "wx" });
  let anterior;
  try {
    anterior = await transaccion(async (conn) => {
      const [rows] = await conn.query(
        "SELECT valor_texto FROM configuracion_institucional WHERE clave = ? FOR UPDATE",
        [clave],
      );
      const viejo = rows[0]?.valor_texto
        ? JSON.parse(rows[0].valor_texto)
        : null;
      await conn.query(
        "INSERT INTO configuracion_institucional (clave, valor_texto, valor_url_archivo) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE valor_texto = VALUES(valor_texto), valor_url_archivo = VALUES(valor_url_archivo)",
        [
          clave,
          JSON.stringify({ nombre, archivo }),
          `/api/carrera/documentos/${req.params.tipo}/archivo`,
        ],
      );
      return viejo;
    });
  } catch (err) {
    await quitarArchivo(archivo);
    throw err;
  }
  await quitarArchivo(anterior?.archivo);
  res.json({
    mensaje: "PDF guardado.",
    nombre,
    url: `/api/carrera/documentos/${req.params.tipo}/archivo`,
  });
});
const eliminarPdf = manejar(async (req, res) => {
  const clave = clavePdf(req.params.tipo);
  const anterior = await transaccion(async (conn) => {
    const [rows] = await conn.query(
      "SELECT valor_texto FROM configuracion_institucional WHERE clave = ? FOR UPDATE",
      [clave],
    );
    if (!rows.length) throw error(404, "No hay un PDF cargado.");
    const metadata = JSON.parse(rows[0].valor_texto);
    await conn.query(
      "DELETE FROM configuracion_institucional WHERE clave = ?",
      [clave],
    );
    return metadata;
  });
  await quitarArchivo(anterior.archivo);
  res.json({ mensaje: "PDF eliminado." });
});
const obtenerPdf = manejar(async (req, res) => {
  const clave = clavePdf(req.params.tipo);
  const [rows] = await db.query(
    "SELECT valor_texto FROM configuracion_institucional WHERE clave = ?",
    [clave],
  );
  if (!rows.length) throw error(404, "No hay un PDF cargado.");
  const metadata = JSON.parse(rows[0].valor_texto);
  const ubicacion = archivoSeguro(metadata.archivo);
  try {
    await fs.access(ubicacion);
  } catch {
    throw error(404, "El archivo PDF no está disponible.");
  }
  res.set("Content-Type", "application/pdf");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Cache-Control", "no-store");
  const disposicion = req.query.descargar === "1" ? "attachment" : "inline";
  const nombreCodificado = encodeURIComponent(metadata.nombre).replace(
    /[!'()*]/g,
    (caracter) => `%${caracter.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  res.set(
    "Content-Disposition",
    `${disposicion}; filename="documento.pdf"; filename*=UTF-8''${nombreCodificado}`,
  );
  res.sendFile(ubicacion, (err) => {
    if (err && !res.headersSent)
      res.status(404).json({ error: "El PDF no está disponible." });
  });
});
module.exports = {
  obtenerCarrera,
  obtenerMaterias,
  guardarMateria,
  guardarProfesores,
  guardarPromocional,
  eliminarMateria,
  guardarRegla,
  eliminarRegla,
  guardarAviso,
  guardarPdf,
  eliminarPdf,
  obtenerPdf,
};
