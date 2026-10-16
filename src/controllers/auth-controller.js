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

//Cambio de contraseña para el usuario logueado y autenticado
const cambiarPassword = async (req, res) => {
    // Obtenemos el ID del token JWT para asegurar que solo modifique su propia cuenta
    const usuarioId = req.usuario.id;
    const { password_actual, nueva_password } = req.body;

    // Validaciones
    if (!password_actual || !nueva_password) {
        return res.status(400).json({ error: 'Debes proporcionar la contraseña actual y la nueva contraseña.' });
    }

    if (nueva_password.length < 8) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }

    try {
        const poolConection = pool.promisePool || pool;

        // Obtener el hash actual del usuario desde la BD
        const [usuarios] = await poolConection.query(
            'SELECT password_hash FROM usuarios WHERE id = ?',
            [usuarioId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const user = usuarios[0];

        // Verificar que la Contraseña actual sea correcta
        const isMatch = await bcrypt.compare(password_actual, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        }

        // Hashear la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const nuevoHash = await bcrypt.hash(nueva_password, salt);

        // Actualizar la contraseña en la base de datos
        await poolConection.query(
            'UPDATE usuarios SET password_hash = ? WHERE id = ?',
            [nuevoHash, usuarioId]
        );

        res.status(200).json({ mensaje: 'Contraseña actualizada exitosamente.' });

    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar el cambio de contraseña.' });
    }
};

module.exports = { login, cambiarPassword };