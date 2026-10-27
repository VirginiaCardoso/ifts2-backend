const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const { promisePool } = require('../config/db');

describe('Gestión Académica con MySQL', () => {
    let admin, gestion, materiaId, profesor1, profesor2;
    const mesas = new Set();
    const horarios = new Set();
    const auth = (token) => ({ Authorization: `Bearer ${token}` });
    const mesa = () => ({ materia_id: materiaId, periodo: 'Marzo 2027', fecha: '2027-03-03', hora: '18:30', anio_vigencia: 2027, profesores_ids: [profesor1, profesor2] });
    const horario = () => ({ materia_id: materiaId, profesor_id: profesor1, dia_semana: 'Lunes', hora_inicio: '18:00', hora_fin: '20:00', cuatrimestre: 1, anio: 2027 });
    beforeAll(async () => {
        const login = async (correo) => {
            const res = await request(app).post('/api/auth/login').send({ correo, password: '123456' });
            expect(res.status).toBe(200); return res.body.token;
        };
        admin = await login('aruidiaz@ifts2.edu.ar');
        gestion = await login('mcanovi@ifts2.edu.ar');
        const [materia] = await promisePool.query("INSERT INTO materias (nombre, anio_carrera) VALUES ('Materia temporal Gestión Académica', '1')");
        materiaId = materia.insertId;
        const [p1] = await promisePool.query("INSERT INTO profesores (nombre_completo) VALUES ('Docente temporal académico A')"); profesor1 = p1.insertId;
        const [p2] = await promisePool.query("INSERT INTO profesores (nombre_completo) VALUES ('Docente temporal académico B')"); profesor2 = p2.insertId;
    });
    afterAll(async () => {
        try {
            for (const id of mesas) await promisePool.query('DELETE FROM mesas_examenes WHERE id = ?', [id]);
            for (const id of horarios) await promisePool.query('DELETE FROM horarios_cursada WHERE id = ?', [id]);
            if (materiaId) await promisePool.query('DELETE FROM materias WHERE id = ?', [materiaId]);
            if (profesor1) await promisePool.query('DELETE FROM profesores WHERE id = ?', [profesor1]);
            if (profesor2) await promisePool.query('DELETE FROM profesores WHERE id = ?', [profesor2]);
        } finally { await promisePool.end(); }
    });
    async function crear(ruta, body, token = admin) {
        const res = await request(app).post(`/api/${ruta}`).set(auth(token)).send(body);
        const id = res.body.mesaId || res.body.horarioId;
        if (id) (ruta === 'mesas-examenes' ? mesas : horarios).add(id);
        expect(res.status).toBe(201); return id;
    }
    test.each(['admin', 'gestion'])('CRUD de mesas y reemplazo de tribunal con %s', async (rol) => {
        const token = rol === 'admin' ? admin : gestion;
        const id = await crear('mesas-examenes', mesa(), token);
        const lectura = await request(app).get(`/api/mesas-examenes/${id}`);
        expect(lectura.status).toBe(200);
        expect(lectura.body).toMatchObject({ materia_id: materiaId, fecha: '2027-03-03', hora: '18:30:00', materia_nombre: 'Materia temporal Gestión Académica' });
        expect(lectura.body.profesores_ids.sort()).toEqual([profesor1, profesor2].sort());
        expect(lectura.body.tribunal[0]).toHaveProperty('nombre_completo');
        const listado = await request(app).get(`/api/mesas-examenes?anio=2027&materia_id=${materiaId}`);
        expect(listado.body.some((item) => item.id === id)).toBe(true);
        expect((await request(app).get(`/api/mesas-examenes?anio=2028&materia_id=${materiaId}`)).body).toEqual([]);
        const cambios = { ...mesa(), fecha: '2027-03-17', profesores_ids: [profesor2] };
        for (let i = 0; i < 2; i++) expect((await request(app).put(`/api/mesas-examenes/${id}`).set(auth(token)).send(cambios)).status).toBe(200);
        expect((await request(app).get(`/api/mesas-examenes/${id}`)).body.profesores_ids).toEqual([profesor2]);
        const [rows] = await promisePool.query('SELECT profesor_id FROM mesa_examen_profesor WHERE mesa_examen_id = ?', [id]);
        expect(rows).toEqual([{ profesor_id: profesor2 }]);
        expect((await request(app).delete(`/api/mesas-examenes/${id}`).set(auth(token))).status).toBe(200);
        expect((await request(app).get(`/api/mesas-examenes/${id}`)).status).toBe(404);
        expect((await request(app).put(`/api/mesas-examenes/${id}`).set(auth(token)).send(mesa())).status).toBe(404);
        expect((await request(app).delete(`/api/mesas-examenes/${id}`).set(auth(token))).status).toBe(404);
        const [vinculos] = await promisePool.query('SELECT profesor_id FROM mesa_examen_profesor WHERE mesa_examen_id = ?', [id]);
        expect(vinculos).toHaveLength(0);
    });
    test.each(['admin', 'gestion'])('CRUD de horarios con profesor opcional y filtros con %s', async (rol) => {
        const token = rol === 'admin' ? admin : gestion;
        const id = await crear('horarios-cursada', horario(), token);
        const lectura = await request(app).get(`/api/horarios-cursada/${id}`);
        expect(lectura.body).toMatchObject({ materia_id: materiaId, profesor_id: profesor1, hora_inicio: '18:00:00', profesor_nombre: 'Docente temporal académico A' });
        const cambios = { ...horario(), dia_semana: 'Miércoles', profesor_id: null, hora_fin: '21:00' };
        for (let i = 0; i < 2; i++) expect((await request(app).put(`/api/horarios-cursada/${id}`).set(auth(token)).send(cambios)).status).toBe(200);
        const listado = await request(app).get(`/api/horarios-cursada?anio=2027&cuatrimestre=1&materia_id=${materiaId}&dia_semana=${encodeURIComponent('Miércoles')}`);
        expect(listado.body.find((item) => item.id === id)).toMatchObject({ profesor_id: null, profesor_nombre: null, hora_fin: '21:00:00' });
        expect((await request(app).get(`/api/horarios-cursada?anio=2028&materia_id=${materiaId}`)).body).toEqual([]);
        const [rows] = await promisePool.query('SELECT profesor_id FROM horarios_cursada WHERE id = ?', [id]);
        expect(rows).toEqual([{ profesor_id: null }]);
        expect((await request(app).delete(`/api/horarios-cursada/${id}`).set(auth(token))).status).toBe(200);
        expect((await request(app).get(`/api/horarios-cursada/${id}`)).status).toBe(404);
        expect((await request(app).put(`/api/horarios-cursada/${id}`).set(auth(token)).send(horario())).status).toBe(404);
        expect((await request(app).delete(`/api/horarios-cursada/${id}`).set(auth(token))).status).toBe(404);
    });
    test('valida fechas, horas, años, tribunales, días y referencias', async () => {
        const id = await crear('mesas-examenes', mesa());
        const [ausente] = await promisePool.query('SELECT GREATEST(COALESCE((SELECT MAX(id) FROM materias),0),COALESCE((SELECT MAX(id) FROM profesores),0)) + 1 AS id');
        const inexistente = ausente[0].id;
        for (const cambios of [{ fecha: '2027-02-30' }, { hora: '25:00' }, { periodo: '' }, { periodo: 'a'.repeat(101) }, { anio_vigencia: 2028 }, { profesores_ids: [] }, { profesores_ids: [profesor1, profesor1] }, { profesores_ids: [inexistente] }, { materia_id: inexistente }]) {
            expect((await request(app).post('/api/mesas-examenes').set(auth(admin)).send({ ...mesa(), ...cambios })).status).toBe(400);
            expect((await request(app).put(`/api/mesas-examenes/${id}`).set(auth(admin)).send({ ...mesa(), ...cambios })).status).toBe(400);
        }
        expect((await request(app).get(`/api/mesas-examenes/${id}`)).body.profesores_ids.sort()).toEqual([profesor1, profesor2].sort());
        const horarioId = await crear('horarios-cursada', horario());
        for (const cambios of [{ dia_semana: 'Domingo' }, { hora_inicio: '20:00' }, { hora_fin: '17:00' }, { hora_fin: '24:00' }, { cuatrimestre: 3 }, { anio: '2027' }, { profesor_id: inexistente }, { materia_id: inexistente }]) {
            expect((await request(app).post('/api/horarios-cursada').set(auth(admin)).send({ ...horario(), ...cambios })).status).toBe(400);
            expect((await request(app).put(`/api/horarios-cursada/${horarioId}`).set(auth(admin)).send({ ...horario(), ...cambios })).status).toBe(400);
        }
        for (const ruta of ['mesas-examenes', 'horarios-cursada']) {
            expect((await request(app).post(`/api/${ruta}`).set(auth(admin))).status).toBe(400);
            for (const idInvalido of ['0', '-1', 'abc', '1.5', '2147483648']) {
                expect((await request(app).get(`/api/${ruta}/${idInvalido}`)).status).toBe(400);
                expect((await request(app).delete(`/api/${ruta}/${idInvalido}`).set(auth(admin))).status).toBe(400);
                expect((await request(app).put(`/api/${ruta}/${idInvalido}`).set(auth(admin)).send(ruta === 'mesas-examenes' ? mesa() : horario())).status).toBe(400);
            }
            expect((await request(app).get(`/api/${ruta}?anio=no`)).status).toBe(400);
            expect((await request(app).get(`/api/${ruta}?materia_id=-1`)).status).toBe(400);
        }
        expect((await request(app).get('/api/horarios-cursada?cuatrimestre=3')).status).toBe(400);
        expect((await request(app).get('/api/horarios-cursada?dia_semana=Domingo')).status).toBe(400);
    });
    test('protege las escrituras de ambos recursos', async () => {
        const sinRol = jwt.sign({ id: 1, nivel_de_acceso: 'Otro' }, process.env.JWT_SECRET, { expiresIn: '1m' });
        for (const ruta of ['mesas-examenes', 'horarios-cursada']) {
            const body = ruta === 'mesas-examenes' ? mesa() : horario();
            const id = await crear(ruta, body);
            for (const [token, status] of [[null, 401], ['invalido', 401], [sinRol, 403]]) {
                for (const [metodo, url] of [['post', `/api/${ruta}`], ['put', `/api/${ruta}/${id}`], ['delete', `/api/${ruta}/${id}`]]) {
                    const req = request(app)[metodo](url);
                    if (token) req.set(auth(token));
                    expect((await req.send(body)).status).toBe(status);
                }
            }
        }
    });
    test('revierte mesa y tribunal si falla la escritura de asociaciones', async () => {
        const id = await crear('mesas-examenes', mesa());
        const conn = await promisePool.getConnection();
        const consultaOriginal = conn.query.bind(conn);
        const querySpy = jest.spyOn(conn, 'query').mockImplementation((sql, values) => {
            if (sql.startsWith('INSERT INTO mesa_examen_profesor')) return Promise.reject(new Error('Falla simulada de asociaciones'));
            return consultaOriginal(sql, values);
        });
        const connectionSpy = jest.spyOn(promisePool, 'getConnection').mockResolvedValueOnce(conn);
        const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
            const res = await request(app).put(`/api/mesas-examenes/${id}`).set(auth(admin)).send({ ...mesa(), periodo: 'Cambio que debe revertirse', profesores_ids: [profesor2] });
            expect(res.status).toBe(500);
        } finally { querySpy.mockRestore(); connectionSpy.mockRestore(); logSpy.mockRestore(); }
        const lectura = await request(app).get(`/api/mesas-examenes/${id}`);
        expect(lectura.body.periodo).toBe('Marzo 2027');
        expect(lectura.body.profesores_ids.sort()).toEqual([profesor1, profesor2].sort());
    });
});
