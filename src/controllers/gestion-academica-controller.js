const { promisePool } = require('../config/db');
const { dias, anioValido, parametroIdValido, normalizarHora, validarMesa, validarHorario } = require('../validators/gestion-academica-validator');

function fallo(status, message) { return Object.assign(new Error(message), { status }); }
function responderError(res, error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'La materia o un profesor indicado ya no existe.' });
    console.error('Error en Gestión Académica:', error);
    return res.status(500).json({ error: 'No se pudo completar la operación de Gestión Académica.' });
}
function filtros(query, mesa) {
    const condiciones = [];
    const valores = [];
    const agregar = (sql, valor) => { condiciones.push(sql); valores.push(valor); };
    if (query.anio !== undefined) {
        if (typeof query.anio !== 'string' || !/^\d{4}$/.test(query.anio) || !anioValido(Number(query.anio))) throw fallo(400, 'Filtro de año inválido.');
        agregar(`r.${mesa ? 'anio_vigencia' : 'anio'} = ?`, Number(query.anio));
    }
    if (query.materia_id !== undefined) {
        if (!parametroIdValido(query.materia_id)) throw fallo(400, 'Filtro de materia inválido.');
        agregar('r.materia_id = ?', Number(query.materia_id));
    }
    if (!mesa && query.cuatrimestre !== undefined) {
        if (!['1', '2'].includes(query.cuatrimestre)) throw fallo(400, 'Filtro de cuatrimestre inválido.');
        agregar('r.cuatrimestre = ?', Number(query.cuatrimestre));
    }
    if (!mesa && query.dia_semana !== undefined) {
        if (!dias.includes(query.dia_semana)) throw fallo(400, 'Filtro de día inválido.');
        agregar('r.dia_semana = ?', query.dia_semana);
    }
    return { condiciones, valores };
}
async function comprobarReferencias(conn, materiaId, profesoresIds) {
    const [materias] = await conn.query('SELECT id FROM materias WHERE id = ?', [materiaId]);
    if (!materias.length) throw fallo(400, 'La materia indicada no existe.');
    if (profesoresIds.length) {
        const [profesores] = await conn.query('SELECT id FROM profesores WHERE id IN (?)', [profesoresIds]);
        if (profesores.length !== profesoresIds.length) throw fallo(400, 'Uno o más profesores indicados no existen.');
    }
}

