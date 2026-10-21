const request = require('supertest');
const app = require('../index');
const nodemailer = require('nodemailer');

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue(true) // Simulamos envío exitoso
    })
}));

describe('Endpoint de Contacto (Formulario web)', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Debe rechazar la petición con error 400 si faltan campos', async () => {
        const res = await request(app)
            .post('/api/contacto')
            .send({
                nombre: 'Juan Pérez',
                // Falta el correo
                asunto: 'Equivalencias',
                mensaje: 'Consulta de prueba'
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toMatch(/obligatorios/i);

        const transportMock = nodemailer.createTransport();
        expect(transportMock.sendMail).not.toHaveBeenCalled();
    });

    it('Debe rechazar la petición con error 400 si el asunto no es válido', async () => {
        const res = await request(app)
            .post('/api/contacto')
            .send({
                nombre: 'Usuario Hacker',
                correo: 'hacker@ejemplo.com',
                asunto: 'Quiero vender criptomonedas', // Asunto no incluido en el array
                mensaje: 'Este mensaje no debería enviarse.'
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toMatch(/no es válido/i);

        // Verificamos que Nodemailer haya sido bloqueado y no intente enviar el spam
        const transportMock = nodemailer.createTransport();
        expect(transportMock.sendMail).not.toHaveBeenCalled();
    });

    it('Debe procesar la petición con 200 y simular el envío del correo', async () => {
        const payloadContacto = {
            nombre: 'Juan Pérez',
            correo: 'juan.perez@ejemplo.com',
            asunto: 'Certificado de alumno regular', // Asunto Válido
            mensaje: 'Necesito mi certificado, por favor.'
        };

        const res = await request(app)
            .post('/api/contacto')
            .send(payloadContacto);

        expect(res.statusCode).toEqual(200);
        expect(res.body.mensaje).toMatch(/exitosamente/i);

        expect(nodemailer.createTransport).toHaveBeenCalled();
        const transportMock = nodemailer.createTransport();
        expect(transportMock.sendMail).toHaveBeenCalledTimes(1);

        const argumentosSendMail = transportMock.sendMail.mock.calls[0][0];
        expect(argumentosSendMail.to).toBeDefined();
        expect(argumentosSendMail.subject).toContain(payloadContacto.asunto);
    });
});