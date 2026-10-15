const jwt = require('jsonwebtoken');

// Middleware para verificar si el usuario está autenticado
const verificarToken = (req, res, next) => {
    // token del header 'Authorization: Bearer <token>'
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};

// Middleware para autorizar según el nivel de acceso
const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(500).json({ error: 'Error interno: No se verificó el token antes del rol.' });
        }

        // Validamos si el nivel de acceso del usuario está en el array de roles permitidos
        if (!rolesPermitidos.includes(req.usuario.nivel_de_acceso)) {
            return res.status(403).json({
                error: 'No tienes los permisos necesarios para esta acción.'
            });
        }
        next();
    };
};

module.exports = { verificarToken, verificarRol };