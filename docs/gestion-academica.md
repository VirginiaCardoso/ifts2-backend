# Gestión Académica: horarios y exámenes — backend

Implementa CRUD de mesas de examen con tribunal y de horarios de cursada. Reutiliza `mesas_examenes`, `mesa_examen_profesor`, `horarios_cursada`, `materias` y `profesores`. No requiere cambios SQL ni modifica el frontend.

## Acceso y rutas

Origen local: `http://localhost:3000`. Ambos recursos ofrecen:

| Método | Mesas | Horarios | Acceso |
| --- | --- | --- | --- |
| GET | /api/mesas-examenes | /api/horarios-cursada | Público |
| GET | /api/mesas-examenes/:id | /api/horarios-cursada/:id | Público |
| POST | /api/mesas-examenes | /api/horarios-cursada | Administrador General / Gestión Académica |
| PUT | /api/mesas-examenes/:id | /api/horarios-cursada/:id | Administrador General / Gestión Académica |
| DELETE | /api/mesas-examenes/:id | /api/horarios-cursada/:id | Administrador General / Gestión Académica |

Las escrituras usan `Authorization: Bearer TOKEN` del login existente. GET lista devuelve un array (vacío si no hay coincidencias); GET por ID devuelve un objeto. POST devuelve 201 con mensaje y `mesaId` o `horarioId`; PUT devuelve 200 con mensaje e ID; DELETE devuelve 200 con mensaje. Errores: 400 para datos/filtros/referencias inválidos, 401 para sesión ausente o inválida, 403 para rol no autorizado, 404 para registro inexistente y 500 para fallo interno.

## Mesas de examen

POST y PUT reciben todos los campos siguientes. Sustituir los IDs por registros existentes de la base local:

```json
{
  "materia_id": 1,
  "periodo": "Marzo 2027",
  "fecha": "2027-03-03",
  "hora": "18:30",
  "anio_vigencia": 2027,
  "profesores_ids": [1, 2]
}
```

El período es texto obligatorio de hasta 100 caracteres. La fecha debe ser válida y su año coincidir con anio_vigencia. Las horas aceptan HH:MM o HH:MM:SS, de 00:00:00 a 23:59:59. El tribunal requiere al menos un profesor existente, sin IDs repetidos. Los IDs y años del JSON deben ser números enteros. No se exige que los integrantes del tribunal tengan asignada esa materia en profesor_materia.

La respuesta de consulta contiene los campos de la tabla y además `materia_nombre`, `anio_carrera`, `profesores_ids` y `tribunal`, con objetos `{ "id": 1, "nombre_completo": "Nombre del profesor" }`. Fecha en AAAA-MM-DD, hora en HH:MM:SS. El orden de profesores es por nombre e ID, no por el orden enviado.

Filtros opcionales para el listado:

```text
GET /api/mesas-examenes?anio=2027
GET /api/mesas-examenes?anio=2027&materia_id=1
```

Sin filtros devuelve todos los años. Ordena por fecha, hora e ID. El frontend debe enviar el año elegido para la sección «Año en curso», sin fijarlo en 2027.

### Tarjetas con varias fechas

El esquema existente guarda UNA fecha por mesa. Para representar «3 y 17 de marzo» se crean dos registros, con sus propios IDs y tribunales. La respuesta es plana: el frontend puede agrupar por materia, período, año, hora y tribunal si coinciden; debe conservar los IDs para editar o eliminar cada registro. No agrupar únicamente por período, porque podría mezclar materias o tribunales diferentes. Editar/eliminar una tarjeta que agrupa varias fechas requerirá operar sobre cada ID; no se implementa una operación atómica de lote.

La etiqueta visual «FINAL» puede ser fija en esa pantalla: el modelo actual solo representa mesas de exámenes finales y no tiene un campo de tipo de examen.

