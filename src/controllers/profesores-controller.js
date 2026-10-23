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
        res.status(500).json({ error: 'No se pudieron consultar los profesores.', detalle: error.message });
    }
}

async function crearProfesor(req, res) {
    const errorValidacion = validarNombre(req.body);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });

    // Desestructuramos del body:
    const { nombre_completo, materias = [], rol = 'titular' } = req.body;

    try {
        const [result] = await promisePool.query(
            'INSERT INTO profesores (nombre_completo) VALUES (?)',
            [nombre_completo.trim()]
        );
        const profesorId = result.insertId;

        // Si se seleccionaron materias las vinculamos en profesores_materia (plural)
        if (Array.isArray(materias) && materias.length > 0) {
            const values = materias.map((materiaId) => [profesorId, Number(materiaId), rol]);
            await promisePool.query(
                'INSERT INTO profesor_materia (profesor_id, materia_id, rol) VALUES ?',
                [values]
            );
        }

        res.status(201).json({ mensaje: 'Profesor creado con éxito.', profesorId });
    } catch (error) {
        console.error('Error al crear profesor:', error);
        res.status(500).json({ error: 'No se pudo crear el profesor.' });
    }
}

async function actualizarProfesor(req, res) {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ error: 'ID inválido.' });

    const errorValidacion = validarNombre(req.body);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });

    const { nombre_completo, materias, rol = 'titular' } = req.body;

    try {
        const [result] = await promisePool.query(
            'UPDATE profesores SET nombre_completo = ? WHERE id = ?',
            [nombre_completo.trim(), id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Profesor no encontrado.' });
        }

        // Si se envía el arreglo de materias, se limpia y se reinserta en profesores_materia
        if (Array.isArray(materias)) {
            await promisePool.query('DELETE FROM profesor_materia WHERE profesor_id = ?', [id]);
            if (materias.length > 0) {
                const values = materias.map((materiaId) => [id, Number(materiaId), rol]);
                await promisePool.query(
                    'INSERT INTO profesor_materia (profesor_id, materia_id, rol) VALUES ?',
                    [values]
                );
            }
        }

        res.json({ mensaje: 'Profesor actualizado con éxito.', profesorId: Number(id) });
    } catch (error) {
        console.error('Error al actualizar profesor:', error);
        res.status(500).json({ error: 'No se pudo actualizar el profesor.' });
    }
}

async function eliminarProfesor(req, res) {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ error: 'ID inválido.' });
    try {
        await promisePool.query('DELETE FROM profesor_materia WHERE profesor_id = ?', [id]);
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