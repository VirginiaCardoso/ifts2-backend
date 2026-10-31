// src/routes/autoridades.routes.js
const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/auth-middleware');
const {
    obtenerAutoridades,
    crearAutoridad,
    actualizarAutoridad,
    eliminarAutoridad
} = require('../controllers/autoridades-controller');

router.get('/', obtenerAutoridades);
router.use(verificarToken, verificarRol(['Administrador General']));
router.post('/', crearAutoridad);
router.put('/:id', actualizarAutoridad);
router.delete('/:id', eliminarAutoridad);

module.exports = router;