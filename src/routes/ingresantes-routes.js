
const router = require('express').Router();

const {
  verificarToken,
  verificarRol,
} = require('../middleware/auth-middleware');

const {
  obtenerIngresantes,
  crearIngresante,
  actualizarIngresante,
  eliminarIngresante,
} = require('../controllers/ingresantes-controller');

// Consultar etapas
router.get('/', obtenerIngresantes);
router.get('/:id', obtenerIngresantes);

// Proteger las operaciones de escritura
router.use(
  verificarToken,
  verificarRol(['Administrador General', 'Gestión Académica'])
);

router.post('/', crearIngresante);
router.put('/:id', actualizarIngresante);
router.delete('/:id', eliminarIngresante);

module.exports = router;
