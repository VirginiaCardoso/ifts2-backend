const { promisePool } = require('../config/db');
const path = require('path');
const fs = require('fs');

const obtenerDocumentoIngresantes = async (req, res) => {
    try {
        const [rows] = await promisePool.execute(
            "SELECT * FROM documentos WHERE tipo = 'ingresantes' AND activo = 1 ORDER BY id DESC LIMIT 1"
        );
        if (rows.length === 0) return res.json(null);
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener el documento:', error);
        res.status(500).json({ mensaje: 'Error al consultar el documento.' });
    }
};

const subirDocumentoIngresantes = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ mensaje: 'No se adjuntó ningún archivo PDF.' });
        }

        const url_archivo = `/uploads/documentos/${req.file.filename}`;
        const nombre = req.file.originalname;
        const usuario_id = req.usuario ? req.usuario.id : null;

        // Buscamos si ya existe un documento de ingresantes
        const [existente] = await promisePool.execute(
            "SELECT id, url_archivo FROM documentos WHERE tipo = 'ingresantes'"
        );

        if (existente.length > 0) {
            // Eliminamos el archivo físico anterior para no ocupar espacio basura
            const oldPath = path.join(__dirname, '../public', existente[0].url_archivo);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

            // Actualizamos el registro existente en la base de datos
            await promisePool.execute(
                `UPDATE documentos 
         SET nombre = ?, url_archivo = ?, updated_at = CURRENT_TIMESTAMP, usuario_id = ? 
         WHERE id = ?`,
                [nombre, url_archivo, usuario_id, existente[0].id]
            );
        } else {
            // Insertamos uno nuevo si no existía
            await promisePool.execute(
                `INSERT INTO documentos (nombre, tipo, descripcion, url_archivo, activo, usuario_id) 
         VALUES (?, 'ingresantes', 'Información para aspirantes', ?, 1, ?)`,
                [nombre, url_archivo, usuario_id]
            );
        }

        res.status(200).json({
            mensaje: 'PDF actualizado correctamente',
            documento: { nombre, url_archivo }
        });
    } catch (error) {
        console.error('Error al subir PDF:', error);
        res.status(500).json({ mensaje: 'Error interno al guardar el archivo.' });
    }
};

const descargarDocumentoIngresantes = async (req, res) => {
    try {
        const [rows] = await promisePool.execute(
            "SELECT * FROM documentos WHERE tipo = 'ingresantes' AND activo = 1 ORDER BY id DESC LIMIT 1"
        );

        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'No hay documento disponible.' });
        }

        const documento = rows[0];
        // Construimos la ruta absoluta al archivo físico
        const filePath = path.join(__dirname, '../public', documento.url_archivo);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ mensaje: 'El archivo físico no existe en el servidor.' });
        }

        res.download(filePath, documento.nombre || 'Documento_Ingresantes.pdf');
    } catch (error) {
        console.error('Error al descargar el documento:', error);
        res.status(500).json({ mensaje: 'Error interno al intentar descargar.' });
    }
};

module.exports = {
    obtenerDocumentoIngresantes,
    subirDocumentoIngresantes,
    descargarDocumentoIngresantes
};