const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const { promisePool } = require('../config/db');

describe('CRUD de Plantel docente con MySQL', () => {
    let tokenAdmin;
    let tokenGestion;
    const idsCreados = new Set();
    let materiaId;
    let mesaId;
    let horarioId;

    beforeAll(async () => {
        const admin = await request(app).post('/api/auth/login').send({ correo: 'aruidiaz@ifts2.edu.ar', password: '123456' });
        expect(admin.status).toBe(200);
        tokenAdmin = admin.body.token;
        const gestion = await request(app).post('/api/auth/login').send({ correo: 'mcanovi@ifts2.edu.ar', password: '123456' });
        expect(gestion.status).toBe(200);
        tokenGestion = gestion.body.token;
    });

    afterAll(async () => {
        try {
            if (horarioId) await promisePool.query('DELETE FROM horarios_cursada WHERE id = ?', [horarioId]);
            if (mesaId) await promisePool.query('DELETE FROM mesas_examenes WHERE id = ?', [mesaId]);
            for (const id of idsCreados) await promisePool.query('DELETE FROM profesores WHERE id = ?', [id]);
            if (materiaId) await promisePool.query('DELETE FROM materias WHERE id = ?', [materiaId]);
        } finally {
            await promisePool.end();
        }
    });

    async function crear(token, nombre = 'Docente temporal de prueba') {
        const res = await request(app).post('/api/profesores').auth(token, { type: 'bearer' }).send({ nombre_completo: nombre });
        if (res.body.profesorId) idsCreados.add(res.body.profesorId);
        expect(res.status).toBe(201);
        expect(Number.isInteger(res.body.profesorId)).toBe(true);
        return res.body.profesorId;
    }

    test('persiste creación, consulta pública, actualización y eliminación', async () => {
        const id = await crear(tokenAdmin, '  Prof. Ana de Prueba  ');
        const lectura = await request(app).get(`/api/profesores/${id}`);
        expect(lectura.status).toBe(200);
        expect(lectura.body).toMatchObject({ id, nombre_completo: 'Prof. Ana de Prueba' });
        expect(lectura.body).toHaveProperty('created_at');
        const listado = await request(app).get('/api/profesores');
        expect(listado.status).toBe(200);
        expect(listado.body.some((item) => item.id === id)).toBe(true);

        const editado = await request(app).put(`/api/profesores/${id}`).auth(tokenAdmin, { type: 'bearer' }).send({ nombre_completo: 'Prof. Ana Actualizada' });
        expect(editado.status).toBe(200);
        const [rows] = await promisePool.query('SELECT nombre_completo FROM profesores WHERE id = ?', [id]);
        expect(rows[0].nombre_completo).toBe('Prof. Ana Actualizada');
        expect((await request(app).get(`/api/profesores/${id}`)).body.nombre_completo).toBe('Prof. Ana Actualizada');
        // Guardar nuevamente los mismos datos también debe funcionar.
        expect((await request(app).put(`/api/profesores/${id}`).auth(tokenAdmin, { type: 'bearer' }).send({ nombre_completo: 'Prof. Ana Actualizada' })).status).toBe(200);
        expect((await request(app).delete(`/api/profesores/${id}`).auth(tokenAdmin, { type: 'bearer' })).status).toBe(200);
        expect((await request(app).get(`/api/profesores/${id}`)).status).toBe(404);
        expect((await request(app).put(`/api/profesores/${id}`).auth(tokenAdmin, { type: 'bearer' }).send({ nombre_completo: 'No existe' })).status).toBe(404);
        expect((await request(app).delete(`/api/profesores/${id}`).auth(tokenAdmin, { type: 'bearer' })).status).toBe(404);
        const [restantes] = await promisePool.query('SELECT id FROM profesores WHERE id = ?', [id]);
        expect(restantes).toHaveLength(0);
    });

    test('permite el CRUD a Gestión Académica', async () => {
        const id = await crear(tokenGestion);
        expect((await request(app).put(`/api/profesores/${id}`).auth(tokenGestion, { type: 'bearer' }).send({ nombre_completo: 'Docente actualizado por Gestión' })).status).toBe(200);
        expect((await request(app).delete(`/api/profesores/${id}`).auth(tokenGestion, { type: 'bearer' })).status).toBe(200);
    });

    test('rechaza escrituras sin token, con token inválido o sin el rol requerido', async () => {
        const id = await crear(tokenAdmin);
        const sinRol = jwt.sign({ id: 1, nivel_de_acceso: 'Otro rol' }, process.env.JWT_SECRET, { expiresIn: '1m' });
        for (const [token, status] of [[null, 401], ['invalido', 401], [sinRol, 403]]) {
            for (const [metodo, ruta] of [['post', '/api/profesores'], ['put', `/api/profesores/${id}`], ['delete', `/api/profesores/${id}`]]) {
                const req = request(app)[metodo](ruta);
                if (token) req.auth(token, { type: 'bearer' });
                expect((await req.send({ nombre_completo: 'Cambio no autorizado' })).status).toBe(status);
            }
        }
        expect((await request(app).get(`/api/profesores/${id}`)).body.nombre_completo).toBe('Docente temporal de prueba');
    });

    test('valida el nombre en creación y edición', async () => {
        const id = await crear(tokenAdmin);
        for (const body of [{}, { nombre_completo: null }, { nombre_completo: 123 }, { nombre_completo: ' ' }, { nombre_completo: 'a'.repeat(256) }]) {
            expect((await request(app).post('/api/profesores').auth(tokenAdmin, { type: 'bearer' }).send(body)).status).toBe(400);
            expect((await request(app).put(`/api/profesores/${id}`).auth(tokenAdmin, { type: 'bearer' }).send(body)).status).toBe(400);
        }
        expect((await request(app).post('/api/profesores').auth(tokenAdmin, { type: 'bearer' })).status).toBe(400);
        const limiteId = await crear(tokenAdmin, 'a'.repeat(255));
        expect((await request(app).get(`/api/profesores/${limiteId}`)).body.nombre_completo).toHaveLength(255);
    });

    test('rechaza IDs inválidos', async () => {
        for (const id of ['0', '-1', 'abc', '1.5', '2147483648', '9007199254740992']) {
            expect((await request(app).get(`/api/profesores/${id}`)).status).toBe(400);
            expect((await request(app).put(`/api/profesores/${id}`).auth(tokenAdmin, { type: 'bearer' }).send({ nombre_completo: 'Prueba' })).status).toBe(400);
            expect((await request(app).delete(`/api/profesores/${id}`).auth(tokenAdmin, { type: 'bearer' })).status).toBe(400);
        }
    });

    test('al eliminar conserva materias, mesas y horarios según sus claves foráneas', async () => {
        const id = await crear(tokenAdmin);
        const [materia] = await promisePool.query("INSERT INTO materias (nombre, anio_carrera) VALUES (?, '1')", ['Materia temporal del test de profesores']);
        materiaId = materia.insertId;
        const [mesa] = await promisePool.query("INSERT INTO mesas_examenes (materia_id, periodo, fecha, hora, anio_vigencia) VALUES (?, 'Prueba', '2027-03-03', '18:00:00', 2027)", [materiaId]);
        mesaId = mesa.insertId;
        await promisePool.query('INSERT INTO profesor_materia (profesor_id, materia_id) VALUES (?, ?)', [id, materiaId]);
        await promisePool.query('INSERT INTO mesa_examen_profesor (mesa_examen_id, profesor_id) VALUES (?, ?)', [mesaId, id]);
        const [horario] = await promisePool.query("INSERT INTO horarios_cursada (dia_semana, hora_inicio, hora_fin, cuatrimestre, anio, materia_id, profesor_id) VALUES ('Lunes', '18:00:00', '20:00:00', 1, 2027, ?, ?)", [materiaId, id]);
        horarioId = horario.insertId;
        expect((await request(app).delete(`/api/profesores/${id}`).auth(tokenAdmin, { type: 'bearer' })).status).toBe(200);
        const [vinculos] = await promisePool.query('SELECT profesor_id FROM profesor_materia WHERE profesor_id = ?', [id]);
        const [tribunal] = await promisePool.query('SELECT profesor_id FROM mesa_examen_profesor WHERE profesor_id = ?', [id]);
        const [horarios] = await promisePool.query('SELECT profesor_id FROM horarios_cursada WHERE id = ?', [horarioId]);
        const [materias] = await promisePool.query('SELECT id FROM materias WHERE id = ?', [materiaId]);
        const [mesas] = await promisePool.query('SELECT id FROM mesas_examenes WHERE id = ?', [mesaId]);
        expect(vinculos).toHaveLength(0);
        expect(tribunal).toHaveLength(0);
        expect(horarios).toEqual([{ profesor_id: null }]);
        expect(materias).toHaveLength(1);
        expect(mesas).toHaveLength(1);
    });
});
