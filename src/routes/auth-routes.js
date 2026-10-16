const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth-middleware');
const { login, cambiarPassword } = require('../controllers/auth-controller');

// Rutas públicas
router.post('/login', login);
//Cambio de contraseña para el usuario logueado y autenticado
router.put('/cambiar-password', verificarToken, cambiarPassword);

module.exports = router;