CREATE DATABASE IF NOT EXISTS sistema_academico;
USE sistema_academico;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    rol_institucional VARCHAR(100),
    nivel_de_acceso ENUM('Administrador General', 'Gestión Académica') NOT NULL,
    correo VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    ultimo_acceso TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE materias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    anio_carrera ENUM('1', '2', '3') NOT NULL,
    cuatrimestre INT NULL,
    es_anual BOOLEAN NOT NULL DEFAULT FALSE,
    es_promocional BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE profesores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE autoridades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cargo VARCHAR(255) NOT NULL,
    nombre_responsable VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE configuracion_institucional (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor_texto TEXT,
    valor_url_archivo VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE etapas_ingreso (
    id_etapa INT AUTO_INCREMENT PRIMARY KEY,
    anio INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE NULL,
    fecha_fin DATE NULL,
    requisitos TEXT,
    orden INT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE enlaces_externos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_sistema VARCHAR(255) NOT NULL,
    url_destino VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE tramites_requisitos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_tramite VARCHAR(255) NOT NULL,
    descripcion_requisitos TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE correlatividades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    materia_id INT NOT NULL,
    materia_requisito_id INT NOT NULL,
    tipo_requisito ENUM('CURSADA', 'APROBADA') NOT NULL,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_requisito_id) REFERENCES materias(id) ON DELETE CASCADE
);

CREATE TABLE profesor_materia (
    profesor_id INT(11) NOT NULL,
    materia_id INT(11) NOT NULL,
    rol ENUM('titular','ayudante') NOT NULL DEFAULT 'titular' COLLATE 'utf8mb4_general_ci',
    PRIMARY KEY (profesor_id, materia_id) USING BTREE,
    INDEX materia_id (materia_id) USING BTREE,
    CONSTRAINT profesor_materia_ibfk_1 FOREIGN KEY (profesor_id) REFERENCES profesores (id) ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT profesor_materia_ibfk_2 FOREIGN KEY (materia_id) REFERENCES materias (id) ON UPDATE RESTRICT ON DELETE CASCADE
);

CREATE TABLE mesas_examenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    materia_id INT NOT NULL,
    periodo VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    anio_vigencia INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE RESTRICT
);

CREATE TABLE mesa_examen_profesor (
    mesa_examen_id INT NOT NULL,
    profesor_id INT NOT NULL,
    PRIMARY KEY (mesa_examen_id, profesor_id),
    FOREIGN KEY (mesa_examen_id) REFERENCES mesas_examenes(id) ON DELETE CASCADE,
    FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE CASCADE
);

CREATE TABLE horarios_cursada (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dia_semana ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado') NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    cuatrimestre INT NOT NULL,
    anio INT NOT NULL,
    materia_id INT NOT NULL,
    profesor_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
    FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE SET NULL
);

CREATE TABLE novedades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion_breve TEXT NULL,
    etiqueta ENUM('Novedades', 'Evento', 'Eventos', 'Académico') NOT NULL DEFAULT 'Novedades',
    imagen_portada_url VARCHAR(255) NULL,
    fecha_publicacion DATE NULL,
    estado ENUM('Publicado', 'Borrador') NOT NULL DEFAULT 'Publicado',
    usuario_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE multimedia_galeria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    novedad_id INT,
    url_archivo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (novedad_id) REFERENCES novedades(id) ON DELETE CASCADE
);

CREATE TABLE documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    url_archivo VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    usuario_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

CREATE TABLE bedeles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    anio_asignado ENUM('Primer Año', 'Segundo Año', 'Tercer Año') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);