
const { validarEtapa } = require('../controllers/ingresantes-controller');

describe('Pruebas unitarias - Módulo Ingresantes', () => {

  const etapaValida = {
    anio: 2026,
    nombre: 'Preinscripción',
    descripcion: 'Inscripción de nuevos ingresantes',
    fecha_inicio: '2026-11-01',
    fecha_fin: '2026-11-30',
    requisitos: 'Documentación personal',
    orden: 1,
    activo: 1,
  };

  // PRUEBA 1: Validación de campos obligatorios
  describe('Validación de campos obligatorios', () => {

    test('Debe rechazar una etapa sin nombre', () => {
      const resultado = validarEtapa({
        ...etapaValida,
        nombre: '',
      });

      expect(resultado).toBe('El nombre de la etapa es obligatorio y admite hasta 255 caracteres.');
    });
   

  });

  // PRUEBA 2: Validación de fechas
  describe('Validación de fechas', () => {

    test('Debe aceptar una etapa con fechas válidas', () => {
      const resultado = validarEtapa(etapaValida);

      expect(resultado).toBeNull();
    });

        test('Debe aceptar una etapa sin fechas', () => {
      const resultado = validarEtapa({
        ...etapaValida,
        fecha_inicio: '',
        fecha_fin: '',
      });

      expect(resultado).toBeNull();
    });


    test('Debe rechazar una fecha inexistente', () => {
      const resultado = validarEtapa({
        ...etapaValida,
        fecha_inicio: '2026-02-30',
      });

      expect(resultado).toBe(
        'Ingresá fechas válidas en formato AAAA-MM-DD.'
      );
    });

    test('Debe rechazar una fecha de finalización anterior al inicio', () => {
      const resultado = validarEtapa({
        ...etapaValida,
        fecha_inicio: '2026-11-20',
        fecha_fin: '2026-11-10',
      });

      expect(resultado).toBe(
        'La fecha de finalización no puede ser anterior a la de inicio.'
      );
    });

  });

  // PRUEBA 3: Validación de datos complementarios
  describe('Validación de datos complementarios', () => {

    test('Debe rechazar un año fuera del rango permitido', () => {
      const resultado = validarEtapa({
        ...etapaValida,
        anio: 1999,
      });

      expect(resultado).toBe(
        'Ingresá un año válido entre 2000 y 2100.'
      );
    });

    test('Debe rechazar un orden negativo', () => {
      const resultado = validarEtapa({
        ...etapaValida,
        orden: -1,
      });

      expect(resultado).toBe(
        'El orden debe ser un número entero igual o mayor que cero.'
      );
    });

    test('Debe rechazar un estado de actividad inválido', () => {
      const resultado = validarEtapa({
        ...etapaValida,
        activo: 'si',
      });

      expect(resultado).toBe(
        'El estado de actividad no es válido.'
      );
    });

  });

});
