const { promisePool } = require('../config/db');

const campos = 'id, nombre_completo, created_at, updated_at';
const idValido = (id) => /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) <= 2147483647;

function validarNombre(body) {
    const nombre = body?.nombre_completo;
    if (typeof nombre !== 'string' || !nombre.trim() || [...nombre.trim()].length > 255) {
        return 'El nombre completo es obligatorio y admite hasta 255 caracteres.';
    }
    return null;
}

// filtro ?rol=titular o ?rol=ayudante
async function obtenerProfesores(req, res) {
    const { id } = req.params;
    const { rol } = req.query;

    if (id && !idValido(id)) return res.status(400).json({ error: 'ID inválido.' });

    try {
        let sql = `
            SELECT 
                p.id, 
                p.nombre_completo,
                GROUP_CONCAT(DISTINCT m.nombre ORDER BY m.nombre ASC SEPARATOR ' · ') AS materias_texto,
                GROUP_CONCAT(DISTINCT CONCAT(m.id, ':', m.nombre, ':', COALESCE(pm.rol, 'titular')) SEPARATOR '||') AS materias_raw
            FROM profesores p
            LEFT JOIN profesor_materia pm ON p.id = pm.profesor_id
            LEFT JOIN materias m ON pm.materia_id = m.id
        `;
        const params = [];

        if (id) {
            sql += ' WHERE p.id = ?';
            params.push(id);
        } else if (rol) {
            sql += ' WHERE pm.rol = ?';
            params.push(rol);
        }

        sql += ' GROUP BY p.id, p.nombre_completo ORDER BY p.nombre_completo ASC';

        const [rows] = await promisePool.query(sql, params);

        if (id && !rows.length) {
            return res.status(404).json({ error: 'Profesor no encontrado.' });
        }

        // Formateamos las materias para el frontend
        const formatear = (row) => {
            const materias_detalle = row.materias_raw
                ? row.materias_raw.split('||').map((item) => {
                      const [materia_id, nombre, rolCatedra] = item.split(':');
                      return {
                          materia_id: Number(materia_id),
                          nombre,
                          rol: rolCatedra || 'titular'
                      };
                  })
                : [];

            return {
                id: row.id,
                nombre_completo: row.nombre_completo,
                materias_texto: row.materias_texto || '',
                materias_detalle
            };
        };

        res.json(id ? formatear(rows[0]) : rows.map(formatear));
    } catch (error) {
        console.error('Error detallado al consultar profesores:', error);
        res.status(500).json({ error: 'No se pudieron consultar los profesores.' });
    }
}

function validarAsignaciones(body) {
    if (body.rol !== undefined && !['titular', 'ayudante'].includes(body.rol)) return 'Seleccioná un rol de docente válido.';
    if (body.materias !== undefined && (!Array.isArray(body.materias) || !body.materias.every((n) => Number.isInteger(n) && n > 0 && n <= 2147483647) || new Set(body.materias).size !== body.materias.length)) return 'Seleccioná materias válidas, sin repetidos.';
    return null;
}
async function guardarProfesor(req, res, editar) {
    const { id } = req.params;
    if (editar && !idValido(id)) return res.status(400).json({ error: 'ID inválido.' });
    const errorValidacion = validarNombre(req.body) || validarAsignaciones(req.body);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });
    const { nombre_completo, materias, rol = 'titular' } = req.body;
    let conn;
    try {
        conn = await promisePool.getConnection();
        await conn.beginTransaction();
        if (materias?.length) {
            const [existentes] = await conn.query('SELECT id FROM materias WHERE id IN (?) FOR UPDATE', [materias]);
            if (existentes.length !== materias.length) {
                const error = new Error('Una de las materias seleccionadas no existe.');
                error.status = 400;
                throw error;
            }
        }
        const [result] = editar
            ? await conn.query('UPDATE profesores SET nombre_completo = ? WHERE id = ?', [nombre_completo.trim(), id])
            : await conn.query('INSERT INTO profesores (nombre_completo) VALUES (?)', [nombre_completo.trim()]);
        if (editar && !result.affectedRows) {
            const error = new Error('Profesor no encontrado.'); error.status = 404; throw error;
        }
        const profesorId = editar ? Number(id) : result.insertId;
        if (materias !== undefined) {
            if (editar) await conn.query('DELETE FROM profesor_materia WHERE profesor_id = ?', [profesorId]);
            if (materias.length) await conn.query('INSERT INTO profesor_materia (profesor_id, materia_id, rol) VALUES ?', [materias.map((n) => [profesorId, n, rol])]);
        }
        await conn.commit();
        res.status(editar ? 200 : 201).json({ mensaje: editar ? 'Profesor actualizado con éxito.' : 'Profesor creado con éxito.', profesorId });
    } catch (error) {
        if (conn) await conn.rollback();
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (['ER_NO_REFERENCED_ROW_2', 'ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) return res.status(409).json({ error: 'Las materias relacionadas cambiaron. Recargá e intentá nuevamente.' });
        console.error('Error al guardar profesor:', error);
        res.status(500).json({ error: 'No se pudo guardar el profesor. No se aplicaron cambios parciales.' });
    } finally { if (conn) conn.release(); }
}
const crearProfesor = (req, res) => guardarProfesor(req, res, false);
const actualizarProfesor = (req, res) => guardarProfesor(req, res, true);

async function eliminarProfesor(req, res) {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ error: 'ID inválido.' });
    try {
        const [result] = await promisePool.query('DELETE FROM profesores WHERE id = ?', [id]);

        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Profesor no encontrado.' });
        }

        res.json({ mensaje: 'Profesor eliminado.' });
    } catch (error) {
        console.error('Error al eliminar profesor:', error);
        res.status(500).json({ error: 'No se pudo eliminar el profesor.' });
    }
}

module.exports = { obtenerProfesores, crearProfesor, actualizarProfesor, eliminarProfesor };