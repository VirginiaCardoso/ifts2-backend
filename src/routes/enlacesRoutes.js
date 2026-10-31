const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/auth-middleware');
const { obtenerEnlaces, actualizarEnlace } = require('../controllers/enlaces-controller');

router.use(verificarToken, verificarRol(['Administrador General']));

router.get('/', obtenerEnlaces);
router.put('/:id',actualizarEnlace);

module.exports = router;