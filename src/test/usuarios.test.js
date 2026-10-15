const request = require('supertest');
const app = require('../index'); 
const pool = require('../config/db');
const poolConection = pool.promisePool;

describe('Test de Autenticación y CRUD de Usuarios', () => {
    let tokenAdmin = '';
    let tokenGestion = '';
    let idUsuarioPrueba = '';

    // Datos simulados para los tests
    const credencialesAdmin = { correo: 'aruidiaz@ifts2.edu.ar', password: 'password_admin' };
    const credencialesGestion = { correo: 'mcanovi@ifts2.edu.ar', password: 'password_gestion' };

    const nuevoUsuario = {
        nombre_completo: 'Test User',
        rol_institucional: 'Docente',
        nivel_de_acceso: 'Administrador general',
        correo: 'test@ifts2.edu.ar',
        password: '123'
    };

    // Test de login para ambos roles
    describe('Autenticación (Login)', () => {
        it('Debe iniciar sesión como Administrador general y devolver un token', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send(credencialesAdmin);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('token');
            // Guardamos el token
            tokenAdmin = res.body.token; 
        });

        it('Debe iniciar sesión como Gestión Académica y devolver un token', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send(credencialesGestion);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('token');
            // Guardamos el token
            tokenGestion = res.body.token; 
        });
    });

    // Test rol administrador general (debe permitir CRUD)
    describe('CRUD de Usuarios - Rol: Administrador general', () => {
        it('Debe permitir crear un usuario', async () => {
            const res = await request(app)
                .post('/api/usuarios')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send(nuevoUsuario);

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('usuarioId');
            // Guardamos el ID creado para editarlo/eliminarlo luego
            idUsuarioPrueba = res.body.usuarioId; 
        });

        it('Debe permitir editar un usuario', async () => {
            const res = await request(app)
                .put(`/api/usuarios/${idUsuarioPrueba}`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ nombre_completo: 'Test User Editado' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.mensaje).toBe('Usuario actualizado exitosamente');
        });

        it('Debe permitir eliminar un usuario', async () => {
            const res = await request(app)
                .delete(`/api/usuarios/${idUsuarioPrueba}`)
                .set('Authorization', `Bearer ${tokenAdmin}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.mensaje).toBe('Usuario eliminado exitosamente');
        });
    });

    // test rol gestión académica (no debe permitir CRUD)
    describe('CRUD de Usuarios - Rol: Gestión Académica', () => {
        it('No debe permitir crear un usuario (Error 403)', async () => {
            const res = await request(app)
                .post('/api/usuarios')
                .set('Authorization', `Bearer ${tokenGestion}`)
                .send(nuevoUsuario);

            expect(res.statusCode).toEqual(403);
            expect(res.body.error).toMatch(/Acceso prohibido/i);
        });

        it('No debe permitir editar un usuario (Error 403)', async () => {
            const res = await request(app)
                // Intentamos editar el usuario con ID 1
                .put('/api/usuarios/1') 
                .set('Authorization', `Bearer ${tokenGestion}`)
                .send({ nombre_completo: 'Intento de hackeo' });

            expect(res.statusCode).toEqual(403);
        });

        it('No debe permitir eliminar un usuario (Error 403)', async () => {
            const res = await request(app)
                .delete('/api/usuarios/1')
                .set('Authorization', `Bearer ${tokenGestion}`);

            expect(res.statusCode).toEqual(403);
        });
    });

    // Limpieza después de correr todos los tests
    afterAll(async () => {
        // Cierra el pool de conexiones de la DB para que Jest pueda terminar el proceso
        await poolConection.end();
    });
});