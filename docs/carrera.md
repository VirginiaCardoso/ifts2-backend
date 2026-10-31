# Carrera y Plan de Estudios

Rama de implementación: feature/carrera en backend y frontend. La pantalla usa materias, profesor_materia, correlatividades y configuracion_institucional existentes; la carga complementaria documentada abajo agrega soporte para materias anuales en bases previas. No añade dependencias.

## Acceso desde la aplicación

1. Iniciar MySQL y ambos servidores con npm.cmd run dev.
2. Ingresar a la Intranet desde el pie de página, con una cuenta existente de Administrador General o Gestión Académica.
3. Seleccionar Carrera en el menú.

Administrador General puede editar toda la sección. Gestión Académica puede editar materias, correlatividades y documentos PDF, pero no el aviso institucional. Las consultas y los PDF son públicos. Los cambios se guardan al confirmar cada acción; no hay un botón de guardado general. La portada consulta los datos al cargar, cuando recibe una señal de guardado desde otra pestaña del mismo navegador y al volver a estar visible o recuperar el foco. No requiere recarga manual para cambios realizados desde el panel en ese navegador.

## Materias

Las escrituras de materias y correlatividades están permitidas para Administrador General y Gestión Académica. Solo Administrador General puede modificar el aviso institucional.

El panel organiza tres años y dos cuatrimestres. Los contadores y docentes provienen de MySQL.

- Agregar materia: formulario al pie del cuatrimestre con nombre y selección múltiple de profesores. Año y cuatrimestre se toman de la tarjeta, y se crea sin promoción; luego puede marcarse promocional.
- Editar: clic en el nombre. Permite modificar nombre, año, cuatrimestre, estado promocional y docentes.
- Promocional: interruptor por materia, con persistencia inmediata.
- Profesores: botón de personas, modal de selección múltiple. Los roles existentes se conservan; las nuevas asociaciones usan titular, valor predeterminado del esquema. La gestión de titular/ayudante se mantiene en Plantel.
- Eliminar: requiere confirmación y ausencia de vínculos. Si hay docentes, horarios, mesas o correlatividades, responde 409 con el conteo. Quitar los docentes, reasignar o eliminar horarios y mesas según corresponda y editar/eliminar las reglas antes de reintentar. El borrado es permanente; no hay archivado.

Las materias existentes sin cuatrimestre aparecen en un listado de pendientes en el panel para corregirlas. No se reemplazan datos ni se importan automáticamente los nombres de las maquetas o de los antiguos arrays del frontend.

### API de materias

GET /api/materias mantiene la lista plana usada por Plantel y Gestión Académica y agrega es_promocional, profesores, profesores_ids y marcas de tiempo. GET /api/materias/:id consulta una materia.

POST /api/materias y PUT /api/materias/:id reciben:

```json
{
  "nombre": "Materia de prueba",
  "anio_carrera": 1,
  "cuatrimestre": 1,
  "es_promocional": false,
  "profesores_ids": [1, 2]
}
```

El nombre es obligatorio y admite hasta 255 caracteres. Año: 1, 2 o 3. Cuatrimestre: número 1 o 2. Promocional: booleano. Los docentes deben existir y no repetirse. PUT recibe todos los datos de la materia; si profesores_ids se omite conserva las asignaciones, y si es [] las quita. POST devuelve 201 y materiaId; PUT devuelve 200.

- PATCH /api/materias/:id/promocional recibe `{ "es_promocional": true }`.
- PUT /api/materias/:id/profesores recibe `{ "profesores_ids": [1, 2] }`.
- DELETE /api/materias/:id elimina solo si no hay asociaciones; responde 409 con error y asociaciones si está bloqueado.

Las escrituras usan Authorization: Bearer TOKEN. Datos inválidos: 400; sesión inválida: 401; rol no autorizado: 403; inexistente: 404; conflicto: 409; fallo interno: 500. El alta y edición con docentes usan transacciones: un docente inexistente no deja una materia o edición parcial.

## Correlatividades

Cada fila del panel agrupa todos los requisitos de una materia. Cada requisito puede ser CURSADA o APROBADA; todos deben cumplirse (no se modelan alternativas OR). Se seleccionan materias existentes con selección múltiple, no texto libre. Se rechazan autorreferencias, requisitos repetidos o presentes en ambas columnas, reglas duplicadas y dependencias circulares.

