# CRUD de Plantel docente — backend

Utiliza la tabla existente `profesores`. No requiere migraciones ni volver a ejecutar los scripts SQL. El frontend no se modifica.

## Contrato de la API

URL base local: `http://localhost:3000`.

| Método | Ruta | Acceso | Respuesta exitosa |
| --- | --- | --- | --- |
| GET | /api/profesores | Público | 200, lista ordenada por nombre e ID |
| GET | /api/profesores/:id | Público | 200, profesor |
| POST | /api/profesores | Administrador General / Gestión Académica | 201, mensaje y profesorId |
| PUT | /api/profesores/:id | Administrador General / Gestión Académica | 200, mensaje y profesorId |
| DELETE | /api/profesores/:id | Administrador General / Gestión Académica | 200, mensaje |

POST y PUT reciben un JSON con `nombre_completo`, obligatorio, de 1 a 255 caracteres después de quitar espacios al principio y al final. Se permiten nombres repetidos porque el esquema no establece unicidad. El servidor genera el ID y las fechas; no se modifican materias, horarios ni mesas desde este CRUD.

Cada profesor consultado incluye `id`, `nombre_completo`, `created_at` y `updated_at`. Una lista vacía devuelve `[]`.

Errores: 400 para nombre o ID inválido; 401 para token ausente, inválido o vencido; 403 para rol no autorizado; 404 para profesor inexistente; 500 para error de base de datos.

### Efecto del borrado

El borrado es permanente. De acuerdo con las claves foráneas del esquema existente:

- Se eliminan los vínculos del profesor en `profesor_materia` y `mesa_examen_profesor` (ON DELETE CASCADE).
- Se conservan sus horarios con `profesor_id = NULL` (ON DELETE SET NULL).
- Se conservan las materias y las mesas de examen.

## Prueba manual en Thunder Client

Mantener MySQL y el backend ejecutándose con `npm.cmd run dev`. Usar únicamente un profesor de prueba propio para las operaciones de edición y eliminación.

1. **Login:** crear una petición POST a `http://localhost:3000/api/auth/login`. En Body → JSON enviar las credenciales locales de desarrollo:

   ```json
   { "correo": "aruidiaz@ifts2.edu.ar", "password": "123456" }
   ```

   Copiar el token completo de la respuesta, sin comillas.

2. **Crear:** POST a `http://localhost:3000/api/profesores`. En Headers agregar `Authorization` con valor `Bearer TU_TOKEN`. En Body → JSON:

   ```json
   { "nombre_completo": "Prof. Ana de Prueba" }
   ```

   Esperar 201 y anotar `profesorId`. En los siguientes pasos reemplazar `ID` por ese número.

3. **Consultar:** GET a `http://localhost:3000/api/profesores/ID`, sin Body ni autenticación. Esperar 200 y el nombre creado. Para consultar el plantel completo, GET a `http://localhost:3000/api/profesores`.

4. **Editar:** PUT a `http://localhost:3000/api/profesores/ID`, con el mismo header Authorization y Body → JSON:

   ```json
   { "nombre_completo": "Prof. Ana Actualizada" }
   ```

   Esperar 200. Repetir el GET individual y comprobar el nombre actualizado.

5. **Eliminar:** DELETE a `http://localhost:3000/api/profesores/ID`, con Authorization y sin Body. Esperar 200. Repetir el GET individual: debe responder 404, «Profesor no encontrado.».

6. **Validar:** intentar POST con `{ "nombre_completo": " " }` y token válido. Esperar 400. Repetir POST con nombre válido pero sin Authorization: esperar 401.

Capturar método, URL, cuerpo y respuesta de cada operación, ocultando el token. Estas evidencias corresponden al backend; la demostración desde la interfaz queda para la integración con frontend.

### Persistencia en HeidiSQL

Antes y después de actualizar o eliminar, sustituir 123 por el ID propio:

```sql
SELECT id, nombre_completo, created_at, updated_at
FROM sistema_academico.profesores
WHERE id = 123;
```

## Pruebas automatizadas

Desde la raíz de `ifts2-backend`, con MySQL iniciado y `src/.env` configurado:

```powershell
npm.cmd test -- --runInBand src/test/profesores.test.js src/test/novedades.test.js
```

Ejecutar únicamente en la base local de desarrollo. Las pruebas usan las cuentas iniciales `aruidiaz@ifts2.edu.ar` y `mcanovi@ifts2.edu.ar`, con contraseña `123456`. Crean y limpian registros temporales; el login actualiza el último acceso de esas cuentas. La prueba de relaciones crea también una materia, una mesa y un horario temporales y los elimina al finalizar.

Se verifican las cuatro operaciones, persistencia SQL, consulta pública, ambos roles autorizados, rechazo de escrituras no autorizadas, validación de nombres e IDs, actualización sin cambios, registros inexistentes y comportamiento de las claves foráneas al eliminar.
