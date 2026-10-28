
const { promisePool } = require('../config/db');

// GET /api/ingresantes
// GET /api/ingresantes/:id
const obtenerIngresantes = async (req, res) => {
    try {
        const { id } = req.params;

        if (id !== undefined) {
            if (!/^\d+$/.test(id) || Number(id) < 1) {
                return res.status(400).json({
                    mensaje: 'El ID del ingresante no es válido.'
                });
            }

            const [filas] = await promisePool.execute(
                'SELECT * FROM ingresantes WHERE id = ?',
                [id]
            );

            if (filas.length === 0) {
                return res.status(404).json({
                    mensaje: 'No se encontró el ingresante.'
                });
            }

            return res.json(filas[0]);
        }

        const [filas] = await promisePool.execute(
            'SELECT * FROM ingresantes ORDER BY fecha_inscripcion DESC, id DESC'
        );

        return res.json(filas);
    } catch (error) {
        console.error('Error al obtener ingresantes:', error);

        return res.status(500).json({
            mensaje: 'Error al consultar los ingresantes.'
        });
    }
};

// POST /api/ingresantes
const crearIngresante = async (req, res) => {
    try {
        const {
            nombre,
            apellido,
            dni,
            correo,
            telefono,
            fecha_inscripcion,
            estado
        } = req.body;

        if (
            !nombre?.trim() ||
            !apellido?.trim() ||
            !dni?.trim() ||
            !correo?.trim() ||
            !fecha_inscripcion
        ) {
            return res.status(400).json({
                mensaje: 'Completá nombre, apellido, DNI, correo y fecha de inscripción.'
            });
        }

        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());

        if (!emailValido) {
            return res.status(400).json({
                mensaje: 'El correo electrónico no tiene un formato válido.'
            });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_inscripcion)) {
            return res.status(400).json({
                mensaje: 'La fecha debe tener el formato AAAA-MM-DD.'
            });
        }

        const fecha = new Date(`${fecha_inscripcion}T00:00:00Z`);

        if (
            Number.isNaN(fecha.getTime()) ||
            fecha.toISOString().slice(0, 10) !== fecha_inscripcion
        ) {
            return res.status(400).json({
                mensaje: 'La fecha de inscripción no es válida.'
            });
        }

        const estadosValidos = [
            'Pendiente',
            'En revisión',
            'Confirmada'
        ];

        const estadoFinal = estado || 'Pendiente';

        if (!estadosValidos.includes(estadoFinal)) {
            return res.status(400).json({
                mensaje: 'El estado seleccionado no es válido.'
            });
        }

        const [resultado] = await promisePool.execute(
            `INSERT INTO ingresantes
                (nombre, apellido, dni, correo, telefono, fecha_inscripcion, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre.trim(),
                apellido.trim(),
                dni.trim(),
                correo.trim(),
                telefono?.trim() || null,
                fecha_inscripcion,
                estadoFinal
            ]
        );

        const [filas] = await promisePool.execute(
            'SELECT * FROM ingresantes WHERE id = ?',
            [resultado.insertId]
        );

        return res.status(201).json({
            mensaje: 'Ingresante registrado correctamente.',
            ingresante: filas[0]
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                mensaje: 'Ya existe un ingresante registrado con ese DNI.'
            });
        }

        console.error('Error al crear ingresante:', error);

        return res.status(500).json({
            mensaje: 'Error al registrar el ingresante.'
        });
    }
};

// PUT /api/ingresantes/:id
const actualizarIngresante = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            apellido,
            dni,
            correo,
            telefono,
            fecha_inscripcion,
            estado
        } = req.body;

        if (!/^\d+$/.test(id) || Number(id) < 1) {
            return res.status(400).json({
                mensaje: 'El ID del ingresante no es válido.'
            });
        }

        if (
            !nombre?.trim() ||
            !apellido?.trim() ||
            !dni?.trim() ||
            !correo?.trim() ||
            !fecha_inscripcion
        ) {
            return res.status(400).json({
                mensaje: 'Completá nombre, apellido, DNI, correo y fecha de inscripción.'
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
            return res.status(400).json({
                mensaje: 'El correo electrónico no tiene un formato válido.'
            });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_inscripcion)) {
            return res.status(400).json({
                mensaje: 'La fecha debe tener el formato AAAA-MM-DD.'
            });
        }

        const fecha = new Date(`${fecha_inscripcion}T00:00:00Z`);

        if (
            Number.isNaN(fecha.getTime()) ||
            fecha.toISOString().slice(0, 10) !== fecha_inscripcion
        ) {
            return res.status(400).json({
                mensaje: 'La fecha de inscripción no es válida.'
            });
        }

        const estadosValidos = [
            'Pendiente',
            'En revisión',
            'Confirmada'
        ];

        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                mensaje: 'El estado seleccionado no es válido.'
            });
        }

        const [resultado] = await promisePool.execute(
            `UPDATE ingresantes
             SET nombre = ?, apellido = ?, dni = ?, correo = ?,
                 telefono = ?, fecha_inscripcion = ?, estado = ?
             WHERE id = ?`,
            [
                nombre.trim(),
                apellido.trim(),
                dni.trim(),
                correo.trim(),
                telefono?.trim() || null,
                fecha_inscripcion,
                estado,
                id
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: 'No se encontró el ingresante.'
            });
        }

        const [filas] = await promisePool.execute(
            'SELECT * FROM ingresantes WHERE id = ?',
            [id]
        );

        return res.json({
            mensaje: 'Ingresante actualizado correctamente.',
            ingresante: filas[0]
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                mensaje: 'Ya existe otro ingresante registrado con ese DNI.'
            });
        }

        console.error('Error al actualizar ingresante:', error);

        return res.status(500).json({
            mensaje: 'Error al actualizar el ingresante.'
        });
    }
};

// DELETE /api/ingresantes/:id
const eliminarIngresante = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id) || Number(id) < 1) {
            return res.status(400).json({
                mensaje: 'El ID del ingresante no es válido.'
            });
        }

        const [resultado] = await promisePool.execute(
            'DELETE FROM ingresantes WHERE id = ?',
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: 'No se encontró el ingresante.'
            });
        }

        return res.json({
            mensaje: 'Ingresante eliminado correctamente.'
        });
    } catch (error) {
        console.error('Error al eliminar ingresante:', error);

        return res.status(500).json({
            mensaje: 'Error al eliminar el ingresante.'
        });
    }
};

module.exports = {
    obtenerIngresantes,
    crearIngresante,
    actualizarIngresante,
    eliminarIngresante
};