- POST /api/carrera/correlatividades crea una regla.
- PUT /api/carrera/correlatividades/:id edita la regla completa; :id es el ID de la materia original, NO el ID de una fila de correlatividades. La materia destino permanece fija: solo se editan sus requisitos. Para corregir el nombre se usa Listado de Materias.
- DELETE /api/carrera/correlatividades/:id elimina todos los requisitos de esa materia.

```json
{
  "materia_id": 3,
  "cursadas": [1],
  "aprobadas": [2]
}
```

Debe existir al menos un requisito. Para quitar todos, eliminar la regla. Los reemplazos son transaccionales y se revierten si falla una escritura.

GET /api/carrera devuelve la instantánea pública compartida por el panel y la portada:

```json
{
  "materias": [],
  "correlatividades": [],
  "aviso": "",
  "documentos": {
    "resolucion": null,
    "promocionables": null,
    "correlatividades": null
  }
}
```

Las reglas incluyen materia_id, materia_nombre y listas cursadas/aprobadas de objetos con id y nombre.

## Ciclo lectivo

PUT /api/carrera/aviso recibe `{ "aviso": "Ciclo 2027: Inscripciones abiertas" }`. Texto obligatorio de hasta 255 caracteres. Se almacena bajo la clave carrera.aviso y aparece en el aviso de la sección pública institucional. Inicialmente está vacío si no fue configurado; no se fuerza un ciclo de ejemplo.

## PDF oficiales

Tipos admitidos: resolucion, promocionables y correlatividades. Cada tipo tiene un PDF vigente, con opciones Subir, Ver, Reemplazar y Eliminar con confirmación. El backend guarda los archivos con nombres UUID y verifica tamaño, extensión y firma inicial PDF. Límite: 10 MB. Esta comprobación no constituye un análisis antivirus ni una validación completa del contenido del documento.

- PUT /api/carrera/documentos/:tipo: bytes del archivo como Body binario, Content-Type: application/pdf y X-File-Name con el nombre original codificado con encodeURIComponent. Requiere token de Administrador General o Gestión Académica. No usa multipart/form-data.
- GET /api/carrera/documentos/:tipo/archivo: sirve el PDF para vista/descarga, públicamente.
- DELETE /api/carrera/documentos/:tipo: elimina el PDF vigente y su referencia. Requiere token de Administrador General o Gestión Académica.

Guardar el nombre original solo como metadata evita usar rutas aportadas por el usuario. Los archivos están en uploads/carrera/, excluidos de Git; la metadata está en configuracion_institucional con claves carrera.pdf.TIPO. Al reemplazar, primero se guarda la nueva referencia y luego se limpia el archivo anterior. Al desplegar o mover el backend, preservar esa carpeta junto con la base de datos. Para varios servidores se necesitará almacenamiento compartido; esta entrega usa almacenamiento local.

La portada usa los PDF cargados para Resolución oficial, Materias promocionables y Correlatividades. Si no existe archivo, no muestra un enlace de descarga roto.

## Evidencias de funcionamiento

1. Crear una materia de prueba en un cuatrimestre y verificarla al recargar el panel y la portada.
2. Editar su nombre, año y cuatrimestre desde el nombre; comprobar persistencia.
3. Asignar docentes desde el modal y alternar promocional; verificar la sección pública de promocionables.
4. Intentar eliminarla con un docente asignado: capturar el bloqueo y el conteo. Quitar el docente y, si no hay otros vínculos, eliminarla con confirmación.
5. Crear una regla con varias materias ya existentes, editarla y comprobar la tabla pública; luego eliminarla.
6. Editar el aviso y comprobarlo al recargar la portada.
7. Subir un PDF propio de prueba, abrirlo desde el panel y la página pública, reemplazarlo y eliminarlo.

Realizar las pruebas de borrado únicamente con registros y documentos propios de prueba.

## Verificación automatizada

Desde backend:

```powershell
npm.cmd test -- --runInBand src/test/carrera.test.js
```

La suite crea una base temporal con prefijo ifts_carrera_test_ y cuentas propias; requiere que el usuario MySQL local pueda crear y eliminar esa base. No modifica las materias ni los PDF de la base real. Usa el esquema del repositorio y elimina su base temporal al finalizar. Comprueba ambos roles, CRUD, bloqueo por asociaciones, preservación de rol ayudante, validaciones, reglas circulares, rollback y las tres clases de PDF incluyendo reemplazo, descarga, eliminación y límite de tamaño.

