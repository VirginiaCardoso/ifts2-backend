const express = require('express');
const router = express.Router();
const { obtenerEnlaces, actualizarEnlace } = require('../controllers/enlaces-controller');

router.get('/', obtenerEnlaces);
router.put('/:id',actualizarEnlace);

module.exports = router;