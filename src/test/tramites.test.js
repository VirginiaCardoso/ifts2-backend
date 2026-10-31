const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const { promisePool } = require('../config/db');

describe('CRUD de trámites con MySQL', () => {
    const ids = new Set();
    let admin;
    let gestion;
    beforeAll(async () => {
        const login = async (correo) => {
            const res = await request(app).post('/api/auth/login').send({ correo, password: '123456' });
            expect(res.status).toBe(200);
            return res.body.token;
        };
        admin = await login('aruidiaz@ifts2.edu.ar');
        gestion = await login('mcanovi@ifts2.edu.ar');
    });
    afterAll(async () => {
        try { for (const id of ids) await promisePool.query('DELETE FROM tramites_requisitos WHERE id = ?', [id]); }
        finally { await promisePool.end(); }
    });
    async function crear(token, body = { nombre_tramite: '  Trámite temporal  ', descripcion_requisitos: 'Presentar documentación.' }) {
        const res = await request(app).post('/api/tramites').auth(token, { type: 'bearer' }).send(body);
        if (res.body.tramiteId) ids.add(res.body.tramiteId);
        expect(res.status).toBe(201);
        expect(Number.isInteger(res.body.tramiteId)).toBe(true);
        return res.body.tramiteId;
    }
    test('persiste el CRUD completo con Administrador General', async () => {
        const token = admin;
        const id = await crear(token);
        const lectura = await request(app).get(`/api/tramites/${id}`);
        expect(lectura.status).toBe(200);
        expect(lectura.body).toMatchObject({ id, nombre_tramite: 'Trámite temporal', descripcion_requisitos: 'Presentar documentación.' });
        const lista = await request(app).get('/api/tramites');
        expect(lista.status).toBe(200);
        expect(lista.body.some((item) => item.id === id)).toBe(true);
        const cambios = { nombre_tramite: 'Trámite actualizado', descripcion_requisitos: 'Requisitos actualizados.' };
        for (let i = 0; i < 2; i++) expect((await request(app).put(`/api/tramites/${id}`).auth(token, { type: 'bearer' }).send(cambios)).status).toBe(200);
        const [rows] = await promisePool.query('SELECT nombre_tramite, descripcion_requisitos FROM tramites_requisitos WHERE id = ?', [id]);
        expect(rows[0]).toMatchObject(cambios);
        expect((await request(app).get(`/api/tramites/${id}`)).body).toMatchObject(cambios);
        expect((await request(app).delete(`/api/tramites/${id}`).auth(token, { type: 'bearer' })).status).toBe(200);
        expect((await request(app).get(`/api/tramites/${id}`)).status).toBe(404);
        expect((await request(app).put(`/api/tramites/${id}`).auth(token, { type: 'bearer' }).send(cambios)).status).toBe(404);
        expect((await request(app).delete(`/api/tramites/${id}`).auth(token, { type: 'bearer' })).status).toBe(404);
        const [restantes] = await promisePool.query('SELECT id FROM tramites_requisitos WHERE id = ?', [id]);
        expect(restantes).toHaveLength(0);
    });
    test('rechaza las escrituras de trámites para Gestión Académica', async () => {
        const id = await crear(admin);
        expect((await request(app).post('/api/tramites').auth(gestion, { type: 'bearer' }).send({ nombre_tramite: 'No autorizado' })).status).toBe(403);
        expect((await request(app).put(`/api/tramites/${id}`).auth(gestion, { type: 'bearer' }).send({ nombre_tramite: 'No autorizado' })).status).toBe(403);
        expect((await request(app).delete(`/api/tramites/${id}`).auth(gestion, { type: 'bearer' })).status).toBe(403);
        expect((await request(app).get(`/api/tramites/${id}`)).body.nombre_tramite).toBe('Trámite temporal');
    });
    test('rechaza nombres, descripciones e IDs inválidos', async () => {
        const id = await crear(admin);
        for (const body of [{}, { nombre_tramite: ' ' }, { nombre_tramite: 1 }, { nombre_tramite: 'a'.repeat(256) }, { nombre_tramite: 'Prueba', descripcion_requisitos: {} }, { nombre_tramite: 'Prueba', descripcion_requisitos: 'á'.repeat(32768) }]) {
            expect((await request(app).post('/api/tramites').auth(admin, { type: 'bearer' }).send(body)).status).toBe(400);
            expect((await request(app).put(`/api/tramites/${id}`).auth(admin, { type: 'bearer' }).send(body)).status).toBe(400);
        }
        expect((await request(app).post('/api/tramites').auth(admin, { type: 'bearer' })).status).toBe(400);
        for (const invalido of ['0', '-1', 'abc', '1.5', '2147483648']) {
            expect((await request(app).get(`/api/tramites/${invalido}`)).status).toBe(400);
            expect((await request(app).put(`/api/tramites/${invalido}`).auth(admin, { type: 'bearer' }).send({ nombre_tramite: 'Prueba' })).status).toBe(400);
            expect((await request(app).delete(`/api/tramites/${invalido}`).auth(admin, { type: 'bearer' })).status).toBe(400);
        }
    });
    test('admite descripción opcional y nombre de 255 caracteres', async () => {
        const id = await crear(admin, { nombre_tramite: 'a'.repeat(255) });
        expect((await request(app).get(`/api/tramites/${id}`)).body.descripcion_requisitos).toBeNull();
        expect((await request(app).put(`/api/tramites/${id}`).auth(admin, { type: 'bearer' }).send({ nombre_tramite: 'Sin requisitos', descripcion_requisitos: ' ' })).status).toBe(200);
        expect((await request(app).get(`/api/tramites/${id}`)).body.descripcion_requisitos).toBeNull();
    });
    test('protege las tres escrituras contra tokens ausentes, inválidos y roles no autorizados', async () => {
        const id = await crear(admin);
        const sinRol = jwt.sign({ id: 1, nivel_de_acceso: 'Otro rol' }, process.env.JWT_SECRET, { expiresIn: '1m' });
        for (const [token, status] of [[null, 401], ['invalido', 401], [sinRol, 403]]) {
            for (const [metodo, ruta] of [['post', '/api/tramites'], ['put', `/api/tramites/${id}`], ['delete', `/api/tramites/${id}`]]) {
                const req = request(app)[metodo](ruta);
                if (token) req.auth(token, { type: 'bearer' });
                expect((await req.send({ nombre_tramite: 'No autorizado' })).status).toBe(status);
            }
        }
        expect((await request(app).get(`/api/tramites/${id}`)).body.nombre_tramite).toBe('Trámite temporal');
    });
});
