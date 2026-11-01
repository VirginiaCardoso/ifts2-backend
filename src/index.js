const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');


//Ruta de autenticación
const authRoutes = require('./routes/auth-routes');
// Rutas de gestión de usuarios
const usuariosRoutes = require('./routes/usuarios-routes');
const novedadesRoutes = require('./routes/novedades-routes');
const profesoresRoutes = require('./routes/profesores-routes');
const materiasRoutes = require('./routes/materias-routes');
const bedelesRoutes = require('./routes/bedeles-routes');
const autoridadesRoutes = require('./routes/autoridades-routes');
const ingresantesRoutes = require('./routes/ingresantes-routes');
const enlacesExternos = require('./routes/enlacesRoutes')


const app = express();

// Middlewares
app.use(cors()); // Permite que el repositorio Front-End se comunique con este Back-End
app.use(express.json()); // Permite procesar datos en formato JSON
app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (req.body === undefined) req.body = {};
        if (req.body === null || Array.isArray(req.body) || typeof req.body !== 'object') return res.status(400).json({ error: 'Enviá un objeto con los datos del formulario.' });
    }
    next();
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);
// Rutas de gestión de usuarios (Protegidas por rol Administrador general)
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/novedades', novedadesRoutes);
app.use('/api/profesores', profesoresRoutes);
app.use('/api/materias', materiasRoutes);
app.use('/api/carrera', require('./routes/carrera-routes'));
app.use('/api/bedeles', bedelesRoutes);
app.use('/api/autoridades', autoridadesRoutes);
app.use('/api/ingresantes', ingresantesRoutes);
app.use('/api/tramites', require('./routes/tramites-routes'));
const { mesasRoutes, horariosRoutes } = require('./routes/gestion-academica-routes');
app.use('/api/mesas-examenes', mesasRoutes);
app.use('/api/horarios-cursada', horariosRoutes);
app.use('/api/enlaces-externos', enlacesExternos)
app.use('/api/documentos', require('./routes/documentos-routes'));
// Registrar las rutas de documentos
app.use('/api/documentos', require('./routes/documentos-routes'));
// Acceso público a los archivos subidos (ej: PDFs)
app.use(express.static(path.join(__dirname, 'public')));
//Ruta de contacto (formulario de contacto)
app.use('/api/contacto', require('./routes/contacto-routes'))

// Ruta raíz para verificar que el servidor está vivo
app.get('/', (req, res) => {
    res.send('API del IFTS N°2 funcionando correctamente.');
});


// Evitar respuestas HTML o detalles internos ante errores de formato y de carga.
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El JSON enviado no es válido. Revisá el formato de los datos.' });
    if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'El archivo o los datos superan el tamaño permitido.' });
    if (err.name === 'MulterError' || err.message === 'Solo se permiten archivos PDF.') return res.status(400).json({ error: 'Seleccioná un único archivo PDF de hasta 10 MB en el campo documento.' });
    console.error('Error de la aplicación:', err);
    res.status(500).json({ error: 'No se pudo completar la operación. Intentá nuevamente.' });
});

// Configuración del puerto
const PORT = process.env.PORT || 3000;

// Levantar el servidor

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor Back-End corriendo en http://localhost:${PORT}`);
    });
}

module.exports = app;

