const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

//Ruta de autenticación
const authRoutes = require('./routes/auth-routes');
// Rutas de gestión de usuarios
const usuariosRoutes = require('./routes/usuarios-routes');

const app = express();

// Middlewares
app.use(cors()); // Permite que el repositorio Front-End se comunique con este Back-End
app.use(express.json()); // Permite procesar datos en formato JSON

// Rutas de autenticación
app.use('/api/auth', authRoutes);
// Rutas de gestión de usuarios (Protegidas por rol Administrador general)
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/novedades', require('./routes/novedades-routes'));

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

