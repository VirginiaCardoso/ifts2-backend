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

const idValido = (id) => /^[1-9]\d*$/.test(id || '') && Number(id) <= 2147483647;
const roles = ['Administrador General', 'Gestión Académica'];
function validarUsuario(body, crear = false) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Los datos del usuario no son válidos.';
    const tiene = (campo) => crear || Object.hasOwn(body, campo);
    if (tiene('nombre_completo') && (typeof body.nombre_completo !== 'string' || !body.nombre_completo.trim() || body.nombre_completo.trim().length > 255)) return 'El nombre completo es obligatorio y admite hasta 255 caracteres.';
    if (Object.hasOwn(body, 'rol_institucional') && (typeof body.rol_institucional !== 'string' || !body.rol_institucional.trim() || body.rol_institucional.trim().length > 255)) return 'El rol institucional no puede estar vacío y admite hasta 255 caracteres.';
    if (tiene('nivel_de_acceso') && !roles.includes(body.nivel_de_acceso)) return 'Seleccioná un nivel de acceso válido.';
    if (tiene('correo') && (typeof body.correo !== 'string' || body.correo.trim().length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.correo.trim()))) return 'Ingresá un correo electrónico válido.';
    if (tiene('password') && (typeof body.password !== 'string' || !body.password.trim() || body.password.length < 8 || Buffer.byteLength(body.password, 'utf8') > 72)) return 'La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.';
    if (!crear && !['nombre_completo', 'rol_institucional', 'nivel_de_acceso', 'correo', 'password'].some((c) => Object.hasOwn(body, c))) return 'Indicá al menos un dato para actualizar.';
    return null;
}
function errorUsuario(res, error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El correo ya está registrado.' });
    console.error('Error al guardar usuario:', error);
    return res.status(500).json({ error: 'No se pudo guardar el usuario. Intentá nuevamente.' });
}
const crearUsuario = async (req, res) => {
    const validacion = validarUsuario(req.body, true);
    if (validacion) return res.status(400).json({ error: validacion });
    const { nombre_completo, rol_institucional, nivel_de_acceso, password } = req.body;
    const correo = req.body.correo.trim().toLowerCase();
    try {
        const [existentes] = await poolConection.query('SELECT id FROM usuarios WHERE LOWER(TRIM(correo)) = ?', [correo]);
        if (existentes.length) return res.status(409).json({ error: 'El correo ya está registrado.' });
        const password_hash = await bcrypt.hash(password, 10);
        const [result] = await poolConection.query(
            'INSERT INTO usuarios (nombre_completo, rol_institucional, nivel_de_acceso, correo, password_hash) VALUES (?, ?, ?, ?, ?)',
            [nombre_completo.trim(), rol_institucional?.trim() || null, nivel_de_acceso, correo, password_hash]
        );
        res.status(201).json({ mensaje: 'Usuario creado exitosamente', usuarioId: result.insertId });
    } catch (error) { errorUsuario(res, error); }
};
const actualizarUsuario = async (req, res) => {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ error: 'ID de usuario inválido.' });
    const validacion = validarUsuario(req.body);
    if (validacion) return res.status(400).json({ error: validacion });
    if (req.usuario.id === Number(id) &&
    req.body.nivel_de_acceso !== undefined &&
    req.body.nivel_de_acceso !== req.usuario.nivel_de_acceso) {
    return res.status(400).json({ error: 'No podés cambiar tu propio nivel de acceso.' });
}
    try {
        const [usuarios] = await poolConection.query('SELECT id FROM usuarios WHERE id = ?', [id]);
        if (!usuarios.length) return res.status(404).json({ error: 'Usuario no encontrado.' });
        const datos = {};
        for (const campo of ['nombre_completo', 'rol_institucional', 'nivel_de_acceso', 'correo']) {
            if (Object.hasOwn(req.body, campo)) datos[campo] = req.body[campo].trim();
        }
        if (datos.correo !== undefined) {
            datos.correo = datos.correo.toLowerCase();
            const [existentes] = await poolConection.query('SELECT id FROM usuarios WHERE LOWER(TRIM(correo)) = ? AND id <> ?', [datos.correo, id]);
            if (existentes.length) return res.status(409).json({ error: 'El correo ya está registrado.' });
        }
        if (req.body.password !== undefined) datos.password_hash = await bcrypt.hash(req.body.password, 10);
        // Solo actualizar los campos informados: los omitidos conservan su valor.
        await poolConection.query(`UPDATE usuarios SET ${Object.keys(datos).map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...Object.values(datos), id]);
        res.json({ mensaje: 'Usuario actualizado exitosamente' });
    } catch (error) { errorUsuario(res, error); }
};

const eliminarUsuario = async (req, res) => {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ error: 'ID de usuario inválido.' });

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

const cambiarPasswordUsuario = async (req, res) => {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ error: 'ID de usuario inválido.' });
    const { password } = req.body;

    try {
        if (typeof password !== 'string' || !password.trim() || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres y no superar 72 bytes.' });
        }

        // Verificar si el usuario existe
        const [user] = await poolConection.query('SELECT id FROM usuarios WHERE id = ?', [id]);
        if (user.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        // Encriptar la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Actualizar la contraseña en la base de datos
        await poolConection.query(
            'UPDATE usuarios SET password_hash = ? WHERE id = ?',
            [password_hash, id]
        );

        res.json({ mensaje: 'Contraseña restablecida exitosamente' });
    } catch (error) {
        console.error('Error al restablecer contraseña:', error);
        res.status(500).json({ error: 'Error interno del servidor al restablecer la contraseña' });
    }
};

module.exports = { obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario, cambiarPasswordUsuario };