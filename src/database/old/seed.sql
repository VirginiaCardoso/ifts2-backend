USE sistema_academico;

-- 1. Insertar Usuarios
INSERT INTO usuarios (id, nombre_completo, rol_institucional, nivel_de_acceso, correo, password_hash) VALUES
(1, 'Prof. Alicia E. Ruidiaz', 'Rectora', 'Administrador General', 'aruidiaz@ifts2.edu.ar', '$2b$10$9cDpixTLfiIf19WfwPIZh.HwQT06qJMVIP5SFRU1/CAtgr4SyJh0C'),
(2, 'María del Carmen Canovi', 'Secretaria Académica', 'Gestión Académica', 'mcanovi@ifts2.edu.ar', '$2b$10$9cDpixTLfiIf19WfwPIZh.HwQT06qJMVIP5SFRU1/CAtgr4SyJh0C')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

-- 2. Insertar Autoridades
INSERT INTO autoridades (cargo, nombre_responsable) VALUES
('RECTORA', 'Prof. Alicia E. Ruidiaz'),
('SECRETARIO ACADÉMICO', 'Lic. Leonardo Bermudez'),
('SECRETARIA ADMINISTRATIVA', 'Prof. María Belén Orellano Camu'),
('JEFATURA DE TRABAJOS PRÁCTICOS', 'Prof. Pedro Perez'),
('TUTOR', 'Prof. Axel Trebino');

-- 3. Insertar Profesores
INSERT INTO profesores (id, nombre_completo) VALUES
(1, 'Prof. Miguel Colloca'),
(2, 'Prof. Gladis Casalegno');

-- 4. Insertar Plan de Materias
INSERT INTO materias (id, nombre, anio_carrera, cuatrimestre, es_anual, es_promocional) VALUES
(1, 'Seguridad e higiene en la gastronomía', '1', NULL, TRUE, FALSE),
(2, 'Elaboración a base de vegetales, cereales y huevos', '1', 1, FALSE, FALSE),
(3, 'Nutrición', '1', 1, FALSE, FALSE),
(4, 'Introducción a la gastronomía', '1', 1, FALSE, TRUE),
(5, 'Taller de primeros Auxilios', '1', 1, FALSE, TRUE),
(6, 'Taller de comunicación escrita', '1', 1, FALSE, TRUE),
(7, 'Elaboración a base de carnes', '1', 2, FALSE, FALSE),
(8, 'Elementos de química', '1', 2, FALSE, FALSE),
(9, 'Principios de economía', '1', 2, FALSE, TRUE),
(10, 'Industria de la hospitalidad', '1', 2, FALSE, TRUE),
(11, 'Práctica Profesional N°1: observación organizacional', '1', 2, FALSE, FALSE),
(12, 'Elaboración de pizzas y pastas', '2', 1, FALSE, FALSE),
(13, 'Elaboraciones de panadería', '2', 1, FALSE, FALSE),
(14, 'Introducción general a la microempresa', '2', 1, FALSE, FALSE),
(15, 'Inglés', '2', 1, FALSE, TRUE),
(16, 'Taller de informática', '2', 1, FALSE, TRUE),
(17, 'Pastelería básica', '2', 2, FALSE, FALSE),
(18, 'Comercialización', '2', 2, FALSE, TRUE),
(19, 'Inglés técnico', '2', 2, FALSE, TRUE),
(20, 'Herramientas de investigación', '2', 2, FALSE, FALSE),
(21, 'Práctica profesional N°2: organización de la producción', '2', 2, FALSE, FALSE),
(22, 'Elementos de administración y contabilidad', '2', NULL, TRUE, FALSE),
(23, 'Elaboración de buffet', '3', 1, FALSE, FALSE),
(24, 'Seminario de actualización/profundización I', '3', 1, FALSE, TRUE),
(25, 'Organización de eventos gastronómicos', '3', 1, FALSE, FALSE),
(26, 'Compras y gestión de stock', '3', 1, FALSE, TRUE),
(27, 'Recursos Humanos', '3', 1, FALSE, FALSE),
(28, 'Taller de francés técnico', '3', 1, FALSE, FALSE),
(29, 'Repostería', '3', 1, FALSE, FALSE),
(30, 'Organización empresarial', '3', 1, FALSE, TRUE),
(31, 'Servicios de catering', '3', 2, FALSE, FALSE),
(32, 'Seminario de actualización/profundización II', '3', 2, FALSE, TRUE),
(33, 'Cocina nacional e internacional', '3', 2, FALSE, FALSE),
(34, 'Taller de conducción de equipos', '3', 2, FALSE, FALSE),
(35, 'Bebidas', '3', 2, FALSE, TRUE),
(36, 'Laboratorio de tecnología de los alimentos', '3', 2, FALSE, FALSE),
(37, 'Práctica profesional N°3: diseño de emprendimientos gastronómicos', '3', 2, FALSE, FALSE);

