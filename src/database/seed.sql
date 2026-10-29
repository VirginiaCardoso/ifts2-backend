USE sistema_academico;
-- Poblar tablas con datos iniciales para pruebas y desarrollo.

-- Insertar Usuarios
INSERT INTO usuarios (id, nombre_completo, rol_institucional, nivel_de_acceso, correo, password_hash) VALUES
(1, 'Prof. Alicia E. Ruidiaz', 'Rectora', 'Administrador General', 'aruidiaz@ifts2.edu.ar', '$2b$10$9cDpixTLfiIf19WfwPIZh.HwQT06qJMVIP5SFRU1/CAtgr4SyJh0C'),
(2, 'María del Carmen Canovi', 'Secretaria Académica', 'Gestión Académica', 'mcanovi@ifts2.edu.ar', '$2b$10$9cDpixTLfiIf19WfwPIZh.HwQT06qJMVIP5SFRU1/CAtgr4SyJh0C')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

-- Insertar Autoridades
INSERT INTO autoridades (cargo, nombre_responsable) VALUES
('RECTORA', 'Prof. Alicia E. Ruidiaz'),
('SECRETARIO ACADÉMICO', 'Lic. Leonardo Bermudez'),
('SECRETARIA ADMINISTRATIVA', 'Prof. María Belén Orellano Camu'),
('JEFATURA DE TRABAJOS PRÁCTICOS', 'Prof. Pedro Perez'),
('TUTOR', 'Prof. Axel Trebino');

-- Insertar Profesores
INSERT INTO profesores (id, nombre_completo) VALUES
(1, 'Prof. Miguel Colloca');
INSERT INTO `profesores` (`id`, `nombre_completo`, `created_at`, `updated_at`) VALUES (2, 'Prof. Gladis Casalegno', '2026-10-22 18:45:13', '2026-10-22 18:45:13');


-- Insertar Materias
INSERT INTO materias (id, nombre, anio_carrera, cuatrimestre, es_promocional) VALUES
(1, 'Seguridad e Higiene en la Gastronomía', '1', 1, TRUE);


-- Insertar Novedades
INSERT INTO novedades (id, titulo, descripcion_breve, etiqueta, imagen_portada_url, fecha_publicacion, estado, usuario_id) VALUES
(1, 'Inscripciones abiertas para el ciclo lectivo 2027', 'El período de preinscripción para la Tecnicatura Superior en Emprendimientos Gastronómicos ya está disponible. Completá el formulario en línea antes del 30 de noviembre.', 'Novedades', 'https://images.unsplash.com/photo-1577219492769-b63a779fac28?w=80&h=60&fit=crop&auto=format', CURDATE(),'Publicado', 1);
INSERT INTO novedades (id, titulo, descripcion_breve, etiqueta, imagen_portada_url, fecha_publicacion, estado, usuario_id) VALUES (2, 'Feria  gastronómica', 'Invitación a la comunidad a la nueva feria gastronómica', 'Eventos', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOqEEyhNbVfVYi_6JCNTHh6lYSkUeR8WRdKNq3HGEUXrNKaKGczeiLLAdi&s=10', '2026-12-01', 'Borrador', 1);
INSERT INTO novedades (id, titulo, descripcion_breve, etiqueta, imagen_portada_url, fecha_publicacion, estado, usuario_id) VALUES (3, 'Colación de grado', 'Nueva colación de grado Diciembre', 'Eventos', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcgnsJ2TZMTHpXldRyFISI9sIa_9neiKna4OnF6pNicw&s=10', CURDATE(), 'Borrador', 1);



-- Vincular Profesor con Materia
INSERT INTO `profesor_materia` (`profesor_id`, `materia_id`, `rol`) VALUES (1, 1, 'titular');
INSERT INTO `profesor_materia` (`profesor_id`, `materia_id`, `rol`) VALUES (2, 1, 'ayudante');


-- Insertar Mesas de Exámenes (Dos fechas distintas para la misma materia)
INSERT INTO mesas_examenes (id, materia_id, periodo, fecha, hora, anio_vigencia) VALUES
(1, 1, 'Marzo 2027', '2027-03-03', '18:00:00', 2027),
(2, 1, 'Marzo 2027', '2027-03-17', '18:00:00', 2027);

-- Vincular Profesor con las Mesas de Exámenes
INSERT INTO mesa_examen_profesor (mesa_examen_id, profesor_id) VALUES
(1, 1),
(2, 1);

-- Insertar Horarios de Cursada
INSERT INTO horarios_cursada (dia_semana, hora_inicio, hora_fin, cuatrimestre, anio, materia_id, profesor_id) VALUES
('Lunes', '18:00:00', '20:00:00', 1, 2027, 1, 1);

INSERT INTO bedeles (nombre, anio_asignado) VALUES 
('Sra. Andrea Barrios', 'Primer Año'),
('Sra. Verónica Alarcón', 'Segundo Año'),
('Sr. Esteban Suárez', 'Tercer Año');

-- Insertar Trámites y Requisitos iniciales
INSERT INTO tramites_requisitos (nombre_tramite, descripcion_requisitos) VALUES
('Certificado de alumno regular', 'Completar el formulario en Bedelía. Presentar DNI. El certificado se entrega dentro de las 48 hs hábiles.'),
('Analítico parcial', 'Solicitar en Bedelía con al menos 5 días hábiles de anticipación. Presentar DNI y constancia de materias cursadas.'),
('Boleto Estudiantil (SUBE)', 'Completar el formulario online en la web de SUBE. Presentar en Bedelía: DNI, constancia de alumno regular y 1 foto carné.'),
('Certificado de asistencia a examen', 'Solicitarlo en Bedelía el mismo día del examen o hasta 2 días hábiles después. Presentar DNI.'),
('Libre deuda', 'Solicitar en Secretaría Administrativa. Plazo de entrega: 5 días hábiles. Requisito previo: no tener material ni equipamiento a cargo.'),
('Equivalencias de materias', 'Presentar nota de solicitud dirigida a Rectoría, programa analítico de la/s materia/s a homologar y certificado de estudios previos.');

INSERT INTO enlaces_externos (nombre_sistema, url_destino) VALUES
('SIU Guaraní', 'https://guarani.ifts2.edu.ar'),
('Moodle / Aulas Virtuales', 'https://aulas.ifts2.edu.ar'),
('Becas PROGRESAR', 'https://www.argentina.gob.ar/educacion/progresar'),
('Mi Argentina', 'https://www.miargentina.gob.ar');