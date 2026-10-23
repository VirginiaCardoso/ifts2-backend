const express = require('express');
const router = express.Router();
const { 
    obtenerBedeles, 
    crearBedel, 
    actualizarBedel, 
    eliminarBedel 
} = require('../controllers/bedeles-controller');

router.get('/', obtenerBedeles);
router.post('/', crearBedel);
router.put('/:id', actualizarBedel);
router.delete('/:id', eliminarBedel);

module.exports = router;