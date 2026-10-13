// Importamos la librería mysql2 y dotenv para leer las variables de entorno
const mysql = require('mysql2');
require('dotenv').config();

// Creamos el "pool" de conexiones usando las credenciales del archivo .env
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10, // Número máximo de conexiones simultáneas
    queueLimit: 0
});

// Convertimos el pool para que soporte Promesas (async/await)
const promisePool = pool.promise();

// Exportamos la conexión para poder usarla en otras partes del proyecto (como en los controllers)
module.exports = promisePool;