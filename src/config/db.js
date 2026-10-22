// Importamos la librería mysql2 y dotenv para leer las variables de entorno
const mysql = require('mysql2');
const path = require('path');
const dotenv = require('dotenv'); //require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Intentamos cargar el .env desde la raíz del proyecto o desde src/
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // Fallback estándar en cwd()

// Creamos el "pool" de conexiones usando las credenciales del archivo .env
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'sistema_academico',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10, // Número máximo de conexiones simultáneas
    queueLimit: 0
});

// Configuración de Seguridad y JWT
const JWT_SECRET = process.env.JWT_SECRET || 'ifts2_super_secreto_2026_jwt';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';


// Convertimos el pool para que soporte Promesas (async/await)
const promisePool = pool.promise();
// Permitimos que se pueda usar tanto "pool.query()" como "pool.promisePool.query()"
promisePool.promisePool = promisePool;
promisePool.JWT_SECRET = JWT_SECRET;
promisePool.JWT_EXPIRES_IN = JWT_EXPIRES_IN;

// Exportamos la conexión para poder usarla en otras partes del proyecto (como en los controllers)
module.exports = { promisePool, JWT_SECRET, JWT_EXPIRES_IN };