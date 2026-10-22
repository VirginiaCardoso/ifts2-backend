const { promisePool } = require('../config/db');

function validar(body = {}) {
    const { titulo, descripcion_breve, etiqueta, imagen_portada_url, fecha_publicacion, estado } = body;

    if (typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 255) return 'El título es obligatorio y admite hasta 255 caracteres.';

    if (!['Novedades', 'Eventos', 'Académico'].includes(etiqueta)) return 'Seleccioná una etiqueta válida.';

    if (descripcion_breve != null && typeof descripcion_breve !== 'string') return 'La descripción debe ser texto.';

    if (imagen_portada_url) {
        try {
            const url = new URL(imagen_portada_url);
            if (!['http:', 'https:'].includes(url.protocol) || imagen_portada_url.length > 255) throw new Error();
        } catch { return 'La imagen debe tener una URL HTTP o HTTPS de hasta 255 caracteres.'; }
    } else if (imagen_portada_url != null && typeof imagen_portada_url !== 'string') return 'La URL de imagen debe ser texto.';

    if (fecha_publicacion) {
        if (typeof fecha_publicacion !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_publicacion)) return 'La fecha debe tener formato AAAA-MM-DD.';
        const fecha = new Date(`${fecha_publicacion}T00:00:00Z`);
        if (!Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== fecha_publicacion || Number(fecha_publicacion.slice(0, 4)) < 1000) return 'La fecha no es válida.';
    } else if (fecha_publicacion != null && typeof fecha_publicacion !== 'string') return 'La fecha no es válida.';

    // Estado por defecto Publicado
    if (estado && !['Publicado', 'Borrador'].includes(estado)) {
        return 'El estado debe ser Publicado o Borrador.';
    }
    return null;
}

const campos = `id, titulo, descripcion_breve, etiqueta, imagen_portada_url, estado,
    DATE_FORMAT(fecha_publicacion, '%Y-%m-%d') AS fecha_publicacion, usuario_id, created_at, updated_at`;
const idValido = (id) => /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));

async function obtenerNovedades(req, res) {
    try {
        if (req.params.id && !idValido(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
        // Vamos a ver si nos pasan un Id de novedad, si nos dicen que es admin que debe ver todas las novedades o si es para la pa´gina principal que solo mostramos las "publicadas" cuya fecha de publicación es menor o igual a hoy. 
        let sql = `SELECT ${campos} FROM novedades`;
        const params = [];

        if (req.params.id) {
            sql += ' WHERE id = ?';
            params.push(req.params.id);
        } else if (!req.query.admin) { 
            // 👈 Si no viene el parámetro ?admin=true, aplicamos el filtro público:
            sql += ' WHERE estado = "Publicado" AND (fecha_publicacion <= CURDATE() OR fecha_publicacion IS NULL) ORDER BY fecha_publicacion DESC, id DESC';
        } else {
            // El panel de administración ve todas (borradores y futuras)
            sql += ' ORDER BY fecha_publicacion DESC, id DESC';
        }
        const [rows] = await promisePool.query(sql, params);

        if (req.params.id && !rows.length) return res.status(404).json({ error: 'Novedad no encontrada.' });
        res.json(req.params.id ? rows[0] : rows);
    } catch (error) {
        console.error('Error al consultar novedades:', error);
        res.status(500).json({ error: 'No se pudieron consultar las novedades.' });
    }
}

async function guardarNovedad(req, res) {
    const id = req.params.id;
    if (id && !idValido(id)) return res.status(400).json({ error: 'ID inválido.' });
    const errorValidacion = validar(req.body);

    if (errorValidacion) return res.status(400).json({ error: errorValidacion });

    const { titulo, descripcion_breve, etiqueta, imagen_portada_url, fecha_publicacion, estado } = req.body;

    const estadoFinal = estado || 'Publicado';

    const valores = [titulo.trim(), descripcion_breve || null, etiqueta, imagen_portada_url || null, fecha_publicacion || null, estadoFinal];
    try {
        let novedadId;
        if (id) {
            const [result] = await promisePool.query('UPDATE novedades SET titulo = ?, descripcion_breve = ?, etiqueta = ?, imagen_portada_url = ?, fecha_publicacion = ? , estado = ? WHERE id = ?', [...valores, id]);
            if (!result.affectedRows) return res.status(404).json({ error: 'Novedad no encontrada.' });
            novedadId = Number(id);
        } else {
            const usuarioId = req.usuario?.id || req.user?.id || 1;

            const [result] = await promisePool.query('INSERT INTO novedades (titulo, descripcion_breve, etiqueta, imagen_portada_url, fecha_publicacion, estado, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?', [...valores, req.usuarioId]);
            novedadId = result.insertId;
        }
        res.status(id ? 200 : 201).json({ mensaje: id ? 'Novedad actualizada.' : 'Novedad creada.', novedadId });
    } catch (error) {
        console.error('Error al guardar novedad:', error);
        res.status(500).json({ error: 'No se pudo guardar la novedad.' });
    }
}

async function eliminarNovedad(req, res) {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
    try {
        const [result] = await promisePool.query('DELETE FROM novedades WHERE id = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Novedad no encontrada.' });
        res.json({ mensaje: 'Novedad eliminada.' });
    } catch (error) {
        console.error('Error al eliminar novedad:', error);
        res.status(500).json({ error: 'No se pudo eliminar la novedad.' });
    }
}

module.exports = { obtenerNovedades, guardarNovedad, eliminarNovedad };