function crearControlador(mesa) {
    const tabla = mesa ? 'mesas_examenes' : 'horarios_cursada';
    const nombre = mesa ? 'Mesa de examen' : 'Horario de cursada';
    const validar = mesa ? validarMesa : validarHorario;
    async function obtener(req, res) {
        try {
            const { id } = req.params;
            if (id && !parametroIdValido(id)) throw fallo(400, 'ID inválido.');
            const { condiciones, valores } = filtros(req.query, mesa);
            if (id) { condiciones.push('r.id = ?'); valores.push(Number(id)); }
            const columnas = mesa
                ? "r.id, r.materia_id, m.nombre AS materia_nombre, m.anio_carrera, r.periodo, DATE_FORMAT(r.fecha, '%Y-%m-%d') AS fecha, TIME_FORMAT(r.hora, '%H:%i:%s') AS hora, r.anio_vigencia, r.created_at, r.updated_at"
                : "r.id, r.materia_id, m.nombre AS materia_nombre, m.anio_carrera, r.profesor_id, p.nombre_completo AS profesor_nombre, r.dia_semana, TIME_FORMAT(r.hora_inicio, '%H:%i:%s') AS hora_inicio, TIME_FORMAT(r.hora_fin, '%H:%i:%s') AS hora_fin, r.cuatrimestre, r.anio, r.created_at, r.updated_at";
            const orden = mesa ? 'r.fecha, r.hora, r.id' : "r.anio, r.cuatrimestre, FIELD(r.dia_semana, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'), r.hora_inicio, r.id";
            const [rows] = await promisePool.query(`SELECT ${columnas} FROM ${tabla} r JOIN materias m ON m.id = r.materia_id ${mesa ? '' : 'LEFT JOIN profesores p ON p.id = r.profesor_id'} ${condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''} ORDER BY ${orden}`, valores);
            if (id && !rows.length) throw fallo(404, `${nombre} no encontrado/a.`);
            if (mesa && rows.length) {
                const [tribunales] = await promisePool.query('SELECT mp.mesa_examen_id, p.id, p.nombre_completo FROM mesa_examen_profesor mp JOIN profesores p ON p.id = mp.profesor_id WHERE mp.mesa_examen_id IN (?) ORDER BY p.nombre_completo, p.id', [rows.map((row) => row.id)]);
                const porMesa = new Map();
                for (const { mesa_examen_id, id: profesorId, nombre_completo } of tribunales) {
                    if (!porMesa.has(mesa_examen_id)) porMesa.set(mesa_examen_id, []);
                    porMesa.get(mesa_examen_id).push({ id: profesorId, nombre_completo });
                }
                for (const row of rows) { row.tribunal = porMesa.get(row.id) || []; row.profesores_ids = row.tribunal.map((p) => p.id); }
            }
            res.json(id ? rows[0] : rows);
        } catch (error) { responderError(res, error); }
    }
    async function guardar(req, res) {
        const { id } = req.params;
        if (id && !parametroIdValido(id)) return res.status(400).json({ error: 'ID inválido.' });
        const errorValidacion = validar(req.body);
        if (errorValidacion) return res.status(400).json({ error: errorValidacion });
        let conn;
        try {
            conn = await promisePool.getConnection();
            await conn.beginTransaction();
            if (id) {
                const [existentes] = await conn.query(`SELECT id FROM ${tabla} WHERE id = ? FOR UPDATE`, [Number(id)]);
                if (!existentes.length) throw fallo(404, `${nombre} no encontrado/a.`);
            }
            const body = req.body;
            await comprobarReferencias(conn, body.materia_id, mesa ? body.profesores_ids : (body.profesor_id == null ? [] : [body.profesor_id]));
            const columnas = mesa ? ['materia_id', 'periodo', 'fecha', 'hora', 'anio_vigencia'] : ['materia_id', 'profesor_id', 'dia_semana', 'hora_inicio', 'hora_fin', 'cuatrimestre', 'anio'];
            const valores = mesa ? [body.materia_id, body.periodo.trim(), body.fecha, normalizarHora(body.hora), body.anio_vigencia] : [body.materia_id, body.profesor_id ?? null, body.dia_semana, normalizarHora(body.hora_inicio), normalizarHora(body.hora_fin), body.cuatrimestre, body.anio];
            const [result] = id
                ? await conn.query(`UPDATE ${tabla} SET ${columnas.map((columna) => columna + ' = ?').join(', ')} WHERE id = ?`, [...valores, Number(id)])
                : await conn.query(`INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`, valores);
            const registroId = id ? Number(id) : result.insertId;
            if (mesa) {
                if (id) await conn.query('DELETE FROM mesa_examen_profesor WHERE mesa_examen_id = ?', [registroId]);
                await conn.query('INSERT INTO mesa_examen_profesor (mesa_examen_id, profesor_id) VALUES ?', [body.profesores_ids.map((profesorId) => [registroId, profesorId])]);
            }
            await conn.commit();
            res.status(id ? 200 : 201).json({ mensaje: `${nombre} ${id ? 'actualizado/a' : 'creado/a'}.`, [mesa ? 'mesaId' : 'horarioId']: registroId });
        } catch (error) {
            if (conn) await conn.rollback();
            responderError(res, error);
        } finally { if (conn) conn.release(); }
    }
    async function eliminar(req, res) {
        if (!parametroIdValido(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
        try {
            const [result] = await promisePool.query(`DELETE FROM ${tabla} WHERE id = ?`, [Number(req.params.id)]);
            if (!result.affectedRows) throw fallo(404, `${nombre} no encontrado/a.`);
            res.json({ mensaje: `${nombre} eliminado/a.` });
        } catch (error) { responderError(res, error); }
    }
    return { obtener, guardar, eliminar };
}
module.exports = { mesas: crearControlador(true), horarios: crearControlador(false) };
