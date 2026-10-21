const nodemailer = require('nodemailer');

const enviarConsulta = async (req, res) => {
    const { nombre, correo, asunto, mensaje } = req.body;

    if (!nombre || !correo || !asunto || !mensaje) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    const asuntosValidos = [
        'Certificado de alumno regular',
        'Analítico parcial',
        'Rendición en carácter Libre',
        'Equivalencias',
        'Consulta sobre inscripción 2027',
        'Becas PROGRESAR',
        'Otro'
    ];

    if (!asuntosValidos.includes(asunto)) {
        return res.status(400).json({ error: 'El asunto seleccionado no es válido.' });
    }

    try {
        // Determinar el entorno para cambiarlo entre desarrollo y producción
        const isProduction = process.env.NODE_ENV === 'production';

        // Asignar las variables correctas según el entorno
        const host = isProduction ? process.env.PROD_EMAIL_HOST : process.env.DEV_EMAIL_HOST;
        const port = isProduction ? process.env.PROD_EMAIL_PORT : process.env.DEV_EMAIL_PORT;
        const user = isProduction ? process.env.PROD_EMAIL_USER : process.env.DEV_EMAIL_USER;
        const pass = isProduction ? process.env.PROD_EMAIL_PASS : process.env.DEV_EMAIL_PASS;
        const receiver = isProduction ? process.env.PROD_EMAIL_RECEIVER : process.env.DEV_EMAIL_RECEIVER;

        const transporter = nodemailer.createTransport({
            host: host,
            port: Number(port),
            secure: Number(port) === 465, // True para puerto 465 (SSL), false para el resto
            auth: { user, pass }
        });

        const mailOptions = {
            from: `"${nombre}" <${correo}>`,
            to: receiver,
            replyTo: correo,
            subject: `Consulta Web: ${asunto}${isProduction ? '' : ' [TESTING]'}`,
            html: `
                <h3>Nueva consulta desde el sitio web</h3>
                <p><strong>Alumno:</strong> ${nombre}</p>
                <p><strong>Email de contacto:</strong> ${correo}</p>
                <p><strong>Asunto:</strong> ${asunto}</p>
                <hr>
                <p>${mensaje}</p>
                ${isProduction ? '' : '<p style="color:red; font-size:12px;">Este es un correo de prueba en entorno de desarrollo.</p>'}
            `
        };

        await transporter.sendMail(mailOptions);

        console.log(`Correo enviado a: ${receiver} (Entorno: ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'})`);

        res.status(200).json({ mensaje: 'Consulta enviada exitosamente.' });

    } catch (error) {
        console.error('Error al enviar correo:', error);
        res.status(500).json({ error: 'Error interno al procesar el mensaje.' });
    }
};

module.exports = { enviarConsulta };