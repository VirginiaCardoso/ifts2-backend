const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/auth-middleware');
const { 
    obtenerBedeles, 
    crearBedel, 
    actualizarBedel, 
    eliminarBedel 
} = require('../controllers/bedeles-controller');

router.use(verificarToken, verificarRol(['Administrador General']));

router.get('/', obtenerBedeles);
router.post('/', crearBedel);
router.put('/:id', actualizarBedel);
router.delete('/:id', eliminarBedel);

module.exports = router;