# IFTS N°2 Backend

API REST del sistema académico del IFTS N°2, desarrollada con Node.js, Express y MySQL. Este documento describe cómo instalar y configurar el proyecto, crear y poblar la base de datos, ejecutar el servidor y las pruebas, y consultar todas las rutas disponibles.

## Requisitos

- Node.js y npm.
- MySQL en ejecución y un cliente para ejecutar scripts SQL, por ejemplo MySQL Workbench o HeidiSQL.
- Acceso a una cuenta MySQL con permisos para crear la base y sus tablas.

## Instalación

Cloná el repositorio e instalá sus dependencias desde la raíz:

```sh
git clone https://github.com/VirginiaCardoso/ifts2-backend.git
cd ifts2-backend
npm install
```

## Configuración

Copiá `src/.env.example` como `src/.env` y completá las credenciales locales. El servidor carga este archivo desde `src/`.

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=sistema_academico
DB_PORT=3306
JWT_SECRET=una_clave_local_segura
JWT_EXPIRES_IN=8h
```

El nombre de la base debe ser `sistema_academico`, que es el que utilizan los scripts SQL. No subas `src/.env` ni credenciales reales al repositorio.

El envío del formulario de contacto necesita además las variables SMTP `DEV_EMAIL_HOST`, `DEV_EMAIL_PORT`, `DEV_EMAIL_USER`, `DEV_EMAIL_PASS` y `DEV_EMAIL_RECEIVER` en desarrollo. Para producción, el controlador usa las variables `PROD_EMAIL_*` y requiere `NODE_ENV=production`. El endpoint envía correos; configurá un buzón de pruebas (por ejemplo, Mailtrap) durante el desarrollo.

## Crear y poblar la base de datos

Para una instalación nueva solo necesitás ejecutar estos dos scripts, en este orden:

1. `src/database/ifts2-db.sql`: crea la base `sistema_academico` y sus tablas.
2. `src/database/seed.sql`: carga los datos iniciales en esa base.

Podés abrir cada archivo desde Workbench o HeidiSQL y ejecutar su contenido. También podés ejecutarlos desde `cmd.exe`, en la raíz del proyecto:

```cmd
mysql -u root -p < src/database/ifts2-db.sql
mysql -u root -p sistema_academico < src/database/seed.sql
```

Ingresá la contraseña cuando el cliente la solicite. No hace falta ejecutar migraciones ni seeds complementarios para una instalación inicial. `src/database/migrations/` y los comandos `seed:carrera` y `seed:correlatividades` son para casos de actualización o carga complementaria descritos en sus guías; no reemplazan a los dos scripts anteriores. No ejecutes una carga complementaria sobre datos ya existentes sin revisar primero su documentación.

El seed incluye cuentas locales de prueba. En una base nueva, las guías de pruebas usan `aruidiaz@ifts2.edu.ar` y `mcanovi@ifts2.edu.ar`, ambas con contraseña inicial `123456`. Cambiá esas contraseñas y no reutilices estas credenciales en producción.

## Ejecutar el servidor

Desde la raíz:

```sh
npm run dev
```

La API queda disponible en `http://localhost:3000` (o en el puerto indicado por `PORT`). La ruta `GET /` devuelve un mensaje para comprobar que el servidor está activo.

## Pruebas automatizadas

Las pruebas usan Jest y Supertest. `npm test` ejecuta todas las suites; `--runInBand` las ejecuta en serie y facilita el diagnóstico:

```sh
npm test -- --runInBand
```

Para ejecutar una suite puntual:

```sh
npm test -- --runInBand src/test/contacto.test.js
```

En PowerShell de Windows también podés usar `npm.cmd` en lugar de `npm`. Para las suites que acceden a MySQL, iniciá el servidor de base de datos, configurá `src/.env` y prepará `sistema_academico` con los dos scripts de la sección anterior. Ejecutá estas pruebas solo contra una base local de desarrollo: las suites de integración crean, modifican y eliminan registros temporales y algunas usan las cuentas iniciales. Los logins de prueba pueden actualizar su último acceso. La suite de Carrera crea una base de datos temporal aislada y necesita permisos de creación y eliminación de bases. No ejecutes la suite sobre producción.

