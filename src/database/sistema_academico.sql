SET FOREIGN_KEY_CHECKS = 0;
-- Volcando estructura de base de datos para sistema_academico
CREATE DATABASE IF NOT EXISTS `sistema_academico` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `sistema_academico`;

-- Volcando estructura para tabla sistema_academico.autoridades
CREATE TABLE IF NOT EXISTS `autoridades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cargo` varchar(255) NOT NULL,
  `nombre_responsable` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Volcando estructura para tabla sistema_academico.bedeles
CREATE TABLE IF NOT EXISTS `bedeles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `anio_asignado` enum('Primer Año','Segundo Año','Tercer Año') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



-- Volcando estructura para tabla sistema_academico.configuracion_institucional
CREATE TABLE IF NOT EXISTS `configuracion_institucional` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clave` varchar(100) NOT NULL,
  `valor_texto` text DEFAULT NULL,
  `valor_url_archivo` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



-- Volcando estructura para tabla sistema_academico.correlatividades
CREATE TABLE IF NOT EXISTS `correlatividades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `materia_id` int(11) NOT NULL,
  `materia_requisito_id` int(11) NOT NULL,
  `tipo_requisito` enum('CURSADA','APROBADA') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `materia_id` (`materia_id`),
  KEY `materia_requisito_id` (`materia_requisito_id`),
  CONSTRAINT `correlatividades_ibfk_1` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `correlatividades_ibfk_2` FOREIGN KEY (`materia_requisito_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



-- Volcando estructura para tabla sistema_academico.documentos
CREATE TABLE IF NOT EXISTS `documentos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `tipo` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `url_archivo` varchar(255) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `documentos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Volcando estructura para tabla sistema_academico.enlaces_externos
CREATE TABLE IF NOT EXISTS `enlaces_externos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_sistema` varchar(255) NOT NULL,
  `url_destino` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



-- Volcando estructura para tabla sistema_academico.etapas_ingreso
CREATE TABLE IF NOT EXISTS `etapas_ingreso` (
  `id_etapa` int(11) NOT NULL AUTO_INCREMENT,
  `anio` int(11) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `requisitos` text DEFAULT NULL,
  `orden` int(11) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id_etapa`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



-- Volcando estructura para tabla sistema_academico.horarios_cursada
CREATE TABLE IF NOT EXISTS `horarios_cursada` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `dia_semana` enum('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado') NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `cuatrimestre` int(11) NOT NULL,
  `anio` int(11) NOT NULL,
  `materia_id` int(11) NOT NULL,
  `profesor_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `materia_id` (`materia_id`),
  KEY `profesor_id` (`profesor_id`),
  CONSTRAINT `horarios_cursada_ibfk_1` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `horarios_cursada_ibfk_2` FOREIGN KEY (`profesor_id`) REFERENCES `profesores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



-- Volcando estructura para tabla sistema_academico.materias
CREATE TABLE IF NOT EXISTS `materias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `anio_carrera` enum('1','2','3') NOT NULL,
  `cuatrimestre` int(11) DEFAULT NULL,
  `es_anual` tinyint(1) NOT NULL DEFAULT 0,
  `es_promocional` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



-- Volcando estructura para tabla sistema_academico.mesas_examenes
CREATE TABLE IF NOT EXISTS `mesas_examenes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `materia_id` int(11) NOT NULL,
  `periodo` varchar(100) NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `anio_vigencia` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `materia_id` (`materia_id`),
  CONSTRAINT `mesas_examenes_ibfk_1` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



-- Volcando estructura para tabla sistema_academico.mesa_examen_profesor
CREATE TABLE IF NOT EXISTS `mesa_examen_profesor` (
  `mesa_examen_id` int(11) NOT NULL,
  `profesor_id` int(11) NOT NULL,
  PRIMARY KEY (`mesa_examen_id`,`profesor_id`),
  KEY `profesor_id` (`profesor_id`),
  CONSTRAINT `mesa_examen_profesor_ibfk_1` FOREIGN KEY (`mesa_examen_id`) REFERENCES `mesas_examenes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mesa_examen_profesor_ibfk_2` FOREIGN KEY (`profesor_id`) REFERENCES `profesores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



-- Volcando estructura para tabla sistema_academico.multimedia_galeria
CREATE TABLE IF NOT EXISTS `multimedia_galeria` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `novedad_id` int(11) DEFAULT NULL,
  `url_archivo` varchar(255) NOT NULL,
  `tipo` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `novedad_id` (`novedad_id`),
  CONSTRAINT `multimedia_galeria_ibfk_1` FOREIGN KEY (`novedad_id`) REFERENCES `novedades` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Volcando estructura para tabla sistema_academico.novedades
CREATE TABLE IF NOT EXISTS `novedades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `titulo` varchar(255) NOT NULL,
  `descripcion_breve` text DEFAULT NULL,
  `etiqueta` enum('Novedades','Evento','Eventos','Académico') NOT NULL DEFAULT 'Novedades',
  `imagen_portada_url` varchar(255) DEFAULT NULL,
  `fecha_publicacion` date DEFAULT NULL,
  `estado` enum('Publicado','Borrador') NOT NULL DEFAULT 'Publicado',
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `novedades_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Volcando estructura para tabla sistema_academico.profesores
CREATE TABLE IF NOT EXISTS `profesores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_completo` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Volcando estructura para tabla sistema_academico.profesor_materia
CREATE TABLE IF NOT EXISTS `profesor_materia` (
  `profesor_id` int(11) NOT NULL,
  `materia_id` int(11) NOT NULL,
  `rol` enum('titular','ayudante') NOT NULL DEFAULT 'titular',
  PRIMARY KEY (`profesor_id`,`materia_id`,`rol`) USING BTREE,
  KEY `materia_id` (`materia_id`) USING BTREE,
  CONSTRAINT `profesor_materia_ibfk_1` FOREIGN KEY (`profesor_id`) REFERENCES `profesores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `profesor_materia_ibfk_2` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Volcando estructura para tabla sistema_academico.tramites_requisitos
CREATE TABLE IF NOT EXISTS `tramites_requisitos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_tramite` varchar(255) NOT NULL,
  `descripcion_requisitos` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Volcando estructura para tabla sistema_academico.usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_completo` varchar(255) NOT NULL,
  `rol_institucional` varchar(100) DEFAULT NULL,
  `nivel_de_acceso` enum('Administrador General','Gestión Académica') NOT NULL,
  `correo` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `ultimo_acceso` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
SET FOREIGN_KEY_CHECKS = 1;