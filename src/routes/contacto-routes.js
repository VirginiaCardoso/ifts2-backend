const express = require('express');
const router = express.Router();
const { enviarConsulta } = require('../controllers/contacto-controller');

// Ruta pública para enviar mensajes desde el formulario de contacto
router.post('/', enviarConsulta);

module.exports = router;