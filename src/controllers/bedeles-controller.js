const { promisePool } = require('../config/db');

const idValido = (id) => /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));

function validarBedel(body = {}) {
    const { nombre, anio_asignado } = body;
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 150) {
        return 'El nombre es obligatorio y admite hasta 150 caracteres.';
    }
    if (!['Primer Año', 'Segundo Año', 'Tercer Año'].includes(anio_asignado)) {
        return 'El año asignado debe ser "Primer Año", "Segundo Año" o "Tercer Año".';
    }
    return null;
}

async function obtenerBedeles(req, res) {
    try {
        const [rows] = await promisePool.query(
            'SELECT id, nombre, anio_asignado, created_at, updated_at FROM bedeles ORDER BY id ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error al consultar bedeles:', error);
        res.status(500).json({ error: 'No se pudieron consultar los bedeles.' });
    }
}

async function crearBedel(req, res) {
    const error = validarBedel(req.body);
    if (error) return res.status(400).json({ error });

    const { nombre, anio_asignado } = req.body;
    try {
        const [result] = await promisePool.query(
            'INSERT INTO bedeles (nombre, anio_asignado) VALUES (?, ?)',
            [nombre.trim(), anio_asignado]
        );
        res.status(201).json({ mensaje: 'Bedel registrado con éxito.', bedelId: result.insertId });
    } catch (error) {
        console.error('Error al registrar bedel:', error);
        res.status(500).json({ error: 'No se pudo registrar el bedel.' });
    }
}

async function actualizarBedel(req, res) {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ error: 'ID inválido.' });

    const error = validarBedel(req.body);
    if (error) return res.status(400).json({ error });

    const { nombre, anio_asignado } = req.body;
    try {
        const [result] = await promisePool.query(
            'UPDATE bedeles SET nombre = ?, anio_asignado = ? WHERE id = ?',
            [nombre.trim(), anio_asignado, id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Bedel no encontrado.' });
        }

        res.json({ mensaje: 'Bedel actualizado con éxito.' });
    } catch (error) {
        console.error('Error al actualizar bedel:', error);
        res.status(500).json({ error: 'No se pudo actualizar el bedel.' });
    }
}

async function eliminarBedel(req, res) {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ error: 'ID inválido.' });

    try {
        const [result] = await promisePool.query('DELETE FROM bedeles WHERE id = ?', [id]);
        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Bedel no encontrado.' });
        }
        res.json({ mensaje: 'Bedel eliminado con éxito.' });
    } catch (error) {
        console.error('Error al eliminar bedel:', error);
        res.status(500).json({ error: 'No se pudo eliminar el bedel.' });
    }
}

module.exports = { obtenerBedeles, crearBedel, actualizarBedel, eliminarBedel };