Regresión usada junto a Carrera:

```powershell
npm.cmd test -- --runInBand src/test/carrera.test.js src/test/gestionAcademica.test.js src/test/novedades.test.js src/test/tramites.test.js
```

Las otras suites usan registros temporales en la base local configurada y los limpian, como antes. La compilación del frontend usa npm.cmd run build. Se ejecutó ESLint sobre todos los archivos frontend modificados; los problemas previamente detectados en Ingresantes y las pruebas antiguas de Usuarios/Profesores quedan fuera de este cambio.


## Carga del plan proporcionado y materias anuales

Fuentes: `Materias por año y cuatrimestre.pdf` entregado por el equipo y su lista de Materias Promocionales. Se cargan 37 materias distintas: 11 de primer año, 11 de segundo y 15 de tercero; 14 son promocionales. Las indicaciones «aula taller» describen la modalidad, no forman parte del nombre de la materia. No se crean asignaciones docentes ni correlatividades en esta carga.

Las dos materias anuales son Seguridad e higiene en la gastronomía y Elementos de administración y contabilidad. Se guardan con `es_anual = true` y `cuatrimestre = null`, aparecen en ambos cuatrimestres con la etiqueta Anual y se cuentan una sola vez en el total del año. Las materias sin cuatrimestre que NO tengan es_anual siguen apareciendo como pendientes de corregir. El formulario permite convertir una materia entre anual y cuatrimestral.

El esquema para instalaciones nuevas ya incluye `materias.es_anual`. Para una base previa, el comando siguiente comprueba si falta la columna y la agrega automáticamente; también se incluye su SQL en `src/database/migrations/001_materias_anuales.sql`. No ejecutar esa sentencia manual dos veces. Al agregar columna MySQL realiza un cambio de esquema fuera de la transacción de datos.

Desde la raíz del backend:

```powershell
# Solo consultar qué cambiaría; no escribe datos ni estructura.
npm.cmd run seed:carrera

# Aplicar la migración necesaria y cargar materias/promocionales.
npm.cmd run seed:carrera -- --apply
```

No ejecutar el seed general de nuevo. `src/database/carrera-data.js` contiene los datos y `src/database/seed-carrera.js` la carga. Identifica coincidencias por nombre normalizado (ignora mayúsculas, acentos y puntuación); si encuentra más de una coincidencia para una materia, se detiene para resolver la duplicación. No adivina equivalencias de nombres diferentes. Conserva el ID y nombre de registros existentes y sus vínculos, e inserta los faltantes sin IDs fijos. Actualiza año, cuatrimestre, promoción y anualidad según las fuentes. Si se repite tras editar manualmente esos atributos de una materia oficial, volverá a los valores de esta carga; revisar siempre la vista previa.

En la base local se insertaron 36 materias y se actualizó Seguridad e Higiene conservando su ID. Dejó de ser promocional porque no aparece en la lista proporcionada, y pasó a ser anual. Se guardó una copia previa en la carpeta de trabajo `tmp/carrera-materias-antes-2026-10-29.json`. Los conteos de docentes, horarios, mesas y correlatividades no cambiaron.

POST/PUT de materias aceptan el booleano opcional `es_anual` (por defecto false). Para anual debe enviarse cuatrimestre null; para cuatrimestral, 1 o 2. GET devuelve es_anual como booleano. Ejemplo:

```json
{
  "nombre": "Materia anual de prueba",
  "anio_carrera": 1,
  "cuatrimestre": null,
  "es_anual": true,
  "es_promocional": false,
  "profesores_ids": []
}
```

Las correlatividades de la resolución se cargan con el criterio simplificado de dos categorías acordado por el equipo. «Taller de producción escrita» corresponde a «Taller de comunicación escrita», equivalencia confirmada por el usuario.

Al agregar una regla, el desplegable solo ofrece materias existentes que todavía no tengan regla. Al editar, la materia está bloqueada tanto en la interfaz como en la API. Eliminar una regla borra sus requisitos, nunca la materia. CURSADA agrupa cursada aprobada y requisitos en curso por el criterio simplificado acordado. Los requisitos en curso se agrupan en Cursada; el 25% se conserva como nota, sin evaluación automática.


## Carga de correlatividades con dos categorías

