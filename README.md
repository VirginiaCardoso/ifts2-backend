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
Crea un archivo `.env` en la raíz del proyecto con los datos de conexión:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=sistema_academico
DB_PORT=3306
PORT=3000
```

Reemplazá `DB_USER` y `DB_PASSWORD` por las credenciales de tu instalación de MySQL. La base de datos `sistema_academico` es la que utiliza el script SQL y la configuración del backend.

#### Ejecutar el script SQL

Desde la raíz del proyecto, ejecutá el archivo `src/database/ifts2-db.sql` con el cliente de MySQL:

```bash
mysql -u root -p < src/database/ifts2-db.sql
```

Ingresá la contraseña de MySQL cuando se solicite. También podés abrir `src/database/ifts2-db.sql` desde el gestor de base de datos y ejecutar el script. Este crea la base de datos `sistema_academico` y sus tablas.

### Levantar el servidor de la Api: 
````
npm run dev
````

### Ejecutar pruebas

````
npm run test
````