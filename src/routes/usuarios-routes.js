const express = require('express');
const router = express.Router();
const {
    obtenerUsuarios,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    cambiarPasswordUsuario
} = require('../controllers/usuarios-controller');
const { verificarToken, verificarRol } = require('../middleware/auth-middleware');

// Aplicamos middlewares a todas las rutas de este archivo
// Verificamos que esté logueado
router.use(verificarToken);

// Verificamos que sea exclusivamente rol Administrador general
router.use(verificarRol(['Administrador General']));

// Definición del CRUD
router.get('/', obtenerUsuarios);           
router.post('/', crearUsuario);             
router.put('/:id', actualizarUsuario);      
router.delete('/:id', eliminarUsuario);  
router.put('/:id/password', cambiarPasswordUsuario);

module.exports = router;