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

async function obtenerProfesores(req, res) {
    const { id } = req.params;
    if (id && !idValido(id)) return res.status(400).json({ error: 'ID inválido.' });
    try {
        const [profesores] = await promisePool.query(
            `SELECT ${campos} FROM profesores${id ? ' WHERE id = ?' : ' ORDER BY nombre_completo, id'}`,
            id ? [id] : []
        );
        if (id && !profesores.length) return res.status(404).json({ error: 'Profesor no encontrado.' });
        res.json(id ? profesores[0] : profesores);
    } catch (error) {
        console.error('Error al consultar profesores:', error);
        res.status(500).json({ error: 'No se pudieron consultar los profesores.' });
    }
}

async function crearProfesor(req, res) {
    const errorValidacion = validarNombre(req.body);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });
    try {
        const [result] = await promisePool.query(
            'INSERT INTO profesores (nombre_completo) VALUES (?)',
            [req.body.nombre_completo.trim()]
        );
        res.status(201).json({ mensaje: 'Profesor creado.', profesorId: result.insertId });
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
    try {
        const [result] = await promisePool.query(
            'UPDATE profesores SET nombre_completo = ? WHERE id = ?',
            [req.body.nombre_completo.trim(), id]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Profesor no encontrado.' });
        res.json({ mensaje: 'Profesor actualizado.', profesorId: Number(id) });
    } catch (error) {
        console.error('Error al actualizar profesor:', error);
        res.status(500).json({ error: 'No se pudo actualizar el profesor.' });
    }
}

async function eliminarProfesor(req, res) {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ error: 'ID inválido.' });
    try {
        // Las claves foráneas eliminan las asociaciones y dejan los horarios con profesor_id NULL.
        const [result] = await promisePool.query('DELETE FROM profesores WHERE id = ?', [id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Profesor no encontrado.' });
        res.json({ mensaje: 'Profesor eliminado.' });
    } catch (error) {
        console.error('Error al eliminar profesor:', error);
        res.status(500).json({ error: 'No se pudo eliminar el profesor.' });
    }
}

module.exports = { obtenerProfesores, crearProfesor, actualizarProfesor, eliminarProfesor };
