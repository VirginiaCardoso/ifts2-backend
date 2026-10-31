
const { promisePool } = require('../config/db');

const obtenerIngresantes = async (req, res) => {
  try {
    const { id } = req.params;

    if (id !== undefined) {
      if (!/^\d+$/.test(id) || Number(id) < 1) {
        return res.status(400).json({
          mensaje: 'El ID de la etapa no es válido.',
        });
      }

      const [filas] = await promisePool.execute(
        'SELECT * FROM etapas_ingreso WHERE id_etapa = ?',
        [id]
      );

      if (filas.length === 0) {
        return res.status(404).json({
          mensaje: 'No se encontró la etapa de ingreso.',
        });
      }

      return res.json(filas[0]);
    }

    const [filas] = await promisePool.execute(
      `SELECT * FROM etapas_ingreso
       ORDER BY id_etapa ASC`
    );

    return res.json(filas);
  } catch (error) {
    console.error('Error al obtener etapas de ingreso:', error);

    return res.status(500).json({
      mensaje: 'Error al consultar las etapas de ingreso.',
    });
  }
};

const validarEtapa = (datos) => {
  const {
    anio,
    nombre,
    fecha_inicio,
    fecha_fin,
  } = datos;

  if (
    anio === undefined ||
    !Number.isInteger(Number(anio)) ||
    Number(anio) < 2000 ||
    Number(anio) > 2100
  ) {
    return 'Ingresá un año válido entre 2000 y 2100.';
  }

  if (!nombre || !nombre.trim()) {
    return 'El nombre de la etapa es obligatorio.';
  }

  const validarFecha = (valor) => {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return false;
    }

    const fecha = new Date(`${valor}T00:00:00Z`);

    return (
      !Number.isNaN(fecha.getTime()) &&
      fecha.toISOString().slice(0, 10) === valor
    );
  };

  const fechaInicioInformada = fecha_inicio !== undefined &&
    fecha_inicio !== null && fecha_inicio !== '';
  const fechaFinInformada = fecha_fin !== undefined &&
    fecha_fin !== null && fecha_fin !== '';

  if (
    (fechaInicioInformada && !validarFecha(fecha_inicio)) ||
    (fechaFinInformada && !validarFecha(fecha_fin))
  ) {
    return 'Ingresá fechas válidas en formato AAAA-MM-DD.';
  }

  if (
    fechaInicioInformada &&
    fechaFinInformada &&
    fecha_fin < fecha_inicio
  ) {
    return 'La fecha de finalización no puede ser anterior a la de inicio.';
  }

  if (
    datos.orden !== undefined &&
    datos.orden !== null &&
    datos.orden !== '' &&
    (!Number.isInteger(Number(datos.orden)) || Number(datos.orden) < 0)
  ) {
    return 'El orden debe ser un número entero igual o mayor que cero.';
  }

  if (
    datos.activo !== undefined &&
    ![true, false, 1, 0, '1', '0'].includes(datos.activo)
  ) {
    return 'El estado de actividad no es válido.';
  }

  return null;
};

const crearIngresante = async (req, res) => {
  try {
    const {
      anio,
      nombre,
      descripcion,
      fecha_inicio,
      fecha_fin,
      requisitos,
      orden,
      activo,
    } = req.body;

    const errorValidacion = validarEtapa(req.body);

    if (errorValidacion) {
      return res.status(400).json({ mensaje: errorValidacion });
    }

    const [resultado] = await promisePool.execute(
      `INSERT INTO etapas_ingreso
        (anio, nombre, descripcion, fecha_inicio, fecha_fin,
         requisitos, orden, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(anio),
        nombre.trim(),
        descripcion?.trim() || null,
        fecha_inicio || null,
        fecha_fin || null,
        requisitos?.trim() || null,
        orden === '' || orden === undefined || orden === null
          ? null
          : Number(orden),
        activo === undefined ? 1 : Number(Boolean(
          activo === true || activo === 1 ||
          activo === '1' || activo === 'true'
        )),
      ]
    );

    const [filas] = await promisePool.execute(
      'SELECT * FROM etapas_ingreso WHERE id_etapa = ?',
      [resultado.insertId]
    );

    return res.status(201).json({
      mensaje: 'Etapa de ingreso creada correctamente.',
      etapa: filas[0],
    });
  } catch (error) {
    console.error('Error al crear etapa de ingreso:', error);

    return res.status(500).json({
      mensaje: 'Error al crear la etapa de ingreso.',
    });
  }
};

const actualizarIngresante = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id) || Number(id) < 1) {
      return res.status(400).json({
        mensaje: 'El ID de la etapa no es válido.',
      });
    }

    const errorValidacion = validarEtapa(req.body);

    if (errorValidacion) {
      return res.status(400).json({ mensaje: errorValidacion });
    }

    const {
      anio,
      nombre,
      descripcion,
      fecha_inicio,
      fecha_fin,
      requisitos,
      orden,
      activo,
    } = req.body;

    const [resultado] = await promisePool.execute(
      `UPDATE etapas_ingreso
       SET anio = ?, nombre = ?, descripcion = ?,
           fecha_inicio = ?, fecha_fin = ?, requisitos = ?,
           orden = ?, activo = ?
       WHERE id_etapa = ?`,
      [
        Number(anio),
        nombre.trim(),
        descripcion?.trim() || null,
        fecha_inicio || null,
        fecha_fin || null,
        requisitos?.trim() || null,
        orden === '' || orden === undefined || orden === null
          ? null
          : Number(orden),
        activo === undefined ? 1 : Number(
          activo === true || activo === 1 ||
          activo === '1' || activo === 'true'
        ),
        id,
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró la etapa de ingreso.',
      });
    }

    const [filas] = await promisePool.execute(
      'SELECT * FROM etapas_ingreso WHERE id_etapa = ?',
      [id]
    );

    return res.json({
      mensaje: 'Etapa de ingreso actualizada correctamente.',
      etapa: filas[0],
    });
  } catch (error) {
    console.error('Error al actualizar etapa de ingreso:', error);

    return res.status(500).json({
      mensaje: 'Error al actualizar la etapa de ingreso.',
    });
  }
};

const eliminarIngresante = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id) || Number(id) < 1) {
      return res.status(400).json({
        mensaje: 'El ID de la etapa no es válido.',
      });
    }

    const [resultado] = await promisePool.execute(
      'DELETE FROM etapas_ingreso WHERE id_etapa = ?',
      [id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'No se encontró la etapa de ingreso.',
      });
    }

    return res.json({
      mensaje: 'Etapa de ingreso eliminada correctamente.',
    });
  } catch (error) {
    console.error('Error al eliminar etapa de ingreso:', error);

    return res.status(500).json({
      mensaje: 'Error al eliminar la etapa de ingreso.',
    });
  }
};

module.exports = {
  obtenerIngresantes,
  crearIngresante,
  actualizarIngresante,
  eliminarIngresante,
};
