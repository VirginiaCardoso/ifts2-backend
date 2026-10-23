const express = require('express');
const router = express.Router();
const { obtenerMaterias } = require('../controllers/materias-controller');

router.get('/', obtenerMaterias);

module.exports = router;