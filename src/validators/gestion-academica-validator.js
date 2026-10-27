const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const idValido = (valor) => Number.isInteger(valor) && valor > 0 && valor <= 2147483647;
const anioValido = (valor) => Number.isInteger(valor) && valor >= 1000 && valor <= 9999;
const horaValida = (valor) => typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(valor);
const normalizarHora = (valor) => valor.length === 5 ? `${valor}:00` : valor;
const parametroIdValido = (valor) => typeof valor === 'string' && /^[1-9]\d*$/.test(valor) && idValido(Number(valor));
function fechaValida(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || !anioValido(Number(valor.slice(0, 4)))) return false;
    const fecha = new Date(`${valor}T00:00:00Z`);
    return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}
function validarMesa(body) {
    if (!body || !idValido(body.materia_id)) return 'La materia debe tener un ID válido.';
    if (typeof body.periodo !== 'string' || !body.periodo.trim() || [...body.periodo.trim()].length > 100) return 'El período es obligatorio y admite hasta 100 caracteres.';
    if (!fechaValida(body.fecha)) return 'La fecha debe ser válida y tener formato AAAA-MM-DD.';
    if (!horaValida(body.hora)) return 'La hora debe tener formato HH:MM o HH:MM:SS, entre 00:00 y 23:59:59.';
    if (!anioValido(body.anio_vigencia) || Number(body.fecha.slice(0, 4)) !== body.anio_vigencia) return 'El año de vigencia debe coincidir con el año de la fecha.';
    if (!Array.isArray(body.profesores_ids) || !body.profesores_ids.length || !body.profesores_ids.every(idValido) || new Set(body.profesores_ids).size !== body.profesores_ids.length) return 'El tribunal debe incluir IDs de profesores válidos, sin repetidos.';
    return null;
}
function validarHorario(body) {
    if (!body || !idValido(body.materia_id)) return 'La materia debe tener un ID válido.';
    if (body.profesor_id != null && !idValido(body.profesor_id)) return 'El profesor debe tener un ID válido o ser null.';
    if (!dias.includes(body.dia_semana)) return 'Seleccioná un día válido, de Lunes a Sábado.';
    if (!horaValida(body.hora_inicio) || !horaValida(body.hora_fin)) return 'Las horas deben tener formato HH:MM o HH:MM:SS.';
    if (normalizarHora(body.hora_inicio) >= normalizarHora(body.hora_fin)) return 'La hora de fin debe ser posterior a la hora de inicio dentro del mismo día.';
    if (![1, 2].includes(body.cuatrimestre)) return 'El cuatrimestre debe ser 1 o 2.';
    if (!anioValido(body.anio)) return 'El año debe ser un entero entre 1000 y 9999.';
    return null;
}
module.exports = { dias, idValido, anioValido, parametroIdValido, normalizarHora, validarMesa, validarHorario };
