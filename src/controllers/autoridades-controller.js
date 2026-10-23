// src/controllers/autoridades-controller.js
const { promisePool } = require('../config/db');

const idValido = (id) => /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));

function validarAutoridad(body = {}) {
    const { cargo, nombre_responsable } = body;
    if (typeof cargo !== 'string' || !cargo.trim() || cargo.trim().length > 255) {
        return 'El cargo es obligatorio y admite hasta 255 caracteres.';
    }
    if (typeof nombre_responsable !== 'string' || !nombre_responsable.trim() || nombre_responsable.trim().length > 255) {
        return 'El nombre del responsable es obligatorio y admite hasta 255 caracteres.';
    }
    return null;
}

// 1. Obtener todas las autoridades
async function obtenerAutoridades(req, res) {
    try {
        const [rows] = await promisePool.query(
            'SELECT id, cargo, nombre_responsable, created_at, updated_at FROM autoridades ORDER BY id ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error al consultar autoridades:', error);
        res.status(500).json({ error: 'No se pudieron consultar las autoridades.' });
    }
}

// 2. Crear Autoridad
async function crearAutoridad(req, res) {
    const error = validarAutoridad(req.body);
    if (error) return res.status(400).json({ error });

    const { cargo, nombre_responsable } = req.body;
    try {
        const [result] = await promisePool.query(
            'INSERT INTO autoridades (cargo, nombre_responsable) VALUES (?, ?)',
            [cargo.trim(), nombre_responsable.trim()]
        );
        res.status(201).json({ mensaje: 'Autoridad creada con éxito.', autoridadId: result.insertId });
    } catch (error) {
        console.error('Error al registrar autoridad:', error);
        res.status(500).json({ error: 'No se pudo crear la autoridad.' });
    }
}

// 3. Actualizar Autoridad (editar cargo o nombre del responsable)
async function actualizarAutoridad(req, res) {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ error: 'ID inválido.' });

    const error = validarAutoridad(req.body);
    if (error) return res.status(400).json({ error });

    const { cargo, nombre_responsable } = req.body;
    try {
        const [result] = await promisePool.query(
            'UPDATE autoridades SET cargo = ?, nombre_responsable = ? WHERE id = ?',
            [cargo.trim(), nombre_responsable.trim(), id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Autoridad no encontrada.' });
        }

        res.json({ mensaje: 'Autoridad actualizada con éxito.' });
    } catch (error) {
        console.error('Error al actualizar autoridad:', error);
        res.status(500).json({ error: 'No se pudo actualizar la autoridad.' });
    }
}

// 4. Eliminar Autoridad
async function eliminarAutoridad(req, res) {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ error: 'ID inválido.' });

    try {
        const [result] = await promisePool.query('DELETE FROM autoridades WHERE id = ?', [id]);
        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Autoridad no encontrada.' });
        }
        res.json({ mensaje: 'Autoridad eliminada con éxito.' });
    } catch (error) {
        console.error('Error al eliminar autoridad:', error);
        res.status(500).json({ error: 'No se pudo eliminar la autoridad.' });
    }
}

module.exports = {
    obtenerAutoridades,
    crearAutoridad,
    actualizarAutoridad,
    eliminarAutoridad
};