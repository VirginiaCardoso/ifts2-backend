const express = require('express');
const router = express.Router();
const { login } = require('../controllers/auth-controller');

// Rutas públicas
router.post('/login', login);


module.exports = router;