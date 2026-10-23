const { promisePool } = require('../config/db');

async function obtenerMaterias(req, res) {
    try {
        const [rows] = await promisePool.query(
            'SELECT id, nombre, anio_carrera, cuatrimestre FROM materias ORDER BY anio_carrera ASC, cuatrimestre ASC, nombre ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error al consultar materias:', error);
        res.status(500).json({ error: 'No se pudieron consultar las materias.' });
    }
}

module.exports = { obtenerMaterias };