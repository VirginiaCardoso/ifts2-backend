const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de almacenamiento local
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../public/uploads/documentos');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Genera un nombre único para evitar sobrescrituras accidentales en el disco
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'ingresantes-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadPdf = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF.'));
        }
    }
});

module.exports = { uploadPdf };