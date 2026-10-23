const router = require('express').Router();
const { verificarToken, verificarRol } = require('../middleware/auth-middleware');
const {
    obtenerProfesores,
    crearProfesor,
    actualizarProfesor,
    eliminarProfesor
} = require('../controllers/profesores-controller');

router.get('/', obtenerProfesores);
router.get('/:id', obtenerProfesores);
//router.use(verificarToken, verificarRol(['Administrador General', 'Gestión Académica']));
router.post('/', crearProfesor);
router.put('/:id', actualizarProfesor);
router.delete('/:id', eliminarProfesor);

module.exports = router;
