# CRUD de Trámites — backend

Gestiona información y requisitos de los trámites institucionales en la tabla existente `tramites_requisitos`. No administra solicitudes individuales de alumnos ni envía correos. No requiere migración SQL. La sección del frontend conserva sus datos estáticos hasta su integración.

## API

Base local: `http://localhost:3000`.

| Método | Ruta | Acceso | Éxito |
| --- | --- | --- | --- |
| GET | /api/tramites | Público | 200, lista ordenada por nombre e ID |
| GET | /api/tramites/:id | Público | 200, registro |
| POST | /api/tramites | Administrador General | 201, mensaje y tramiteId |
| PUT | /api/tramites/:id | Administrador General | 200, mensaje y tramiteId |
| DELETE | /api/tramites/:id | Administrador General | 200, mensaje |

Cada registro consultado incluye id, nombre_tramite, descripcion_requisitos, created_at y updated_at. Una lista vacía devuelve []. Nombre obligatorio de hasta 255 caracteres, sin espacios en los extremos. Descripción opcional, texto de hasta 65535 bytes UTF-8; vacía, omitida o null se guarda como NULL. PUT reemplaza ambos campos: omitir la descripción elimina su valor anterior. El esquema admite nombres repetidos.

Errores: 400 para datos o ID inválidos, 401 para token ausente/inválido/vencido, 403 para rol no autorizado, 404 para registro inexistente y 500 para error de base de datos. El borrado es permanente.

## Evidencias en Thunder Client

Con MySQL y el backend iniciados:

1. POST `http://localhost:3000/api/auth/login`, Body → JSON con las credenciales de desarrollo. Copiar el token completo, sin comillas:

```json
{ "correo": "aruidiaz@ifts2.edu.ar", "password": "123456" }
```

2. POST `http://localhost:3000/api/tramites`, header `Authorization: Bearer TU_TOKEN`, Body → JSON:

```json
{
  "nombre_tramite": "Trámite de prueba - Alumno regular",
  "descripcion_requisitos": "Presentar documentación en Bedelía con 48 horas de anticipación."
}
```

Esperar 201 y anotar tramiteId. Sustituir ID por ese número en los pasos siguientes.

3. GET `http://localhost:3000/api/tramites/ID`, sin token ni Body: esperar 200 con los datos creados. GET `/api/tramites` permite consultar todos.

4. PUT `http://localhost:3000/api/tramites/ID`, con Authorization y Body → JSON:

```json
{
  "nombre_tramite": "Trámite de prueba actualizado",
  "descripcion_requisitos": "Nuevos requisitos para la prueba."
}
```

Esperar 200. Repetir GET individual y comprobar los cambios.

5. DELETE `http://localhost:3000/api/tramites/ID`, con Authorization, sin Body. Usar solo el registro de prueba propio. Esperar 200 y luego 404 al repetir GET individual.

6. POST con nombre vacío y token válido: esperar 400. POST con nombre válido sin token: esperar 401.

Capturar método, URL, cuerpo y respuesta de cada operación, ocultando el token. Son evidencias del backend; la demostración desde la interfaz requiere integrar el frontend.

Para verificar persistencia en HeidiSQL, sustituir 123 por el ID propio antes y después de cada operación:

```sql
SELECT id, nombre_tramite, descripcion_requisitos, created_at, updated_at
FROM sistema_academico.tramites_requisitos
WHERE id = 123;
```

## Pruebas automatizadas

Desde la raíz del backend, con MySQL local y src/.env configurados:

```powershell
npm.cmd test -- --runInBand src/test/tramites.test.js
```

Solo ejecutar en la base local de desarrollo. Usa las cuentas iniciales aruidiaz@ifts2.edu.ar y mcanovi@ifts2.edu.ar con contraseña 123456. Verifica CRUD con Administrador General, rechazo de escrituras de Gestión Académica, persistencia SQL, actualización sin cambios, descripción opcional, límites de datos, IDs inválidos y registros inexistentes. Crea registros temporales y los limpia al finalizar; el login actualiza el último acceso de las cuentas.