-- 5. Insertar Correlatividades
INSERT INTO correlatividades (materia_id, materia_requisito_id, tipo_requisito) VALUES
(2, 4, 'CURSADA'), (2, 1, 'CURSADA'), (2, 5, 'CURSADA'),
(7, 2, 'APROBADA'),
(12, 13, 'CURSADA'),
(29, 17, 'CURSADA'),
(36, 8, 'CURSADA'),
(23, 2, 'APROBADA'), (23, 7, 'APROBADA'),
(18, 14, 'CURSADA'), (18, 9, 'APROBADA'),
(33, 2, 'CURSADA'), (33, 7, 'CURSADA'),
(26, 22, 'CURSADA'),
(25, 26, 'CURSADA'), (25, 31, 'CURSADA'),
(11, 6, 'CURSADA'), (11, 4, 'CURSADA'),
(21, 23, 'CURSADA'), (21, 22, 'CURSADA'), (21, 11, 'APROBADA'), (21, 2, 'APROBADA'), (21, 7, 'APROBADA'),
(37, 26, 'CURSADA'), (37, 18, 'APROBADA'), (37, 20, 'APROBADA'), (37, 11, 'APROBADA'), (37, 21, 'APROBADA');

-- 6. Insertar Novedades
INSERT INTO novedades (id, titulo, descripcion_breve, etiqueta, imagen_portada_url, fecha_publicacion, estado, usuario_id) VALUES
(1, 'Inscripciones abiertas para el ciclo lectivo 2027', 'El período de preinscripción ya está disponible.', 'Novedades', 'https://images.unsplash.com/photo-1577219492769-b63a779fac28?w=80&h=60&fit=crop&auto=format', CURDATE(), 'Publicado', 1),
(2, 'Feria gastronómica', 'Invitación a la comunidad a la nueva feria gastronómica', 'Eventos', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOqEEyhNbVfVYi_6JCNTHh6lYSkUeR8WRdKNq3HGEUXrNKaKGczeiLLAdi&s=10', '2026-12-01', 'Borrador', 1),
(3, 'Colación de grado', 'Nueva colación de grado Diciembre', 'Eventos', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcgnsJ2TZMTHpXldRyFISI9sIa_9neiKna4OnF6pNicw&s=10', CURDATE(), 'Borrador', 1);

-- 7. Relacionar Profesor-Materia
INSERT INTO profesor_materia (profesor_id, materia_id, rol) VALUES 
(1, 1, 'titular'),
(2, 1, 'ayudante');

-- 8. Insertar Mesas de Exámenes y relación con Profesor
INSERT INTO mesas_examenes (id, materia_id, periodo, fecha, hora, anio_vigencia) VALUES
(1, 1, 'Marzo 2027', '2027-03-03', '18:00:00', 2027),
(2, 1, 'Marzo 2027', '2027-03-17', '18:00:00', 2027);

INSERT INTO mesa_examen_profesor (mesa_examen_id, profesor_id) VALUES
(1, 1), (2, 1);

-- 9. Insertar Horarios de Cursada
INSERT INTO horarios_cursada (dia_semana, hora_inicio, hora_fin, cuatrimestre, anio, materia_id, profesor_id) VALUES
('Lunes', '18:00:00', '20:00:00', 1, 2027, 1, 1);

-- 10. Insertar Bedeles
INSERT INTO bedeles (nombre, anio_asignado) VALUES 
('Sra. Andrea Barrios', 'Primer Año'),
('Sra. Verónica Alarcón', 'Segundo Año'),
('Sr. Esteban Suárez', 'Tercer Año');

-- 11. Trámites, Requisitos y Enlaces
INSERT INTO tramites_requisitos (nombre_tramite, descripcion_requisitos) VALUES
('Certificado de alumno regular', 'Completar el formulario en Bedelía. Presentar DNI. El certificado se entrega dentro de las 48 hs hábiles.'),
('Analítico parcial', 'Solicitar en Bedelía con al menos 5 días hábiles de anticipación. Presentar DNI y constancia de materias cursadas.'),
('Boleto Estudiantil (SUBE)', 'Completar el formulario online en la web de SUBE. Presentar en Bedelía: DNI, constancia de alumno regular y 1 foto carné.'),
('Certificado de asistencia a examen', 'Solicitarlo en Bedelía el mismo día del examen o hasta 2 días hábiles después. Presentar DNI.'),
('Libre deuda', 'Solicitar en Secretaría Administrativa. Plazo de entrega: 5 días hábiles. Requisito previo: no tener material ni equipamiento a cargo.'),
('Equivalencias de materias', 'Presentar nota de solicitud dirigida a Rectoría, programa analítico de la/s materia/s a homologar y certificado de estudios previos.');

INSERT INTO enlaces_externos (nombre_sistema, url_destino) VALUES
('SIU Guaraní', 'https://guarani.ifts2.edu.ar'),
('Moodle / Aulas Virtuales', 'https://aulasvirtuales.bue.edu.ar/'),
('Becas PROGRESAR', 'https://www.argentina.gob.ar/educacion/progresar'),
('Mi Argentina', 'https://www.miargentina.gob.ar');

-- 12. Configuración Institucional
INSERT INTO configuracion_institucional (clave, valor_texto) VALUES 
('carrera.correlatividades.nota', 'Criterio simplificado: Cursada agrupa cursada aprobada y requisitos en curso; Aprobada exige la materia aprobada. La resolución contempla además hasta un 25% en curso simultáneo para Práctica Profesional N°3. Esa condición se conserva como referencia, sin evaluación automática.');

-- 13. Insertar Etapas de Ingreso
INSERT INTO etapas_ingreso (anio, nombre, descripcion, orden, activo) VALUES
(2027, 'Período de pre-inscripción y carga de documentación', 'Los aspirantes a la carrera completan el formulario de pre-inscripción en línea y adjuntan la documentación requerida.', 1, TRUE),
(2027, 'Curso de preingreso', 'Jornadas de introducción a la carrera, metodología de estudio y presentación institucional.', 2, TRUE);