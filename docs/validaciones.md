# Validaciones y control de errores del panel

No requiere migraciones ni volver a ejecutar seeds. Reiniciar el backend después de actualizarlo.

## Reglas

- Usuarios: nombre y nivel de acceso válidos, correo con formato válido (se guarda sin espacios externos y en minúsculas), correo único al crear y editar. Contraseña inicial o nueva de al menos 8 caracteres y hasta 72 bytes UTF-8 (límite de bcrypt). No se aceptan contraseñas compuestas solo por espacios. Una actualización parcial conserva campos omitidos. El rol institucional, si se informa, no puede ser vacío.
- Materias: nombre obligatorio, año y cuatrimestre válidos; no se repite nombre ignorando mayúsculas y espacios externos dentro del mismo año, cuatrimestre y condición anual. Una materia anual se almacena una sola vez. La propia materia puede guardarse sin cambios.
- Mesas: no se repite la combinación materia, período, fecha, hora y año. El tribunal se modifica editando la mesa existente.
- Horarios: no se repite materia, profesor (incluido sin profesor), día, horas de inicio/fin, cuatrimestre y año. No se prohíben solapamientos: esta tarea solo impide duplicados idénticos.
- Correlatividades: se mantienen las validaciones existentes de materia fija en edición, requisitos no repetidos, referencias válidas y ausencia de ciclos.
- Plantel: se permite repetir nombres de personas. Rol y asignaciones de materias válidos, sin IDs repetidos; guardado transaccional para evitar cambios parciales si fallan las asignaciones.
- Novedades: se permiten títulos repetidos; se mantienen título y etiqueta obligatorios, URL y fecha válidas, con límite de descripción.
- Ingresantes: nombre no vacío de hasta 255 caracteres; descripción y requisitos deben ser texto dentro del límite de la base. Se mantienen año, fechas opcionales válidas y orden.
- Bedeles, autoridades y trámites: se mantienen las comprobaciones existentes de campos obligatorios y longitud. No se agregan restricciones por coincidencias de nombres sin una regla de negocio acordada.
- Enlaces: solo direcciones HTTP/HTTPS válidas de hasta 255 caracteres.

## Interfaz y errores

Los formularios del panel rechazan campos requeridos que contienen solo espacios. La configuración de usuarios usa los nombres exactos de los niveles de acceso del backend y muestra el motivo de rechazo informado por el servidor. Los servicios conservan el estado HTTP y los mensajes de validación; ante fallos de conexión muestran una indicación en español y conservan el formulario.

Las eliminaciones existentes en Usuarios, Novedades, Plantel, Gestión Académica, Carrera e Ingresantes ya solicitan confirmación. El modal compartido comienza con foco en Cancelar, mantiene la navegación con Tab dentro del diálogo, permite Escape para cancelar y bloquea acciones mientras elimina. Carrera mantiene su diálogo propio. Trámites y enlaces no ofrecen eliminación en su interfaz actual.

El backend responde JSON ante contenido mal formado, archivos inválidos o demasiado grandes y errores inesperados. Los conflictos de duplicados devuelven 409, validaciones 400, falta de sesión 401, permisos 403 y registros inexistentes 404. El usuario no recibe detalles SQL internos.

## Comprobación manual

1. Crear usuario con correo válido; repetir cambiando mayúsculas/espacios: se rechaza. Editar correo a uno existente: se rechaza y conserva datos. Probar campo vacío, contraseña corta, correo inválido y edición parcial.
2. Crear materia y repetir nombre en igual año/cuatrimestre: se rechaza; reeditar la original sin cambios funciona; otro cuatrimestre funciona.
3. Crear horario y mesa; repetir o editar otro para igualarlos: se rechaza. Actualizar el original funciona.
4. En cada módulo que elimina: pulsar Eliminar, cancelar y comprobar que conserva el registro; volver a abrir y confirmar.
5. Cortar el backend y guardar: aparece mensaje de conexión, sin borrar el formulario. Reiniciarlo y reintentar.

Las regresiones automatizadas de validaciones, duplicados simultáneos y rollback se ejecutan dentro de la base temporal aislada de carrera.test.js. La suite de Gestión Académica elimina sus fixtures entre casos para que no generen duplicados entre pruebas. La prueba de usuarios usa credenciales iniciales válidas y conserva el caso de contraseña corta para comprobar su rechazo.


## Resultado de verificación (1 de noviembre de 2026)

- Suite backend: 77 pruebas aprobadas y una fallida anterior de Contacto (destinatario de correo no configurado).
- Frontend: compilación y lint completos aprobados.
- Interfaz real: validación de nombre con solo espacios en edición de usuario, mensaje visible y formulario conservado; cancelación sin guardar. Diálogo de eliminación con foco inicial en Cancelar, Tab contenido y Escape para cerrar, sin borrar registros reales.
