const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const poolConection = pool.promisePool;

const login = async (req, res) => {
    const { correo, password } = req.body;

    try {
        // Buscar al usuario por correo
        const [users] = await poolConection.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const user = users[0];

        // Comparar la contraseña enviada con el hash guardado en DB
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Actualizar el último acceso
        await poolConection.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [user.id]);

        // Generar el JWT 
        const payload = {
            //incluye id y nivel_de_acceso para usar en middlewares
            id: user.id,
            nivel_de_acceso: user.nivel_de_acceso,
            correo: user.correo
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '8h'
        });

        res.json({
            mensaje: 'Login exitoso',
            token,
            usuario: {
                id: user.id,
                nombre: user.nombre_completo,
                rol_institucional: user.rol_institucional,
                nivel_de_acceso: user.nivel_de_acceso
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno en el servidor.' });
    }
};

module.exports = { login };