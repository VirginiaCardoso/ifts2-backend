const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../controllers/autoridades-controller', () =>
    Object.fromEntries(
        ['obtenerAutoridades', 'crearAutoridad', 'actualizarAutoridad', 'eliminarAutoridad']
            .map((handler) => [handler, (req, res) => res.sendStatus(200)])
    )
);

jest.mock('../controllers/bedeles-controller', () =>
    Object.fromEntries(
        ['obtenerBedeles', 'crearBedel', 'actualizarBedel', 'eliminarBedel']
            .map((handler) => [handler, (req, res) => res.sendStatus(200)])
    )
);

jest.mock('../controllers/enlaces-controller', () => ({
    obtenerEnlaces: (req, res) => res.sendStatus(200),
    actualizarEnlace: (req, res) => res.sendStatus(200),
}));

const app = require('../index');

const rutasPublicas = [
    ['get', '/api/autoridades'],
    ['get', '/api/bedeles'],
    ['get', '/api/enlaces-externos'],
];

const rutasDeEscritura = [
    ['post', '/api/autoridades'],
    ['put', '/api/autoridades/1'],
    ['delete', '/api/autoridades/1'],
    ['post', '/api/bedeles'],
    ['put', '/api/bedeles/1'],
    ['delete', '/api/bedeles/1'],
    ['put', '/api/enlaces-externos/1'],
];

describe('Acceso a autoridades, bedeles y enlaces externos', () => {
    const tokenAdmin = jwt.sign(
        { nivel_de_acceso: 'Administrador General' },
        process.env.JWT_SECRET
    );
    const tokenOtroRol = jwt.sign(
        { nivel_de_acceso: 'Gestión Académica' },
        process.env.JWT_SECRET
    );

    test.each(rutasPublicas)('%s %s es público', async (metodo, ruta) => {
        const respuesta = await request(app)[metodo](ruta);

        expect(respuesta.status).toBe(200);
    });

    test.each(rutasDeEscritura)('%s %s requiere autenticación y rol administrador', async (metodo, ruta) => {
        const sinToken = await request(app)[metodo](ruta);
        const otroRol = await request(app)[metodo](ruta)
            .set('Authorization', `Bearer ${tokenOtroRol}`);
        const admin = await request(app)[metodo](ruta)
            .set('Authorization', `Bearer ${tokenAdmin}`);

        expect(sinToken.status).toBe(401);
        expect(otroRol.status).toBe(403);
        expect(admin.status).toBe(200);
    });
});
