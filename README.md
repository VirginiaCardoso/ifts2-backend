# IFTS N°2 Backend

### ¿Cómo instalar el proyecto?

#### Desde la terminal:

- Clonar el proyecto:
````
git clone https://github.com/VirginiaCardoso/ifts2-backend.git

````

- Para instalar las dependencias correr: 
````
npm install
````

### Configurar la base de datos

El proyecto utiliza MySQL. Primero, asegurate de tener el servidor MySQL iniciado, por ejemplo: MYSQL Workbench (https://www.mysql.com/products/workbench/) o Heidi db (https://www.heidisql.com/).

Crea un archivo .env dentro de la carpeta src basándote en el archivo .env.example, con los siguientes datos de conexión

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=sistema_academico
DB_PORT=3306
PORT=3000
JWT_SECRET=tu_super_secreto
JWT_EXPIRES_IN=8h
```

Reemplazá `DB_USER` y `DB_PASSWORD` por las credenciales de tu instalación de MySQL. La base de datos `sistema_academico` es la que utiliza el script SQL y la configuración del backend.

#### Ejecutar el script SQL para crear la base de datos

Desde la raíz del proyecto, ejecutá el archivo `src/database/ifts2-db.sql` con el cliente de MySQL


Ingresá la contraseña de MySQL cuando se solicite. También podés abrir `src/database/ifts2-db.sql` desde el gestor de base de datos y ejecutar el script. Este crea la base de datos `sistema_academico` y sus tablas.

#### Ejecutar el script para poblar la base de datos con datos iniciales

Desde la raíz del proyecto, ejecutá el archivo `src/database/seed.sql` con el cliente de MySQL

### Levantar el servidor de la Api: 
````
npm run dev
````

### Ejecutar pruebas

````
npm run test
````
### Pruebas del Formulario de Contacto (Envío de Correos)

El sistema utiliza Nodemailer para gestionar los mensajes del formulario de contacto. Para evitar el envío de correos reales (spam) a la institución durante el desarrollo, el entorno está configurado para utilizar variables de prueba.

### 1. Configuración de Credenciales (Local)
Antes de probar el endpoint, asegúrate de configurar tu archivo `.env` (ubicado en `src/`) en modo desarrollo. Puedes usar un servicio como [Mailtrap](https://mailtrap.io/) o una cuenta de Gmail personal.

```env
# Define el entorno como desarrollo
NODE_ENV=development

# Configuración del servidor SMTP de prueba
DEV_EMAIL_HOST=sandbox.smtp.mailtrap.io  # o smtp.gmail.com
DEV_EMAIL_PORT=2525                      # o 465
DEV_EMAIL_USER=tu_usuario_de_prueba
DEV_EMAIL_PASS=tu_password_de_prueba
DEV_EMAIL_RECEIVER=correo_donde_quieres_recibir_la_prueba@dominio.com
```

### Rutas de la API

La URL base local es `http://localhost:3000` (o el valor configurado en `PORT`). Las rutas protegidas requieren enviar el token JWT en el encabezado `Authorization: Bearer <token>`.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/` | Público | Verifica que la API esté funcionando. |
| POST | `/api/auth/login` | Público | Inicia sesión. |
| PUT | `/api/auth/cambiar-password` | Autenticado | Cambia la contraseña del usuario autenticado. |
| GET | `/api/usuarios` | Administrador General | Lista los usuarios. |
| POST | `/api/usuarios` | Administrador General | Crea un usuario. |
| PUT | `/api/usuarios/:id` | Administrador General | Actualiza un usuario. |
| DELETE | `/api/usuarios/:id` | Administrador General | Elimina un usuario. |
| GET | `/api/novedades` | Público | Lista las novedades. |
| GET | `/api/novedades/:id` | Público | Obtiene una novedad. |
| POST | `/api/novedades` | Administrador General o Gestión Académica | Crea una novedad. |
| PUT | `/api/novedades/:id` | Administrador General o Gestión Académica | Actualiza una novedad. |
| DELETE | `/api/novedades/:id` | Administrador General o Gestión Académica | Elimina una novedad. |
| GET | `/api/profesores` | Público | Lista los profesores. |
| GET | `/api/profesores/:id` | Público | Obtiene un profesor. |
| POST | `/api/profesores` | Administrador General o Gestión Académica | Crea un profesor. |
| PUT | `/api/profesores/:id` | Administrador General o Gestión Académica | Actualiza un profesor. |
| DELETE | `/api/profesores/:id` | Administrador General o Gestión Académica | Elimina un profesor. |
| POST | `/api/contacto` | Público | Envía una consulta desde el formulario de contacto. |
### CRUD de Trámites

Documentación de endpoints, validaciones y pruebas en Thunder Client: [docs/tramites.md](docs/tramites.md). Usa la tabla existente tramites_requisitos, sin migraciones SQL.

### Gestión Académica: horarios y exámenes

Contrato de API, formatos para la pantalla y pruebas en Thunder Client: [docs/gestion-academica.md](docs/gestion-academica.md). La carga complementaria de materias y promocionales agrega soporte anual en bases anteriores; ver la guía antes de ejecutar seeds.

### Carrera y Plan de Estudios

CRUD de materias, asignación de docentes, promocionables, correlatividades, aviso y PDF oficiales: [docs/carrera.md](docs/carrera.md). La carga complementaria de materias y promocionales agrega soporte anual en bases anteriores; ver la guía antes de ejecutar seeds.

Carga complementaria (no usar el seed general sobre una base ya cargada): `npm.cmd run seed:carrera` previsualiza y `npm.cmd run seed:carrera -- --apply` aplica las materias y promocionales proporcionados.

Correlatividades: después del plan, `npm.cmd run seed:correlatividades` previsualiza y `npm.cmd run seed:correlatividades -- --apply` carga las reglas simplificadas de dos categorías sin duplicarlas.
