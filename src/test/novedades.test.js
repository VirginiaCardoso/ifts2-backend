const request = require('supertest');
const app = require('../index');
const { promisePool } = require('../config/db');

describe('CRUD de novedades con MySQL', () => {
    let token;
    let id;
    const nueva = { titulo: 'Evidencia automatizada CRUD', descripcion_breve: 'Registro temporal de prueba.', etiqueta: 'Novedades', fecha_publicacion: '2026-10-18', imagen_portada_url: '' };
    beforeAll(async () => {
        const login = await request(app).post('/api/auth/login').send({ correo: 'aruidiaz@ifts2.edu.ar', password: '123456' });
        expect(login.status).toBe(200);
        token = login.body.token;
    });
    afterAll(async () => {
        if (id) await promisePool.query('DELETE FROM novedades WHERE id = ?', [id]);
        await promisePool.end();
    });
    test('protege escrituras, valida datos y persiste crear, leer, editar y eliminar', async () => {
        const auth = { Authorization: `Bearer ${token}` };
        expect((await request(app).post('/api/novedades').send(nueva)).status).toBe(401);
        expect((await request(app).post('/api/novedades').set(auth).send({ ...nueva, titulo: ' ' })).status).toBe(400);
        expect((await request(app).post('/api/novedades').set(auth).send({ ...nueva, fecha_publicacion: '2026-02-30' })).status).toBe(400);
        expect((await request(app).post('/api/novedades').set(auth).send({ ...nueva, etiqueta: 'Inválida' })).status).toBe(400);
        expect((await request(app).post('/api/novedades').set(auth).send({ ...nueva, imagen_portada_url: 'javascript:alert(1)' })).status).toBe(400);
        const creado = await request(app).post('/api/novedades').set(auth).send(nueva);
        id = creado.body.novedadId;
        expect(creado.status).toBe(201);
        expect(Number.isInteger(id)).toBe(true);
        const lectura = await request(app).get(`/api/novedades/${id}`);
        expect(lectura.status).toBe(200);
        expect(lectura.body).toMatchObject({ titulo: nueva.titulo, fecha_publicacion: nueva.fecha_publicacion, usuario_id: 1 });
        const listado = await request(app).get('/api/novedades');
        expect(listado.body.some((item) => item.id === id)).toBe(true);
        expect((await request(app).put(`/api/novedades/${id}`).set(auth).send({ ...nueva, titulo: 'Evidencia editada', etiqueta: 'Eventos' })).status).toBe(200);
        const [filas] = await promisePool.query('SELECT titulo, etiqueta FROM novedades WHERE id = ?', [id]);
        expect(filas[0]).toMatchObject({ titulo: 'Evidencia editada', etiqueta: 'Eventos' });
        expect((await request(app).put(`/api/novedades/${id}`).set(auth).send({ ...nueva, titulo: 'Evidencia editada', etiqueta: 'Eventos' })).status).toBe(200);
        expect((await request(app).delete(`/api/novedades/${id}`).set(auth)).status).toBe(200);
        expect((await request(app).get(`/api/novedades/${id}`)).status).toBe(404);
        expect((await request(app).put(`/api/novedades/${id}`).set(auth).send(nueva)).status).toBe(404);
        expect((await request(app).delete(`/api/novedades/${id}`).set(auth)).status).toBe(404);
        const [restantes] = await promisePool.query('SELECT id FROM novedades WHERE id = ?', [id]);
        expect(restantes).toHaveLength(0);
    });
    test('crea un borrador con el autor del token de Gestión Académica e ignora autores enviados en el body', async () => {
        const login = await request(app).post('/api/auth/login').send({ correo: 'mcanovi@ifts2.edu.ar', password: '123456' });
        expect(login.status).toBe(200);
        const autorId = login.body.usuario.id;
        let borradorId;
        try {
            const creado = await request(app).post('/api/novedades')
                .set('Authorization', `Bearer ${login.body.token}`)
                .send({ ...nueva, titulo: 'Borrador temporal de Gestión Académica', estado: 'Borrador', usuario_id: 1 });
            borradorId = creado.body.novedadId;
            expect(creado.status).toBe(201);
            expect(Number.isInteger(borradorId)).toBe(true);
            const [rows] = await promisePool.query('SELECT usuario_id, estado FROM novedades WHERE id = ?', [borradorId]);
            expect(rows[0]).toMatchObject({ usuario_id: autorId, estado: 'Borrador' });
            const publico = await request(app).get('/api/novedades');
            expect(publico.status).toBe(200);
            expect(publico.body.some((item) => item.id === borradorId)).toBe(false);
            const administrativo = await request(app).get('/api/novedades?admin=true')
                .set('Authorization', `Bearer ${login.body.token}`);
            expect(administrativo.status).toBe(200);
            expect(administrativo.body.some((item) => item.id === borradorId)).toBe(true);
        } finally {
            if (borradorId) await promisePool.query('DELETE FROM novedades WHERE id = ?', [borradorId]);
        }
    });
});
