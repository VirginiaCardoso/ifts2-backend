const { promisePool } = require('../config/db');

async function obtenerEnlaces(req, res) {
    try {
        const [rows] = await promisePool.query('SELECT id, nombre_sistema, url_destino FROM enlaces_externos ORDER BY id');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener enlaces:', error);
        res.status(500).json({ error: 'No se pudieron obtener los enlaces.' });
    }
}

async function actualizarEnlace(req, res) {
    const { id } = req.params;
    const { url_destino } = req.body;

    if (!url_destino || typeof url_destino !== 'string' || !url_destino.trim()) {
        return res.status(400).json({ error: 'La URL de destino es obligatoria.' });
    }

    try {
        const [result] = await promisePool.query(
            'UPDATE enlaces_externos SET url_destino = ? WHERE id = ?',
            [url_destino.trim(), id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Enlace no encontrado.' });
        }

        res.json({ mensaje: 'Enlace actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar enlace:', error);
        res.status(500).json({ error: 'No se pudo actualizar el enlace.' });
    }
}

module.exports = { obtenerEnlaces, actualizarEnlace };