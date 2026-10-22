const { promisePool } = require('../config/db');
const campos = 'id, nombre_tramite, descripcion_requisitos, created_at, updated_at';
const idValido = (id) => /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) <= 2147483647;

function validar(body) {
    if (typeof body?.nombre_tramite !== 'string' || !body.nombre_tramite.trim() || [...body.nombre_tramite.trim()].length > 255) {
        return 'El nombre del trámite es obligatorio y admite hasta 255 caracteres.';
    }
    const descripcion = body.descripcion_requisitos;
    if (descripcion != null && typeof descripcion !== 'string') return 'La descripción de requisitos debe ser texto.';
    if (typeof descripcion === 'string' && Buffer.byteLength(descripcion, 'utf8') > 65535) return 'La descripción de requisitos supera el tamaño permitido (65535 bytes).';
    return null;
}

async function obtenerTramites(req, res) {
    const { id } = req.params;
    if (id && !idValido(id)) return res.status(400).json({ error: 'ID inválido.' });
    try {
        const [rows] = await promisePool.query(`SELECT ${campos} FROM tramites_requisitos${id ? ' WHERE id = ?' : ' ORDER BY nombre_tramite, id'}`, id ? [id] : []);
        if (id && !rows.length) return res.status(404).json({ error: 'Trámite no encontrado.' });
        res.json(id ? rows[0] : rows);
    } catch (error) {
        console.error('Error al consultar trámites:', error);
        res.status(500).json({ error: 'No se pudieron consultar los trámites.' });
    }
}

async function guardarTramite(req, res) {
    const { id } = req.params;
    if (id && !idValido(id)) return res.status(400).json({ error: 'ID inválido.' });
    const errorValidacion = validar(req.body);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });
    const valores = [req.body.nombre_tramite.trim(), req.body.descripcion_requisitos?.trim() || null];
    try {
        const [result] = id
            ? await promisePool.query('UPDATE tramites_requisitos SET nombre_tramite = ?, descripcion_requisitos = ? WHERE id = ?', [...valores, id])
            : await promisePool.query('INSERT INTO tramites_requisitos (nombre_tramite, descripcion_requisitos) VALUES (?, ?)', valores);
        if (id && !result.affectedRows) return res.status(404).json({ error: 'Trámite no encontrado.' });
        res.status(id ? 200 : 201).json({ mensaje: id ? 'Trámite actualizado.' : 'Trámite creado.', tramiteId: id ? Number(id) : result.insertId });
    } catch (error) {
        console.error('Error al guardar trámite:', error);
        res.status(500).json({ error: 'No se pudo guardar el trámite.' });
    }
}

async function eliminarTramite(req, res) {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
    try {
        const [result] = await promisePool.query('DELETE FROM tramites_requisitos WHERE id = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Trámite no encontrado.' });
        res.json({ mensaje: 'Trámite eliminado.' });
    } catch (error) {
        console.error('Error al eliminar trámite:', error);
        res.status(500).json({ error: 'No se pudo eliminar el trámite.' });
    }
}
module.exports = { obtenerTramites, guardarTramite, eliminarTramite };
