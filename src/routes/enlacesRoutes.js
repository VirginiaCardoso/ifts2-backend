const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/auth-middleware');
const { obtenerEnlaces, actualizarEnlace } = require('../controllers/enlaces-controller');

router.get('/', obtenerEnlaces);
router.use(verificarToken, verificarRol(['Administrador General']));
router.put('/:id',actualizarEnlace);

module.exports = router;