const router = require('express').Router();
const { verificarToken, verificarRol } = require('../middleware/auth-middleware');
const { uploadPdf } = require('../middleware/upload-middleware');
const {
    obtenerDocumentoIngresantes,
    subirDocumentoIngresantes,
    descargarDocumentoIngresantes
} = require('../controllers/documentos-controller');

router.get('/ingresantes', obtenerDocumentoIngresantes);
router.get('/ingresantes/descargar', descargarDocumentoIngresantes);

router.post('/ingresantes',
    verificarToken,
    verificarRol(['Administrador General', 'Gestión Académica']),
    uploadPdf.single('documento'),
    subirDocumentoIngresantes
);

module.exports = router;