La suite de Contacto simula Nodemailer: no envía correos reales ni necesita conectarse a un SMTP. La suite unitaria de Ingresantes usa una base de datos simulada.

| Suite | Qué se probó | Resultado esperado | Resultado obtenido en la última ejecución |
|---|---|---|---|
| `usuariosAuth.test.js` | Login de ambos roles; CRUD de usuarios; autorización por rol; cambio de contraseña y validaciones. | Tokens para credenciales válidas, operaciones permitidas para Administrador General y rechazo de operaciones/contraseñas inválidas. | Aprobada. |
| `tramites.test.js` | CRUD, persistencia, campos e IDs inválidos, descripción opcional y protección de escrituras. | Respuestas correctas para operaciones válidas y rechazo de datos inválidos o accesos no autorizados. | Aprobada. |
| `profesores.test.js` | CRUD, consultas públicas, permisos, validaciones y efecto de claves foráneas al eliminar. | Persistencia de los cambios; errores apropiados para datos inválidos o permisos insuficientes; conservación de registros relacionados según el esquema. | Aprobada. |
| `novedades.test.js` | Lectura, escritura autorizada, validaciones y uso del autor asociado al token. | CRUD válido y rechazo de accesos no autorizados o datos inválidos. | Aprobada. |
| `gestionAcademica.test.js` | CRUD y filtros de mesas y horarios, reglas de fechas/horas/referencias, permisos y transacciones. | Datos persistidos y filtrados correctamente; validaciones aplicadas y cambios revertidos ante fallos transaccionales. | Aprobada. |
| `carrera.test.js` | Materias, docentes asignados, reglas de correlatividad, aviso, PDFs, materias anuales y seeds complementarios. | Operaciones válidas persistidas; restricciones, permisos y reversión ante fallos respetados; seeds repetibles sin duplicaciones. | Aprobada. |
| `contacto.test.js` | Campos obligatorios, asuntos permitidos y envío simulado mediante Nodemailer. | Datos incompletos o asunto inválido rechazados sin enviar; consulta válida procesada y correo simulado. | Aprobada. |
| `ingresantes-controller.test.js` | Creación y actualización de etapas de ingreso con fechas opcionales o parciales y fechas inválidas. | Fechas omitidas guardadas como `NULL`; fechas inválidas rechazadas sin ejecutar consultas. | Aprobada. |
| `rutasAdminPublicas.test.js` | Acceso público de GET y control por rol en escrituras de autoridades, bedeles y enlaces externos. | GET accesibles sin token; escrituras solo para Administrador General. | Aprobada. |

Última ejecución verificada: **9 suites aprobadas, 63 pruebas aprobadas y 0 fallidas** (`npm test -- --runInBand`).

## Roles y permisos

- **Administrador General:** puede editar todas las secciones y administrar usuarios.
- **Gestión Académica:** puede editar etapas de ingreso, documentos, horarios de cursada, mesas de examen, correlatividades y materias.

Los `GET` de información institucional son públicos; `GET /api/usuarios` es la excepción porque expone datos de cuentas y requiere Administrador General. `GET /api/novedades` es público, incluso con `?admin=true`, que incluye borradores. Las operaciones de escritura requieren autenticación y el rol autorizado para esa sección. Gestión Académica no puede administrar usuarios ni editar novedades, plantel, trámites, autoridades, bedeles o enlaces externos; Administrador General conserva acceso a todas las secciones.

## Rutas de la API

