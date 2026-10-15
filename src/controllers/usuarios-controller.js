const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const poolConection = pool.promisePool;

//Todas funciones solo para el rol "Administrador general"
const obtenerUsuarios = async (req, res) => {
    try {
        const [usuarios] = await poolConection.query(
            'SELECT id, nombre_completo, rol_institucional, nivel_de_acceso, correo, ultimo_acceso, created_at FROM usuarios'
        );
        res.json(usuarios);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const crearUsuario = async (req, res) => {
    const { nombre_completo, rol_institucional, nivel_de_acceso, correo, password } = req.body;

    try {
        // Verificar si el usuario ya existe
        const [existingUser] = await poolConection.query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado.' });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insertar el nuevo usuario
        const [result] = await poolConection.query(
            `INSERT INTO usuarios (nombre_completo, rol_institucional, nivel_de_acceso, correo, password_hash) 
             VALUES (?, ?, ?, ?, ?)`,
            [nombre_completo, rol_institucional, nivel_de_acceso, correo, password_hash]
        );

        res.status(201).json({
            mensaje: 'Usuario creado exitosamente',
            usuarioId: result.insertId
        });

    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ error: 'Error al registrar el usuario.' });
    }
};

const actualizarUsuario = async (req, res) => {
    const { id } = req.params;
    const { nombre_completo, rol_institucional, nivel_de_acceso, correo, password } = req.body;

    try {
        // Verificar si el usuario existe
        const [user] = await poolConection.query('SELECT id FROM usuarios WHERE id = ?', [id]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        // Si se envía una nueva contraseña se actualiza
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            await poolConection.query(
                `UPDATE usuarios SET nombre_completo=?, rol_institucional=?, nivel_de_acceso=?, correo=?, password_hash=? WHERE id=?`,
                [nombre_completo, rol_institucional, nivel_de_acceso, correo, password_hash, id]
            );
        } else {
            // Si no se envía contraseña, actualizamos los demás datos
            await poolConection.query(
                `UPDATE usuarios SET nombre_completo=?, rol_institucional=?, nivel_de_acceso=?, correo=? WHERE id=?`,
                [nombre_completo, rol_institucional, nivel_de_acceso, correo, id]
            );
        }

        res.json({ mensaje: 'Usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar usuario' });
    }
};

const eliminarUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        // Evitar que el administrador se elimine a sí mismo por error
        if (req.usuario.id === parseInt(id)) {
            return res.status(400).json({ error: 'No puedes eliminar tu propio usuario en sesión.' });
        }

        const [result] = await poolConection.query('DELETE FROM usuarios WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        res.json({ mensaje: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'No se puede eliminar el usuario porque tiene registros asociados en el sistema.' });
        }
        res.status(500).json({ error: 'Error interno del servidor al eliminar usuario' });
    }
};

module.exports = { obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario };