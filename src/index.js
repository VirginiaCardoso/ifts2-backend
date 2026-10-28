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

const app = express();

// Middlewares
app.use(cors()); // Permite que el repositorio Front-End se comunique con este Back-End
app.use(express.json()); // Permite procesar datos en formato JSON

// Rutas de autenticación
app.use('/api/auth', authRoutes);
// Rutas de gestión de usuarios (Protegidas por rol Administrador general)
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/novedades', novedadesRoutes);
app.use('/api/profesores', profesoresRoutes);
app.use('/api/materias', materiasRoutes);
app.use('/api/bedeles', bedelesRoutes);
app.use('/api/autoridades', autoridadesRoutes);
app.use('/api/ingresantes', ingresantesRoutes);
app.use('/api/tramites', require('./routes/tramites-routes'));
const { mesasRoutes, horariosRoutes } = require('./routes/gestion-academica-routes');
app.use('/api/mesas-examenes', mesasRoutes);
app.use('/api/horarios-cursada', horariosRoutes);
//Ruta de contacto (formulario de contacto)
app.use('/api/contacto', require('./routes/contacto-routes'))

// Ruta raíz para verificar que el servidor está vivo
app.get('/', (req, res) => {
    res.send('API del IFTS N°2 funcionando correctamente.');
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