Fuente: resolución MEGC 1202/07, páginas 60–61 entregadas por el equipo. Se cargan 13 reglas (28 requisitos): 17 en CURSADA y 11 en APROBADA. Se conserva la pantalla de dos columnas y no se agrega una categoría EN_CURSO.

- APROBADA: el documento exige la materia aprobada.
- CURSADA: cursada, cursada aprobada, en curso o cursada/en curso. Es una agrupación de presentación acordada para esta entrega, no un evaluador de condiciones de inscripción de alumnos.

La nota pública y administrativa aclara el criterio y conserva la referencia a «hasta el 25% en curso simultáneo» de Práctica Profesional N°3; esa excepción no se evalúa automáticamente. La nota se guarda en configuracion_institucional bajo carrera.correlatividades.nota y GET /api/carrera la devuelve como nota_correlatividades.

Ejecutar después de cargar las materias:

```powershell
# Solo previsualizar.
npm.cmd run seed:correlatividades

# Aplicar la carga.
npm.cmd run seed:correlatividades -- --apply
```

La carga busca IDs reales por los nombres del plan, rechaza nombres faltantes o ambiguos, reglas diferentes ya existentes y dependencias circulares; no sobrescribe reglas editadas ni borra otras reglas. Si todos los requisitos de una materia ya coinciden, los conserva sin duplicarlos. Aplica inserciones en una transacción. No requiere otra migración. Los datos están en src/database/correlatividades-data.js y el cargador en src/database/seed-correlatividades.js.

En la base local se aplicaron las 13 reglas; se guardó copia previa en tmp/carrera-correlatividades-antes-2026-10-29.json de la carpeta de trabajo. Para comparar los requisitos de la fuente con el modelo simplificado: Repostería requiere Pastelería básica en CURSADA, Carnes requiere Vegetales en APROBADA, y la Práctica 1 usa Taller de comunicación escrita en CURSADA.


## Verificación panel → página principal (30/10/2026)

Se probó la interfaz real con dos pestañas y un backend/base temporal aislados de los datos locales habituales. El entorno temporal y sus archivos se eliminaron al terminar.

| Acción desde Carrera | Resultado comprobado en la portada sin recarga manual |
| --- | --- |
| Crear materia con profesor | Aparece en el plan y en la cátedra del docente en Plantel |
| Activar promocional | Aparece en Materias promocionables |
| Editar nombre, año y cuatrimestre | Cambia el nombre y su ubicación en el plan |
| Convertir a anual | Aparece en ambos cuatrimestres con un solo ID |
| Quitar docente | Se actualiza la cátedra del docente en Plantel |
| Crear/editar correlatividades | Se reflejan ambas columnas y sus cambios |
| Eliminar regla | Se retira de la tabla, conservando la materia |
| Eliminar materia de prueba sin vínculos | Se retira del plan y de promocionables |
| Guardar aviso | Se actualiza el aviso en la sección institucional |
| Subir los tres PDF | Aparecen sus enlaces en las tres secciones públicas |
| Reemplazar resolución | El enlace sirve los bytes del nuevo PDF, verificado por SHA-256 |
| Eliminar los tres PDF | Desaparecen los enlaces de las tres secciones |

La sincronización usa una señal de storage entre pestañas y un evento local tras escrituras exitosas de Carrera; también consulta al recuperar foco o visibilidad. El plantel público escucha la misma señal porque Carrera modifica las asignaciones docentes. Las respuestas antiguas de consultas en paralelo no reemplazan las más recientes. Se limpian los listeners al desmontar los componentes. No usa sondeo periódico ni modifica variables de entorno. No es una suscripción entre dispositivos: en otros navegadores se consulta al volver al sitio o recargarlo.

La compilación y ESLint de los archivos frontend modificados pasaron. Las pruebas no cambiaron materias, aviso, reglas ni documentos reales.


## Descargas públicas de PDF

Las secciones Plan de estudios, Materias promocionables y Correlatividades muestran botones de descarga. Se habilitan cuando el documento correspondiente fue cargado desde Carrera; sin archivo quedan deshabilitados.

GET /api/carrera/documentos/:tipo/archivo conserva la visualización inline usada por «Ver» en el panel. Con ?descargar=1 responde con Content-Disposition: attachment y el nombre original codificado en UTF-8. La descarga entrega los mismos bytes del PDF almacenado.

Verificación: las 12 pruebas de Carrera pasaron, incluyendo visualización y descarga de los tres tipos de PDF; también pasaron la compilación del frontend y ESLint del componente modificado.
