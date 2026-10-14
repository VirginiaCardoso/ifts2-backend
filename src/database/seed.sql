USE sistema_academico;
-- Poblar tablas con datos iniciales para pruebas y desarrollo.

-- Insertar Usuarios
-- 'password_hash' usa un texto simulado. Debe generarse con bcrypt u otro.
INSERT INTO usuarios (id, nombre_completo, rol_institucional, nivel_de_acceso, correo, password_hash) VALUES
(1, 'Prof. Alicia E. Ruidiaz', 'Rectora', 'Administrador General', 'aruidiaz@ifts2.edu.ar', 'hash_generado_simulado_1'),
(2, 'María del Carmen Canovi', 'Secretaria Académica', 'Gestión Académica', 'mcanovi@ifts2.edu.ar', 'hash_generado_simulado_2');

-- Insertar Autoridades
INSERT INTO autoridades (id, cargo, nombre_responsable) VALUES
(1, 'Rectora', 'Prof. Alicia E. Ruidiaz');

-- Insertar Profesores
INSERT INTO profesores (id, nombre_completo) VALUES
(1, 'Prof. Miguel Colloca');

-- Insertar Materias
INSERT INTO materias (id, nombre, anio_carrera, cuatrimestre, es_promocional) VALUES
(1, 'Seguridad e Higiene en la Gastronomía', '1', 1, TRUE);


-- Insertar Novedades
INSERT INTO novedades (id, titulo, descripcion_breve, etiqueta, imagen_portada_url, fecha_publicacion, usuario_id) VALUES
(1, 'Inscripciones abiertas para el ciclo lectivo 2027', 'El período de preinscripción para la Tecnicatura Superior en Emprendimientos Gastronómicos ya está disponible. Completá el formulario en línea antes del 30 de noviembre.', 'Novedades', 'https://images.unsplash.com/photo-1577219492769-b63a779fac28?w=80&h=60&fit=crop&auto=format', CURDATE(), 1);

-- Vincular Profesor con Materia
INSERT INTO profesor_materia (profesor_id, materia_id) VALUES
(1, 1);

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