const router = require('express').Router();
const { verificarToken, verificarRol } = require('../middleware/auth-middleware');
const { obtenerNovedades, guardarNovedad, eliminarNovedad } = require('../controllers/novedades-controller');

router.get('/', obtenerNovedades);
router.get('/:id', obtenerNovedades);
router.use(verificarToken, verificarRol(['Administrador General']));
router.post('/', guardarNovedad);
router.put('/:id', guardarNovedad);
router.delete('/:id', eliminarNovedad);

module.exports = router;