El guardado de una mesa y su tribunal es transaccional. PUT reemplaza el tribunal completo; si falla una asociación se revierten los cambios. DELETE elimina la mesa y sus vínculos por ON DELETE CASCADE, conservando profesores y materias.

## Horarios de cursada

POST y PUT reciben:

```json
{
  "materia_id": 1,
  "profesor_id": 1,
  "dia_semana": "Lunes",
  "hora_inicio": "18:00",
  "hora_fin": "20:00",
  "cuatrimestre": 1,
  "anio": 2027
}
```

Días válidos: Lunes, Martes, Miércoles, Jueves, Viernes y Sábado. Cuatrimestre: 1 o 2. Año: entero entre 1000 y 9999. Materia existente obligatoria. profesor_id es opcional: omitido o null deja el horario sin docente. En PUT omitirlo borra la asignación anterior. Fin debe ser posterior a inicio dentro del mismo día; no se admiten horarios que crucen medianoche. Los rangos no se dividen automáticamente en módulos de 40 minutos.

Las respuestas incluyen `materia_nombre`, `anio_carrera` y `profesor_nombre` (null cuando no hay profesor), además de los campos de horarios_cursada. Las horas se devuelven como HH:MM:SS.

Filtros opcionales combinables:

```text
GET /api/horarios-cursada?anio=2027&cuatrimestre=1&materia_id=1
GET /api/horarios-cursada?anio=2027&dia_semana=Lunes
```

Ordena por año, cuatrimestre, día de lunes a sábado, hora de inicio e ID. El frontend puede armar su grilla semanal con estos rangos. No se agregan reglas de colisiones entre horarios: el esquema actual no distingue comisiones ni aulas.

## Catálogos para formularios

- GET `/api/materias`: opciones de materia; tomar el id.
- GET `/api/profesores`: opciones para tribunal y docente; tomar el id.

Usar los IDs reales, no asumir que existen los de los ejemplos. Para mostrar nombres no hace falta consultar estos catálogos por cada tarjeta: las respuestas de Gestión Académica ya los incluyen.

## Prueba manual en Thunder Client

1. Con MySQL y el backend iniciados, POST `/api/auth/login` con Body JSON de una cuenta local existente. Las cuentas iniciales son aruidiaz@ifts2.edu.ar y mcanovi@ifts2.edu.ar, contraseña 123456 si no fue cambiada. Copiar el token completo.
2. Consultar GET `/api/materias` y GET `/api/profesores`; anotar IDs para los ejemplos anteriores.
3. Crear POST `/api/mesas-examenes` con Authorization y el JSON de mesa; esperar 201 y anotar mesaId.
4. GET `/api/mesas-examenes/ID` y listado filtrado por año; esperar 200 con materia y tribunal.
5. PUT al mismo ID, Authorization y el JSON completo cambiando fecha o tribunal; esperar 200 y repetir GET para comprobar persistencia.
6. DELETE al ID de la mesa de prueba propia con Authorization; esperar 200 y luego 404 al repetir GET. El borrado es permanente.
7. Repetir POST, GET, PUT y DELETE para `/api/horarios-cursada`, usando el JSON de horario y horarioId.
8. Probar fecha inexistente, tribunal repetido o vacío, fin anterior al inicio, IDs inexistentes y escritura sin token: esperar 400 o 401 según corresponda.

Capturar método, URL, cuerpo y respuesta ocultando el token. Las evidencias son del backend; para cumplir la demostración desde la aplicación habrá que integrar la pantalla de frontend.

## Pruebas automatizadas

Desde la raíz del backend, con la base local de desarrollo y src/.env configurados:

```powershell
npm.cmd test -- --runInBand src/test/gestionAcademica.test.js
```

Prueba ambos roles, CRUD de ambos recursos, filtros, validaciones, referencias, tribunal, escrituras no autorizadas y reversión transaccional con falla simulada. Crea y limpia materia, profesores, mesas y horarios temporales. Los logins actualizan el último acceso de las cuentas de prueba. Solo ejecutar en desarrollo.
