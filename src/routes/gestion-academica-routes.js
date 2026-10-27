const { verificarToken, verificarRol } = require('../middleware/auth-middleware');
const { mesas, horarios } = require('../controllers/gestion-academica-controller');
function rutas(controlador) {
    const router = require('express').Router();
    router.get('/', controlador.obtener);
    router.get('/:id', controlador.obtener);
    router.use(verificarToken, verificarRol(['Administrador General', 'Gestión Académica']));
    router.post('/', controlador.guardar);
    router.put('/:id', controlador.guardar);
    router.delete('/:id', controlador.eliminar);
    return router;
}
module.exports = { mesasRoutes: rutas(mesas), horariosRoutes: rutas(horarios) };
