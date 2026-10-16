const request = require('supertest');
const app = require('../index'); 
const pool = require('../config/db');
const poolConection = pool.promisePool;

describe('Test de Autenticación y CRUD de Usuarios', () => {
    let tokenAdmin = '';
    let tokenGestion = '';
    let idUsuarioPrueba = '';

    // Datos simulados para los tests
    const credencialesAdmin = { correo: 'aruidiaz@ifts2.edu.ar', password: '123456' };
    const credencialesGestion = { correo: 'mcanovi@ifts2.edu.ar', password: '123456' };

    const nuevoUsuario = {
        nombre_completo: 'Test User',
        rol_institucional: 'Docente',
        nivel_de_acceso: 'Administrador General',
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
    describe('CRUD de Usuarios - Rol: Administrador General', () => {
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
            expect(res.body.error).toMatch(/No tienes los permisos necesarios para esta acción./i);
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

    //Cambio de contraseña para el usuario logueado y autenticado
    describe('Gestión de Perfil - Cambio de Contraseña', () => {
        let tokenPrueba;
        let idUsuarioPrueba;
        const credencialesPrueba = {
            correo: 'test.password@ifts2.edu.ar',
            password: 'passwordOriginal123'
        };

        //Crear un usuario temporal y obtener su token antes de probar
        beforeAll(async () => {
            const resCrear = await request(app)
                .post('/api/usuarios')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({
                    nombre_completo: 'Usuario Test Password',
                    rol_institucional: 'Docente',
                    nivel_de_acceso: 'General',
                    correo: credencialesPrueba.correo,
                    password: credencialesPrueba.password
                });

            idUsuarioPrueba = resCrear.body.usuarioId;

            // Loguearse para obtener el token del usuario de prueba
            const resLogin = await request(app)
                .post('/api/auth/login')
                .send(credencialesPrueba);

            tokenPrueba = resLogin.body.token;
        });

        //Limpiar la base de datos después de las pruebas
        afterAll(async () => {
            await request(app)
                .delete(`/api/usuarios/${idUsuarioPrueba}`)
                .set('Authorization', `Bearer ${tokenAdmin}`);
        });

        it('Debe rechazar el cambio si la contraseña actual es incorrecta', async () => {
            const res = await request(app)
                .put('/api/auth/cambiar-password')
                .set('Authorization', `Bearer ${tokenPrueba}`)
                .send({
                    password_actual: 'claveEquivocada',
                    nueva_password: 'NuevaPassword2027'
                });

            expect(res.statusCode).toEqual(401);
            expect(res.body.error).toMatch(/incorrecta/i);
        });

        it('Debe rechazar el cambio si la nueva contraseña tiene menos de 8 caracteres', async () => {
            const res = await request(app)
                .put('/api/auth/cambiar-password')
                .set('Authorization', `Bearer ${tokenPrueba}`)
                .send({
                    password_actual: credencialesPrueba.password,
                    nueva_password: '123'
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toMatch(/8 caracteres/i);
        });

        it('Debe permitir cambiar la contraseña exitosamente', async () => {
            const res = await request(app)
                .put('/api/auth/cambiar-password')
                .set('Authorization', `Bearer ${tokenPrueba}`)
                .send({
                    password_actual: credencialesPrueba.password,
                    nueva_password: 'NuevaPassword2027'
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.mensaje).toMatch(/exitosa/i);

            // Verificar que ahora puede iniciar sesión con la nueva contraseña
            const resNuevoLogin = await request(app)
                .post('/api/auth/login')
                .send({
                    correo: credencialesPrueba.correo,
                    password: 'NuevaPassword2027'
                });

            expect(resNuevoLogin.statusCode).toEqual(200);
            expect(resNuevoLogin.body).toHaveProperty('token');
        });
    });

    // Limpieza después de correr todos los tests
    afterAll(async () => {
        // Cierra el pool de conexiones de la DB para que Jest pueda terminar el proceso
        await poolConection.end();
    });
});