URL base local: `http://localhost:3000`. Las rutas protegidas requieren el encabezado `Authorization: Bearer <token>`, obtenido mediante `POST /api/auth/login`. Los roles usados por la API son `Administrador General` y `Gestión Académica`. `:id` y `:tipo` representan parámetros de ruta.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/` | Público | Comprueba que la API está activa. |
| POST | `/api/auth/login` | Público | Inicia sesión y devuelve el token JWT. |
| PUT | `/api/auth/cambiar-password` | Usuario autenticado | Cambia la contraseña del usuario autenticado. |
| GET | `/api/usuarios` | Administrador General | Lista usuarios. |
| POST | `/api/usuarios` | Administrador General | Crea un usuario. |
| PUT | `/api/usuarios/:id` | Administrador General | Actualiza un usuario. |
| DELETE | `/api/usuarios/:id` | Administrador General | Elimina un usuario. |
| PUT | `/api/usuarios/:id/password` | Administrador General | Cambia la contraseña de un usuario. |
| GET | `/api/novedades` | Público | Lista novedades. |
| GET | `/api/novedades/:id` | Público | Obtiene una novedad. |
| POST | `/api/novedades` | Administrador General | Crea una novedad. |
| PUT | `/api/novedades/:id` | Administrador General | Actualiza una novedad. |
| DELETE | `/api/novedades/:id` | Administrador General | Elimina una novedad. |
| GET | `/api/profesores` | Público | Lista profesores. |
| GET | `/api/profesores/:id` | Público | Obtiene un profesor. |
| POST | `/api/profesores` | Administrador General | Crea un profesor. |
| PUT | `/api/profesores/:id` | Administrador General | Actualiza un profesor. |
| DELETE | `/api/profesores/:id` | Administrador General | Elimina un profesor. |
| GET | `/api/materias` | Público | Lista materias. |
| GET | `/api/materias/:id` | Público | Obtiene una materia. |
| POST | `/api/materias` | Administrador General / Gestión Académica | Crea una materia. |
| PUT | `/api/materias/:id` | Administrador General / Gestión Académica | Actualiza una materia. |
| PATCH | `/api/materias/:id/promocional` | Administrador General / Gestión Académica | Actualiza el estado promocional de una materia. |
| PUT | `/api/materias/:id/profesores` | Administrador General / Gestión Académica | Asigna profesores a una materia. |
| DELETE | `/api/materias/:id` | Administrador General / Gestión Académica | Elimina una materia. |
| GET | `/api/carrera` | Público | Obtiene la información del plan de estudios. |
| PUT | `/api/carrera/aviso` | Administrador General | Actualiza el aviso de Carrera. |
| POST | `/api/carrera/correlatividades` | Administrador General / Gestión Académica | Crea una regla de correlatividad. |
| PUT | `/api/carrera/correlatividades/:id` | Administrador General / Gestión Académica | Actualiza una regla. |
| DELETE | `/api/carrera/correlatividades/:id` | Administrador General / Gestión Académica | Elimina una regla. |
| GET | `/api/carrera/documentos/:tipo/archivo` | Público | Descarga el PDF oficial del tipo indicado. |
| PUT | `/api/carrera/documentos/:tipo` | Administrador General / Gestión Académica | Carga o reemplaza un PDF (`application/pdf`, máximo 10 MB). |
| DELETE | `/api/carrera/documentos/:tipo` | Administrador General / Gestión Académica | Elimina el PDF del tipo indicado. |
| GET | `/api/ingresantes` | Público | Lista etapas de ingreso. |
| GET | `/api/ingresantes/:id` | Público | Obtiene una etapa de ingreso. |
| POST | `/api/ingresantes` | Administrador General / Gestión Académica | Crea una etapa. |
| PUT | `/api/ingresantes/:id` | Administrador General / Gestión Académica | Actualiza una etapa. |
| DELETE | `/api/ingresantes/:id` | Administrador General / Gestión Académica | Elimina una etapa. |
| GET | `/api/tramites` | Público | Lista trámites. |
| GET | `/api/tramites/:id` | Público | Obtiene un trámite. |
| POST | `/api/tramites` | Administrador General | Crea un trámite. |
| PUT | `/api/tramites/:id` | Administrador General | Actualiza un trámite. |
| DELETE | `/api/tramites/:id` | Administrador General | Elimina un trámite. |
| GET | `/api/mesas-examenes` | Público | Lista mesas; admite filtros de año y materia. |
| GET | `/api/mesas-examenes/:id` | Público | Obtiene una mesa. |
| POST | `/api/mesas-examenes` | Administrador General / Gestión Académica | Crea una mesa y su tribunal. |
| PUT | `/api/mesas-examenes/:id` | Administrador General / Gestión Académica | Actualiza una mesa y su tribunal. |
| DELETE | `/api/mesas-examenes/:id` | Administrador General / Gestión Académica | Elimina una mesa. |
| GET | `/api/horarios-cursada` | Público | Lista horarios; admite filtros de año, cuatrimestre, materia y día. |
| GET | `/api/horarios-cursada/:id` | Público | Obtiene un horario. |
| POST | `/api/horarios-cursada` | Administrador General / Gestión Académica | Crea un horario. |
| PUT | `/api/horarios-cursada/:id` | Administrador General / Gestión Académica | Actualiza un horario. |
| DELETE | `/api/horarios-cursada/:id` | Administrador General / Gestión Académica | Elimina un horario. |
| POST | `/api/contacto` | Público | Envía una consulta por correo. |
| GET | `/api/autoridades` | Público | Lista autoridades. |
| POST | `/api/autoridades` | Administrador General | Crea una autoridad. |
| PUT | `/api/autoridades/:id` | Administrador General | Actualiza una autoridad. |
| DELETE | `/api/autoridades/:id` | Administrador General | Elimina una autoridad. |
| GET | `/api/bedeles` | Público | Lista bedeles. |
| POST | `/api/bedeles` | Administrador General | Crea un bedel. |
| PUT | `/api/bedeles/:id` | Administrador General | Actualiza un bedel. |
| DELETE | `/api/bedeles/:id` | Administrador General | Elimina un bedel. |
| GET | `/api/enlaces-externos` | Público | Lista enlaces externos. |
| PUT | `/api/enlaces-externos/:id` | Administrador General | Actualiza un enlace. |
| GET | `/api/documentos/ingresantes` | Público | Consulta el documento de ingresantes. |
| GET | `/api/documentos/ingresantes/descargar` | Público | Descarga el documento de ingresantes. |
| POST | `/api/documentos/ingresantes` | Administrador General / Gestión Académica | Carga un PDF en el campo multipart `documento`. |

Las rutas protegidas requieren un token JWT de un usuario con el rol autorizado para la operación.

Consultá las guías enlazadas para formatos, validaciones, filtros, códigos de respuesta y ejemplos de uso:

- [CRUD de trámites](docs/tramites.md).
- [Horarios y mesas de examen](docs/gestion-academica.md).
- [Carrera y plan de estudios](docs/carrera.md).
- [Plantel docente](docs/plantel-docente.md).

## Formulario de contacto y correo de prueba

`POST /api/contacto` recibe JSON con `nombre`, `correo`, `asunto` y `mensaje`. Los campos son obligatorios y el asunto debe estar dentro de las opciones aceptadas por el controlador. Configurá las variables `DEV_EMAIL_*` descritas arriba para enviar mensajes a una bandeja de prueba; no uses destinatarios reales durante las pruebas automatizadas.

## Comandos disponibles

| Comando | Uso |
|---|---|
| `npm run dev` | Inicia el servidor con nodemon. |
| `npm test` | Ejecuta todas las pruebas Jest. |
| `npm run seed:carrera` | Previsualiza la carga complementaria de materias/promocionales. |
| `npm run seed:carrera -- --apply` | Aplica esa carga complementaria. |
| `npm run seed:correlatividades` | Previsualiza la carga de reglas simplificadas. |
| `npm run seed:correlatividades -- --apply` | Aplica esa carga complementaria. |

Los seeds complementarios están pensados para bases que ya tienen el esquema principal. Revisá [Carrera y plan de estudios](docs/carrera.md) antes de usarlos.
