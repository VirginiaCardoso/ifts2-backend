jest.mock('../config/db', () => ({ promisePool: { execute: jest.fn() } }));
jest.mock('fs', () => {
    const real = jest.requireActual('fs');
    return { ...real, promises: { ...real.promises, unlink: jest.fn() } };
});
const fs = require('fs');
const path = require('path');
const { promisePool } = require('../config/db');
const { subirDocumentoIngresantes } = require('../controllers/documentos-controller');
const anterior = path.resolve(__dirname, '../public/uploads/documentos/anterior.pdf');
const nuevo = path.resolve(__dirname, '../public/uploads/documentos/nuevo.pdf');
const req = { file: { filename: 'nuevo.pdf', originalname: 'Información.pdf' }, usuario: { id: 1 } };
const respuesta = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('reemplazo seguro del PDF de Ingresantes', () => {
    let archivos, log;
    beforeEach(() => {
        jest.resetAllMocks();
        archivos = new Set([anterior, nuevo]);
        fs.promises.unlink.mockImplementation(async (ruta) => { archivos.delete(ruta); });
        log = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => log.mockRestore());

    test('conserva el PDF anterior y elimina la nueva carga si falla UPDATE', async () => {
        promisePool.execute.mockResolvedValueOnce([[{ id: 7, url_archivo: '/uploads/documentos/anterior.pdf' }]])
            .mockRejectedValueOnce(new Error('Escritura rechazada'));
        const res = respuesta();
        await subirDocumentoIngresantes(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(archivos.has(anterior)).toBe(true);
        expect(archivos.has(nuevo)).toBe(false);
        expect(fs.promises.unlink).toHaveBeenCalledTimes(1);
    });

    test('elimina el anterior solo después de completar UPDATE', async () => {
        promisePool.execute.mockResolvedValueOnce([[{ id: 7, url_archivo: '/uploads/documentos/anterior.pdf' }]])
            .mockImplementationOnce(async () => {
                expect(archivos.has(anterior)).toBe(true);
                expect(archivos.has(nuevo)).toBe(true);
                expect(fs.promises.unlink).not.toHaveBeenCalled();
                return [{ affectedRows: 1 }];
            });
        const res = respuesta();
        await subirDocumentoIngresantes(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(archivos.has(anterior)).toBe(false);
        expect(archivos.has(nuevo)).toBe(true);
    });

    test.each(['consulta', 'inserción'])('limpia la carga si falla la %s inicial', async (fase) => {
        if (fase === 'inserción') promisePool.execute.mockResolvedValueOnce([[]]);
        promisePool.execute.mockRejectedValueOnce(new Error('Base no disponible'));
        const res = respuesta();
        await subirDocumentoIngresantes(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(archivos.has(nuevo)).toBe(false);
        expect(archivos.has(anterior)).toBe(true);
    });

    test('un error al limpiar el anterior no invalida el PDF ya guardado', async () => {
        promisePool.execute.mockResolvedValueOnce([[{ id: 7, url_archivo: '/uploads/documentos/anterior.pdf' }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);
        fs.promises.unlink.mockRejectedValueOnce(Object.assign(new Error('Sin permiso'), { code: 'EACCES' }));
        const res = respuesta();
        await subirDocumentoIngresantes(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(archivos.has(nuevo)).toBe(true);
        expect(log).toHaveBeenCalled();
    });

    test('guarda la primera carga sin borrar archivos', async () => {
        promisePool.execute.mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ insertId: 7 }]);
        const res = respuesta();
        await subirDocumentoIngresantes(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(fs.promises.unlink).not.toHaveBeenCalled();
    });
});
