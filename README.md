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

#### Colección Postman
Para utilizar la colección de Postman y realizar las pruebas, es necesario que el servidor esté corriendo en el puerto  http://localhost:3000, para esto ejecutar previamente:

````
npm run dev
````