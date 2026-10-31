const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../controllers/usuarios-controller', () => {
    const obtenerUsuarios = jest.fn((req, res) =>
        res.json([{ id: 1, nombre_completo: 'Usuario de prueba' }])
    );
    const handler = jest.fn((req, res) => res.sendStatus(200));
    return {
        obtenerUsuarios,
        crearUsuario: handler,
        actualizarUsuario: handler,
        eliminarUsuario: handler,
        cambiarPasswordUsuario: handler,
    };
});

const app = require('../index');

describe('GET /api/usuarios', () => {
    const tokenAdmin = jwt.sign(
        { nivel_de_acceso: 'Administrador General' },
        process.env.JWT_SECRET
    );
    const tokenGestion = jwt.sign(
        { nivel_de_acceso: 'Gestión Académica' },
        process.env.JWT_SECRET
    );

    test('responde 401 si no hay sesión', async () => {
        const respuesta = await request(app).get('/api/usuarios');

        expect(respuesta.status).toBe(401);
    });

    test('responde 403 a Gestión Académica y no entrega el listado', async () => {
        const respuesta = await request(app)
            .get('/api/usuarios')
            .set('Authorization', `Bearer ${tokenGestion}`);

        expect(respuesta.status).toBe(403);
        expect(respuesta.body).not.toHaveProperty('usuarios');
    });

    test('permite a Administrador General obtener el listado', async () => {
        const respuesta = await request(app)
            .get('/api/usuarios')
            .set('Authorization', `Bearer ${tokenAdmin}`);

        expect(respuesta.status).toBe(200);
        expect(respuesta.body).toEqual([
            { id: 1, nombre_completo: 'Usuario de prueba' },
        ]);
    });
});
