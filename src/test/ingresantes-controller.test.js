jest.mock('../config/db', () => ({
  promisePool: {
    execute: jest.fn(),
  },
}));

const { promisePool } = require('../config/db');
const {
  crearIngresante,
  actualizarIngresante,
} = require('../controllers/ingresantes-controller');

const crearResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('fechas opcionales en etapas de ingreso', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('permite crear una etapa sin fechas y las guarda como NULL', async () => {
    promisePool.execute
      .mockResolvedValueOnce([{ insertId: 7 }])
      .mockResolvedValueOnce([[{ id_etapa: 7 }]]);

    const res = crearResponse();

    await crearIngresante({
      body: { anio: 2026, nombre: 'Inscripción' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(promisePool.execute.mock.calls[0][1].slice(3, 5)).toEqual([
      null,
      null,
    ]);
  });

  test.each([
    [{ fecha_inicio: '2026-03-01' }, ['2026-03-01', null]],
    [{ fecha_fin: '2026-04-01' }, [null, '2026-04-01']],
    [{ fecha_inicio: '', fecha_fin: null }, [null, null]],
  ])('permite actualizar con fechas parciales: %j', async (fechas, esperadas) => {
    promisePool.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id_etapa: 7 }]]);

    const res = crearResponse();

    await actualizarIngresante({
      params: { id: '7' },
      body: { anio: 2026, nombre: 'Inscripción', ...fechas },
    }, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
    expect(promisePool.execute.mock.calls[0][1].slice(3, 5)).toEqual(esperadas);
  });

  test.each([
    { fecha_inicio: '2026-02-30' },
    { fecha_fin: '2026-03-01', fecha_inicio: '2026-04-01' },
  ])('sigue rechazando fechas inválidas: %j', async (fechas) => {
    const res = crearResponse();

    await crearIngresante({
      body: { anio: 2026, nombre: 'Inscripción', ...fechas },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(promisePool.execute).not.toHaveBeenCalled();
  });
});
