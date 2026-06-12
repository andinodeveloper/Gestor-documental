# Especificación funcional y técnica inicial — Aplicación de Gestión Documental

> Archivo preparado para cargar en Codex como requerimiento base de construcción de la aplicación.
>
> Fecha de preparación: 2026-05-29
>
> Objetivo: crear una aplicación web multiusuario para administrar documentos normativos y de soporte, con clasificación documental por procesos, tipos documentales, control de versiones, flujo de revisión/aprobación, trazabilidad, relaciones entre documentos y archivo histórico.

---

## 1. Instrucción principal para Codex

Construir una aplicación web funcional para gestionar el ciclo de vida completo de documentos internos de una empresa privada del sector retail.

La aplicación debe permitir:

1. Administrar usuarios, roles y permisos granulares.
2. Crear y mantener un esquema documental tipo árbol:
   - Sistema documental.
   - Macrogrupo de procesos.
   - Proceso.
   - Tipo documental.
   - Documentos oficiales, borradores y obsoletos.
3. Registrar documentos con código único, tipo documental, proceso, versión mayor/menor y archivos asociados.
4. Gestionar solicitudes de elaboración o actualización documental.
5. Gestionar borradores, revisión, aprobación y oficialización.
6. Controlar versiones mayores y menores con historial de cambios.
7. Relacionar documentos entre sí y mantener trazabilidad histórica de esas relaciones.
8. Dar de baja documentos únicamente cuando exista un documento sustituto definido.
9. Transferir, inactivar o migrar relaciones documentales cuando un documento sea sustituido.
10. Permitir consulta de documentos oficiales a usuarios lectores sin descarga por defecto.
11. Permitir solicitudes y otorgamiento de permisos de descarga.
12. Descargar historiales de versiones, cambios y árboles de relaciones documentales.
13. Registrar bitácora/auditoría de acciones relevantes.

Si el repositorio ya tiene un stack tecnológico definido, respetarlo. Si no existe stack definido, implementar con una arquitectura web moderna, preferiblemente:

- Frontend/backend: `Next.js` + `TypeScript`.
- UI: componentes reutilizables, diseño limpio y responsivo.
- Base de datos: `PostgreSQL`.
- ORM: `Prisma`.
- Autenticación: sesión con email/usuario y contraseña.
- Almacenamiento de archivos: local en desarrollo, con una capa de servicio preparada para migrar posteriormente a S3, MinIO, Azure Blob, SharePoint u otro repositorio.
- Visualización de relaciones: componente tipo árbol/grafo, por ejemplo con React Flow u otra librería equivalente.
- Exportaciones: CSV/Excel para tablas y JSON para trazabilidad técnica; dejar preparado PDF si el stack lo permite.

---

## 2. Alcance inicial de la aplicación

### 2.1 Módulos mínimos

1. **Autenticación y usuarios**
   - Login.
   - Gestión de usuarios.
   - Activación/inactivación.
   - Asignación de roles.
   - Permisos granulares por módulo/acción.

2. **Catálogos maestros**
   - Macrogrupos de procesos.
   - Procesos.
   - Tipos documentales.
   - Estados documentales.
   - Motivos de baja/archivo.
   - Tipos de relación documental.

3. **Documentos**
   - Registro de documento.
   - Clasificación por proceso y tipo documental.
   - Código único.
   - Versiones mayores y menores.
   - Historial de cambios.
   - Archivos borrador, oficial y anexos.
   - Estado del documento.

4. **Solicitudes de elaboración o actualización**
   - Creación de solicitud.
   - Adjuntar anexos/borradores.
   - Tablero de seguimiento para administrador.
   - Asignación de editor responsable.
   - Conversión de solicitud en documento nuevo o nueva versión.

5. **Flujo de revisión, aprobación y oficialización**
   - Carga de borrador.
   - Selección flexible de revisores y aprobadores.
   - Aprobación/rechazo individual.
   - Rechazo obligatorio con observaciones.
   - Iteración hasta aprobación unánime.
   - Carga de versión definitiva/oficial.
   - Publicación para lectores.

6. **Relaciones documentales**
   - Relación muchos-a-muchos entre documentos.
   - Tipos de relación.
   - Activación/inactivación de relaciones.
   - Migración de relaciones al sustituir un documento.
   - Visualización del árbol de relaciones.
   - Exportación del árbol de relaciones.

7. **Archivo histórico / obsoletos**
   - Baja controlada de documentos.
   - Documento sustituto obligatorio.
   - Motivo de baja.
   - Fecha de baja.
   - Trazabilidad de relaciones inactivadas/migradas.

8. **Consulta documental**
   - Explorador por árbol de carpetas.
   - Buscador por código, nombre, tipo, proceso, estado, versión.
   - Vista de documento oficial.
   - Lectura sin descarga por defecto para usuarios lectores.
   - Solicitud de permiso de descarga.

9. **Auditoría y trazabilidad**
   - Registro de acciones críticas.
   - Historial descargable de cambios y versiones.
   - Historial de relaciones.
   - Historial de aprobaciones/rechazos.

---

## 3. Roles y permisos

### 3.1 Roles base

#### ADMINISTRADOR

Responsable del gobierno y control de la aplicación.

Debe poder:

- Administrar usuarios.
- Administrar roles y permisos.
- Administrar catálogos maestros.
- Ver todas las solicitudes.
- Asignar solicitudes a editores.
- Ver todos los documentos.
- Otorgar o revocar permisos de descarga.
- Consultar auditoría.
- Descargar reportes e historiales.
- Intervenir en flujos cuando sea necesario.

#### EDITOR

Responsable de la operación documental.

Debe poder:

- Crear documentos.
- Editar metadatos de documentos bajo su responsabilidad.
- Cargar borradores.
- Someter borradores a revisión y aprobación.
- Seleccionar revisores y aprobadores para cada documento.
- Consolidar observaciones.
- Cargar nuevas versiones de borrador cuando haya rechazos.
- Cargar versión definitiva cuando exista aprobación unánime.
- Oficializar documentos cuando el flujo lo permita.
- Crear y administrar relaciones documentales.
- Mover documentos a archivo histórico cuando corresponda.
- Gestionar documentos sustitutos.
- Descargar historiales y árboles de relación.
- Otorgar permisos de descarga cuando la política lo permita.

#### LECTOR

Usuario consultivo.

Debe poder:

- Ver únicamente documentos oficiales vigentes a los que tenga acceso.
- Leer documentos oficiales desde la aplicación.
- Buscar documentos oficiales.
- Consultar datos básicos del documento.
- Solicitar permiso de descarga.

No debe poder:

- Editar documentos.
- Cargar archivos.
- Cambiar metadatos.
- Descargar documentos salvo que tenga permiso explícito.
- Ver borradores salvo permiso especial.

### 3.2 Roles temporales por documento

Estos no deben funcionar necesariamente como roles globales permanentes. Deben ser asignaciones temporales dentro de un flujo específico.

#### REVISOR DEL DOCUMENTO

Asignado por el editor para un borrador y ronda específica.

Debe poder:

- Ver el borrador asignado.
- Agregar comentarios u observaciones.
- Aprobar o rechazar.
- Si rechaza, debe registrar observaciones obligatorias.
- Puede agregar sugerencias de cambio.

#### APROBADOR DEL DOCUMENTO

Asignado por el editor para un borrador y ronda específica.

Debe poder:

- Ver el borrador asignado.
- Aprobar o rechazar.
- Si rechaza, debe registrar observaciones obligatorias.
- Su decisión forma parte de la aprobación unánime requerida.

### 3.3 Permisos granulares sugeridos

Implementar permisos por acción, como mínimo:

- `users.manage`
- `roles.manage`
- `catalogs.manage`
- `documents.create`
- `documents.read.official`
- `documents.read.draft`
- `documents.update.metadata`
- `documents.upload.draft`
- `documents.upload.official`
- `documents.submit_review`
- `documents.review`
- `documents.approve`
- `documents.officialize`
- `documents.archive`
- `documents.relate`
- `documents.download`
- `documents.download.grant`
- `requests.create`
- `requests.assign`
- `requests.manage`
- `audit.read`
- `reports.export`

---

## 4. Esquema documental tipo árbol

El árbol documental debe ser lógico dentro de la base de datos. No debe depender de carpetas físicas, aunque puede reflejarse visualmente como carpetas.

### 4.1 Estructura principal

```text
SISTEMA DOCUMENTAL PROCESOS
├── PROCESOS ESTRATÉGICOS - PE
│   ├── PE01 - Planeación Estratégica
│   ├── PE02 - Gestión de la Dirección General
│   ├── PE03 - Gobierno Corporativo y Cumplimiento
│   ├── PE04 - Gestión de Indicadores y Desempeño
│   └── PE05 - Inteligencia de Negocios y Analítica
├── PROCESOS CLAVE - PC
│   ├── PC01 - Administración de Categorías
│   ├── PC02 - Compras, Sourcing y Alianzas Estratégicas
│   ├── PC03 - Investigación y Desarrollo de Nuevos Productos
│   ├── PC04 - Manufactura de Productos
│   ├── PC05 - Centros de Distribución y Logística
│   ├── PC06 - Operación de Salas de Ventas
│   ├── PC07 - E-Commerce y Canales Digitales
│   ├── PC08 - Atención y Experiencia del Cliente
│   └── PC09 - Gestión de Devoluciones y Servicio Postventa
├── PROCESOS DE SOPORTE - PS
│   ├── PS01 - Gestión del talento humano
│   ├── PS02 - Gestión financiera y contable
│   ├── PS03 - Gestión de Tecnología y Sistemas de Información
│   ├── PS04 - Mantenimiento e Infraestructura
│   ├── PS05 - Mercadeo, marca y comunicación
│   ├── PS06 - Seguridad Operativa y Patrimonial
│   ├── PS07 - Control de Calidad Operativa
│   └── PS08 - Gestión de Acreedores y Contratación
└── PROCESOS DE EVALUACIÓN Y MEJORA - PM
    ├── PM01 - Auditoría y Control Interno
    ├── PM02 - Gestión de Indicadores y KPI de Proceso
    ├── PM03 - Mejora Continua y Transformación Operacional
    ├── PM04 - Gestión de Riesgos Integrales
    └── PM05 - Satisfacción del Cliente
```

### 4.2 Subcarpetas por tipo documental dentro de cada proceso

Cada proceso debe poder contener subcarpetas o agrupaciones lógicas por tipo documental:

- `POL` - POLÍTICAS
- `PRO` - PROCEDIMIENTOS
- `NOR` - NORMAS
- `LIN` - LINEAMIENTOS
- `INS` - INSTRUCTIVOS
- `GUI` - GUÍAS
- `FOR` - FORMATOS
- `PLA` - PLANES
- `INF` - INFORMES O REPORTES
- `REG` - REGISTROS
- `MAN` - MANUAL
- `MIN` - MINUTA
- `ATC` - ANÁLISIS TÉCNICO
- `PRY` - PROYECTOS
- `ACT` - ACTAS
- `EVA` - EVALUACIONES
- `MEM` - MEMORANDOS
- `SOL` - SOLICITUDES
- `ESD` - ESQUEMAS DOCUMENTALES
- `IND` - INDICACIONES
- `PRG` - PROGRAMAS
- `OBSOLETOS` - OBSOLETOS



---

## 5. Catálogo de procesos para semilla inicial

### PROCESOS ESTRATÉGICOS - PE

- `PE01` - Planeación Estratégica
- `PE02` - Gestión de la Dirección General
- `PE03` - Gobierno Corporativo y Cumplimiento
- `PE04` - Gestión de Indicadores y Desempeño
- `PE05` - Inteligencia de Negocios y Analítica

### PROCESOS CLAVE - PC

- `PC01` - Administración de Categorías
- `PC02` - Compras, Sourcing y Alianzas Estratégicas
- `PC03` - Investigación y Desarrollo de Nuevos Productos
- `PC04` - Manufactura de Productos
- `PC05` - Centros de Distribución y Logística
- `PC06` - Operación de Salas de Ventas
- `PC07` - E-Commerce y Canales Digitales
- `PC08` - Atención y Experiencia del Cliente
- `PC09` - Gestión de Devoluciones y Servicio Postventa

### PROCESOS DE SOPORTE - PS

- `PS01` - Gestión del talento humano
- `PS02` - Gestión financiera y contable
- `PS03` - Gestión de Tecnología y Sistemas de Información
- `PS04` - Mantenimiento e Infraestructura
- `PS05` - Mercadeo, marca y comunicación
- `PS06` - Seguridad Operativa y Patrimonial
- `PS07` - Control de Calidad Operativa
- `PS08` - Gestión de Acreedores y Contratación

### PROCESOS DE EVALUACIÓN Y MEJORA - PM

- `PM01` - Auditoría y Control Interno
- `PM02` - Gestión de Indicadores y KPI de Proceso
- `PM03` - Mejora Continua y Transformación Operacional
- `PM04` - Gestión de Riesgos Integrales
- `PM05` - Satisfacción del Cliente


---

## 6. Catálogo de tipos documentales

### 6.1 Tipos documentales principales

| Código | Tipo Documental | Frecuencia de revisión recomendada |
| --- | --- | --- |
| POL | Política | Cada 2 años o al cambiar el marco normativo o estratégico |
| PRO | Procedimiento | Anual o cuando el proceso sufra cambios |
| NOR | Norma | Cada 2 años o cuando exista un cambio en el marco regulatorio |
| LIN | Lineamiento | Cada 2 años o cuando cambien los criterios o recomendaciones clave |
| INS | Instructivo | Cada vez que se actualice el sistema o equipo relacionado |
| GUI | Guía | Cada 2 años o ante cambios significativos en el contexto |
| FOR | Formato / Formulario | Cada vez que se modifiquen los datos requeridos o los procesos relacionados |
| PLA | Plan | Anual o por cada ciclo operativo |
| INF | Reporte / Informe | Según periodicidad del reporte (mensual, trimestral, puntual, etc.) |
| REG | Registro | No aplica. Se conserva según tabla de retención documental |
| MAN | Manual | Cada 2 años o ante reestructuraciones mayores |

### 6.2 Tipos documentales secundarios

| Código | Tipo Documental | Frecuencia de revisión recomendada |
| --- | --- | --- |
| MIN | Minuta | No aplica. Se genera por evento |
| ATC | Análisis Técnico | Se genera por evento; no requiere revisión periódica |
| PRY | Proyecto | Durante el ciclo de vida del proyecto y cierre formal |
| ACT | Acta | No aplica. Se genera y archiva por evento |
| EVA | Evaluación | Según ciclo de evaluación definido (mensual, semestral, anual) |
| MEM | Memorando | No aplica. Se emite por necesidad y se archiva |
| SOL | Solicitud | No aplica. Se genera y gestiona según flujo o proceso |
| ESD | Esquemas Documentales | Anual o cada vez que se produzcan cambios estructurales |
| IND | Indicaciones | No aplica, es temporal por evento |
| PRG | Programa | Al inicio de cada periodo planificado (por ejemplo, anual) |

El sistema debe permitir mantener estos tipos documentales desde catálogo, incluyendo:

- Código.
- Nombre.
- Categoría: principal/secundario.
- Definición detallada.
- Qué debe contener.
- Qué no debe contener.
- Casos comunes de uso.
- Frecuencia de revisión recomendada.
- Estado activo/inactivo.

---

## 7. Reglas de codificación documental

### 7.1 Código único del documento

El documento debe tener un código único de identidad formado por:

```text
[TIPO_DOCUMENTAL]-[CORRELATIVO]
```

Ejemplo:

```text
POL-001
```

Este código identifica la esencia del documento y debe mantenerse aunque el documento cambie de nombre.

### 7.2 Código con versión

Cada versión debe representarse como:

```text
[TIPO_DOCUMENTAL]-[CORRELATIVO]-V[MAYOR].[MENOR]
```

Ejemplo:

```text
POL-001-V1.0
POL-001-V1.1
POL-001-V2.0
```

### 7.3 Versiones mayores

Incrementan cuando existen cambios de contenido, alcance, reglas, responsabilidades o eliminación/adición de información relevante.

Ejemplo:

```text
POL-001-V1.0 → POL-001-V2.0
```

### 7.4 Versiones menores

Incrementan cuando existen cambios de forma, formato, reestructuración, correcciones no sustantivas o ajustes que no agregan ni eliminan contenido relevante.

Ejemplo:

```text
POL-001-V1.0 → POL-001-V1.1
```

### 7.5 Correlativo por tipo documental

El correlativo debe ser independiente por tipo documental.

Ejemplo:

- `POL-001`
- `POL-002`
- `PRO-001`
- `PRO-002`

Debe existir una tabla o mecanismo transaccional que controle el siguiente correlativo por tipo documental para evitar duplicados.

### 7.6 Borradores de documentos nuevos

Mientras un documento nuevo esté en fase de borrador, puede tener una nomenclatura temporal no oficial. La codificación oficial debe asignarse al momento de oficializar el documento por primera vez.

Sugerencia para implementación inicial:

```text
BOR-[AÑO]-[CORRELATIVO_TEMPORAL]
```

Ejemplo:

```text
BOR-2026-0001
```

Esta nomenclatura temporal debe poder cambiarse cuando se oficialice el documento.

### 7.7 Borradores de nuevas versiones

Cuando el borrador corresponde a una nueva versión de un documento ya existente, debe conservar la trazabilidad del código único del documento y el sistema debe mostrar claramente la versión propuesta.

---

## 8. Estados sugeridos

### 8.1 Estado del documento

- `DRAFT` / Borrador.
- `IN_REVIEW` / En revisión y aprobación.
- `APPROVED_DRAFT` / Borrador aprobado.
- `OFFICIAL` / Oficial vigente.
- `ARCHIVED` / Archivado histórico.
- `OBSOLETE` / Obsoleto.
- `CANCELLED` / Cancelado.

### 8.2 Estado de una versión documental

- `DRAFT`
- `SUBMITTED`
- `IN_REVIEW`
- `REJECTED`
- `APPROVED`
- `OFFICIAL`
- `SUPERSEDED`
- `ARCHIVED`

### 8.3 Estado de solicitud documental

- `PENDING_ASSIGNMENT`
- `ASSIGNED`
- `IN_PROGRESS`
- `IN_REVIEW`
- `OBSERVED`
- `APPROVED`
- `OFFICIALIZED`
- `CLOSED`
- `CANCELLED`

### 8.4 Estado de asignación de revisión/aprobación

- `PENDING`
- `APPROVED`
- `REJECTED`

---

## 9. Flujo de solicitud documental

### 9.1 Creación de solicitud

Un usuario autorizado debe poder crear una solicitud de elaboración o actualización documental.

Campos mínimos:

- Código de solicitud.
- Tipo de solicitud: nuevo documento / actualización de documento existente.
- Solicitante.
- Área solicitante.
- Proceso relacionado.
- Tipo documental sugerido.
- Título sugerido.
- Descripción de la necesidad.
- Justificación.
- Prioridad.
- Fecha requerida.
- Anexos.
- Borrador inicial, si existe.
- Estado.

### 9.2 Tablero del administrador

Las solicitudes deben aparecer en un tablero para el administrador.

El administrador debe poder:

- Ver solicitudes pendientes.
- Filtrar por estado, prioridad, fecha, solicitante, proceso y tipo documental.
- Asignar la solicitud a un editor.
- Reasignar.
- Cancelar justificadamente.
- Ver avance.

### 9.3 Seguimiento por editor

El editor asignado debe poder:

- Analizar la solicitud.
- Crear documento nuevo o nueva versión.
- Asociar la solicitud al documento.
- Cargar borradores.
- Someter a revisión/aprobación.
- Cerrar solicitud cuando el documento quede oficializado o cuando se determine que no procede.

---

## 10. Flujo de borrador, revisión, aprobación y oficialización

### 10.1 Carga de borrador

El editor debe cargar un borrador del documento.

El borrador debe incluir:

- Archivo.
- Título propuesto.
- Tipo documental.
- Proceso.
- Descripción.
- Justificación.
- Versión propuesta.
- Resumen de cambios, si es una nueva versión.
- Revisores seleccionados.
- Aprobadores seleccionados.

### 10.2 Asignación de revisores y aprobadores

El editor debe poder elegir usuarios específicos para participar en el flujo.

Reglas:

- Un documento puede tener varios revisores.
- Un documento puede tener varios aprobadores.
- Revisores y aprobadores son asignaciones temporales por documento, versión y ronda.
- El rol temporal finaliza cuando el borrador es aprobado unánimemente y oficializado, o cuando el flujo se cancela.

### 10.3 Revisión y aprobación

Cada revisor/aprobador debe poder:

- Ver el borrador.
- Registrar comentarios.
- Aprobar.
- Rechazar.

Si rechaza:

- Debe registrar observaciones obligatorias.
- El sistema no debe permitir rechazo sin observaciones.
- El flujo debe quedar observado/rechazado.
- El editor debe subir un nuevo borrador para una nueva ronda.

### 10.4 Aprobación unánime

El borrador solo puede pasar a la siguiente etapa cuando todos los revisores y aprobadores asignados hayan aprobado.

Cuando exista aprobación unánime:

- El estado del borrador pasa a `APPROVED_DRAFT`.
- El sistema solicita cargar la versión definitiva/oficial.
- El editor carga el archivo oficial.
- El sistema oficializa la versión.
- La versión oficial queda visible para lectores según permisos.

### 10.5 Edición tipo Git / comentarios y sugerencias

Requerimiento avanzado: los revisores/aprobadores deben poder hacer comentarios y sugerencias, idealmente con una lógica tipo ramas y consolidación.

Para la primera versión funcional, implementar como mínimo:

- Comentarios por borrador.
- Sugerencias de cambio por usuario.
- Estado de sugerencia: pendiente, aceptada, rechazada, aplicada.
- Registro de quién comentó, cuándo y en qué ronda.
- Vista de consolidación para el editor.

Preparar la arquitectura para una fase posterior de edición colaborativa con integración a un editor documental como OnlyOffice, Collabora, Google Drive, Microsoft 365 u otro, si se confirma.

---

## 11. Control de versiones

Cada documento puede tener múltiples versiones mayores y menores.

El sistema debe registrar:

- Código único del documento.
- Versión mayor.
- Versión menor.
- Código completo de versión.
- Fecha de creación.
- Fecha de oficialización.
- Usuario creador.
- Editor responsable.
- Resumen de cambios.
- Tipo de cambio: mayor/menor.
- Archivo asociado.
- Estado.
- Versión anterior relacionada.

### 11.1 Historial descargable

Debe existir una opción para descargar el historial de versiones y cambios de un documento.

La descarga debe incluir como mínimo:

- Código de documento.
- Nombre del documento.
- Tipo documental.
- Proceso.
- Versión.
- Fecha.
- Estado.
- Usuario responsable.
- Resumen de cambios.
- Motivo del cambio.
- Archivo asociado, si aplica.
- Relación con solicitud, si aplica.

---

## 12. Relaciones documentales

### 12.1 Relación muchos-a-muchos

Un documento puede estar relacionado con múltiples documentos.

Una relación debe registrar:

- Documento origen.
- Documento destino.
- Tipo de relación.
- Descripción.
- Estado activo/inactivo.
- Fecha de creación.
- Usuario creador.
- Fecha de inactivación, si aplica.
- Motivo de inactivación, si aplica.
- Documento o relación sustituta, si aplica.

### 12.2 Tipos de relación sugeridos

- `RELATED_TO` / Relacionado con.
- `REFERENCES` / Referencia a.
- `AFFECTS` / Afecta a.
- `DEPENDS_ON` / Depende de.
- `REPLACES` / Sustituye a.
- `REPLACED_BY` / Sustituido por.
- `DERIVED_FROM` / Derivado de.
- `SUPPORTS` / Soporta.

### 12.3 Persistencia histórica

Cuando un documento cambia de versión, las relaciones del documento deben conservarse asociadas al documento base, no perderse por la nueva versión.

La relación debe poder indicar si aplica a:

- Todo el documento.
- Una versión específica.
- Una versión desde/hasta determinada.

### 12.4 Inactivación en vez de eliminación

Por trazabilidad, no eliminar relaciones físicamente.

Cuando una relación ya no aplique:

- Marcar como inactiva.
- Registrar motivo.
- Registrar usuario.
- Registrar fecha.
- Opcionalmente registrar nueva relación que la sustituye.

### 12.5 Árbol de relaciones

El sistema debe mostrar un árbol o grafo de relaciones para cada documento.

Debe permitir:

- Ver documentos relacionados directos.
- Ver relaciones de segundo nivel.
- Distinguir relaciones activas e inactivas.
- Identificar documentos obsoletos o archivados.
- Exportar el árbol.

Formatos sugeridos de exportación:

- JSON para trazabilidad técnica.
- CSV/Excel para análisis.
- Imagen o PDF si se implementa visualización gráfica exportable.

---

## 13. Baja, archivo histórico y documentos obsoletos

### 13.1 Regla principal

Cuando un documento se da de baja y pasa a archivo histórico, debe definirse cuál documento lo sustituye.

No se debe permitir archivar un documento vigente si:

- No se ha definido documento sustituto.
- No se ha registrado motivo de baja.
- No se han revisado sus relaciones documentales activas.

### 13.2 Migración de relaciones

Si un documento dado de baja es sustituido por uno o varios documentos nuevos, el sistema debe permitir:

- Ver todas sus relaciones activas.
- Seleccionar qué relaciones se trasladan al documento sustituto.
- Crear nuevas relaciones.
- Inactivar relaciones anteriores.
- Registrar motivo de la inactivación/migración.
- Mantener historial de que en algún momento el documento anterior estuvo relacionado con esos documentos.

### 13.3 Carpeta lógica de obsoletos

Dentro de cada proceso debe existir agrupación de `OBSOLETOS`.

Debe mostrar documentos archivados/obsoletos relacionados con ese proceso.

---

## 14. Consulta y descarga de documentos

### 14.1 Consulta por lectores

El usuario lector debe poder:

- Navegar por árbol documental.
- Buscar documentos oficiales.
- Abrir vista de lectura.
- Ver metadatos básicos.
- Ver versión vigente.
- Ver si el documento reemplaza o fue reemplazado por otro.

### 14.2 Restricción de descarga

Por defecto, el lector no debe poder descargar documentos.

Debe existir una función de solicitud de descarga:

- Lector solicita descarga.
- Indica motivo.
- Administrador o editor aprueba/rechaza.
- Si se aprueba, se habilita descarga.
- El permiso puede ser permanente o con vencimiento.
- Todo debe quedar en auditoría.

---

## 15. Auditoría y trazabilidad

Registrar auditoría de acciones críticas:

- Login exitoso/fallido si se desea.
- Creación de usuario.
- Cambio de permisos.
- Creación de solicitud.
- Asignación/reasignación de solicitud.
- Creación de documento.
- Edición de metadatos.
- Carga de archivo.
- Carga de borrador.
- Envío a revisión.
- Aprobación/rechazo.
- Oficialización.
- Creación/inactivación/migración de relaciones.
- Baja/archivo de documento.
- Otorgamiento/revocación de descarga.
- Descargas realizadas.
- Exportación de reportes.

Cada registro debe tener:

- Usuario actor.
- Fecha/hora.
- Acción.
- Entidad afectada.
- ID de entidad.
- Valores anteriores y nuevos cuando aplique.
- IP/user agent si está disponible.

---

## 16. Modelo de datos sugerido

> Ajustar nombres según convención del proyecto, pero conservar las entidades y relaciones principales.

### 16.1 Entidades de seguridad

#### `User`

- `id`
- `name`
- `email`
- `passwordHash`
- `isActive`
- `createdAt`
- `updatedAt`

#### `Role`

- `id`
- `code`
- `name`
- `description`
- `isSystemRole`

#### `Permission`

- `id`
- `code`
- `module`
- `action`
- `description`

#### `UserRole`

- `id`
- `userId`
- `roleId`

#### `RolePermission`

- `id`
- `roleId`
- `permissionId`

#### `UserDocumentPermission`

Permisos granulares excepcionales por usuario y documento.

- `id`
- `userId`
- `documentId`
- `documentVersionId`
- `permissionCode`
- `grantedByUserId`
- `expiresAt`
- `createdAt`
- `revokedAt`

### 16.2 Entidades de clasificación documental

#### `ProcessGroup`

- `id`
- `code`
- `name`
- `description`
- `sortOrder`
- `isActive`

#### `Process`

- `id`
- `processGroupId`
- `code`
- `name`
- `description`
- `sortOrder`
- `isActive`

#### `DocumentType`

- `id`
- `code`
- `name`
- `category`
- `definition`
- `mustContain`
- `mustNotContain`
- `commonUseCases`
- `recommendedReviewFrequency`
- `sortOrder`
- `isActive`

#### `DocumentSequence`

- `id`
- `documentTypeId`
- `nextNumber`
- `updatedAt`

### 16.3 Entidades documentales

#### `Document`

- `id`
- `identityCode`
- `temporaryCode`
- `title`
- `description`
- `documentTypeId`
- `processId`
- `status`
- `currentVersionId`
- `createdByUserId`
- `ownerEditorUserId`
- `createdAt`
- `updatedAt`
- `officializedAt`
- `archivedAt`
- `archiveReason`
- `replacedByDocumentId`

#### `DocumentVersion`

- `id`
- `documentId`
- `majorVersion`
- `minorVersion`
- `versionLabel`
- `fullCode`
- `changeType`
- `changeSummary`
- `status`
- `previousVersionId`
- `createdByUserId`
- `createdAt`
- `submittedAt`
- `approvedAt`
- `officializedAt`
- `isCurrent`

#### `DocumentFile`

- `id`
- `documentId`
- `documentVersionId`
- `fileRole`
- `originalFileName`
- `storedFileName`
- `storagePath`
- `mimeType`
- `sizeBytes`
- `checksum`
- `uploadedByUserId`
- `uploadedAt`

### 16.4 Solicitudes

#### `DocumentRequest`

- `id`
- `requestCode`
- `requestType`
- `requesterUserId`
- `requesterArea`
- `suggestedDocumentTypeId`
- `suggestedProcessId`
- `relatedDocumentId`
- `title`
- `description`
- `justification`
- `priority`
- `requiredDate`
- `status`
- `assignedEditorUserId`
- `assignedByUserId`
- `assignedAt`
- `closedAt`
- `createdAt`
- `updatedAt`

#### `DocumentRequestAttachment`

- `id`
- `documentRequestId`
- `originalFileName`
- `storagePath`
- `mimeType`
- `sizeBytes`
- `uploadedByUserId`
- `uploadedAt`

### 16.5 Revisión y aprobación

#### `ReviewRound`

- `id`
- `documentVersionId`
- `roundNumber`
- `status`
- `submittedByUserId`
- `submittedAt`
- `closedAt`

#### `ReviewAssignment`

- `id`
- `reviewRoundId`
- `userId`
- `assignmentRole`
- `status`
- `decisionComment`
- `decidedAt`

#### `DraftComment`

- `id`
- `reviewAssignmentId`
- `documentVersionId`
- `commentType`
- `comment`
- `suggestedText`
- `sectionReference`
- `status`
- `createdAt`
- `resolvedAt`
- `resolvedByUserId`

### 16.6 Relaciones documentales

#### `DocumentRelationship`

- `id`
- `sourceDocumentId`
- `targetDocumentId`
- `relationshipType`
- `description`
- `appliesToVersionId`
- `isActive`
- `createdByUserId`
- `createdAt`
- `inactivatedByUserId`
- `inactivatedAt`
- `inactivationReason`
- `replacedByRelationshipId`

### 16.7 Descargas

#### `DownloadRequest`

- `id`
- `documentId`
- `documentVersionId`
- `requesterUserId`
- `reason`
- `status`
- `reviewedByUserId`
- `reviewComment`
- `requestedAt`
- `reviewedAt`

#### `DownloadGrant`

- `id`
- `documentId`
- `documentVersionId`
- `userId`
- `grantedByUserId`
- `expiresAt`
- `createdAt`
- `revokedAt`

### 16.8 Auditoría

#### `AuditLog`

- `id`
- `actorUserId`
- `action`
- `entityType`
- `entityId`
- `beforeData`
- `afterData`
- `createdAt`
- `ipAddress`
- `userAgent`

---

## 17. Rutas o pantallas sugeridas

### 17.1 Públicas / autenticación

- `/login`
- `/logout`

### 17.2 Dashboard

- `/dashboard`
  - Indicadores de solicitudes pendientes.
  - Documentos en revisión.
  - Documentos pendientes de aprobación del usuario.
  - Solicitudes asignadas.
  - Descargas pendientes de autorización.

### 17.3 Administración

- `/admin/users`
- `/admin/roles`
- `/admin/permissions`
- `/admin/catalogs/processes`
- `/admin/catalogs/document-types`
- `/admin/audit`

### 17.4 Solicitudes

- `/requests`
- `/requests/new`
- `/requests/[id]`
- `/requests/[id]/assign`

### 17.5 Documentos

- `/documents`
- `/documents/new`
- `/documents/[id]`
- `/documents/[id]/versions`
- `/documents/[id]/relationships`
- `/documents/[id]/history`
- `/documents/[id]/archive`
- `/documents/[id]/download-request`

### 17.6 Revisión y aprobación

- `/reviews`
- `/reviews/[roundId]`
- `/approvals`
- `/approvals/[roundId]`

### 17.7 Explorador documental

- `/explorer`
  - Árbol de clasificación.
  - Filtros por grupo, proceso, tipo, estado.
  - Lectura de documentos oficiales.

---

## 18. Reglas de negocio clave

1. No puede existir documento oficial sin código único.
2. No puede existir código único duplicado.
3. El correlativo se genera por tipo documental.
4. Un documento nuevo en borrador puede tener código temporal.
5. Una nueva versión de documento existente debe conservar el código único.
6. Un documento oficial solo puede tener una versión vigente actual.
7. Una versión solo puede oficializarse si la ronda actual tiene aprobación unánime.
8. Un rechazo requiere observación obligatoria.
9. Si existe al menos un rechazo, el editor debe cargar un nuevo borrador y crear nueva ronda.
10. El lector no puede descargar documentos salvo permiso explícito.
11. Las relaciones documentales no deben eliminarse físicamente; se inactivan.
12. Para archivar un documento debe existir documento sustituto.
13. Antes de archivar, el sistema debe mostrar relaciones activas y exigir decisión sobre cada una.
14. Todo cambio crítico debe auditarse.
15. Los documentos obsoletos deben seguir consultables por usuarios autorizados, pero no deben aparecer como vigentes.
16. El árbol documental debe generarse desde catálogos y relaciones, no desde carpetas físicas.

---

## 19. Exportaciones mínimas

### 19.1 Historial de versiones

Exportar por documento:

- Código único.
- Nombre.
- Tipo documental.
- Proceso.
- Versión.
- Estado.
- Fecha de creación.
- Fecha de oficialización.
- Responsable.
- Resumen de cambios.

### 19.2 Trazabilidad de cambios

Exportar:

- Fecha.
- Usuario.
- Acción.
- Entidad.
- Antes.
- Después.

### 19.3 Árbol de relaciones

Exportar:

- Documento origen.
- Documento destino.
- Tipo de relación.
- Estado.
- Fecha de relación.
- Motivo de inactivación, si aplica.
- Documento sustituto, si aplica.

---

## 20. Requerimientos no funcionales

1. Interfaz limpia, profesional y responsiva.
2. Validaciones claras en formularios.
3. Mensajes de éxito/error comprensibles.
4. Control de acceso en frontend y backend.
5. Base de datos normalizada.
6. Migraciones versionadas.
7. Seed inicial de procesos, tipos documentales, roles y permisos.
8. Componentes reutilizables.
9. Código ordenado y documentado.
10. Preparar `.env.example`.
11. Preparar instrucciones de instalación local en `README.md`.
12. Manejo seguro de contraseñas.
13. No exponer archivos sin validación de permisos.
14. Registrar auditoría en acciones críticas.
15. Evitar borrado físico de datos importantes; preferir estados e inactivación.

---

## 21. Entregables esperados de Codex

1. Aplicación funcional con login.
2. Modelo de base de datos y migraciones.
3. Seed inicial:
   - Roles.
   - Permisos.
   - Macrogrupos.
   - Procesos.
   - Tipos documentales.
   - Estados básicos.
4. CRUD de usuarios, procesos y tipos documentales.
5. CRUD y flujo inicial de solicitudes.
6. Registro de documentos y versiones.
7. Carga de archivos.
8. Flujo de revisión/aprobación.
9. Módulo de relaciones documentales.
10. Explorador documental.
11. Auditoría básica.
12. Exportaciones iniciales.
13. README con pasos de instalación.
14. `.env.example`.
15. Datos de prueba.

---

## 22. Criterios de aceptación iniciales

### 22.1 Autenticación

- Dado un usuario activo, cuando ingresa credenciales correctas, entonces accede al dashboard.
- Dado un usuario inactivo, cuando intenta ingresar, entonces el sistema rechaza el acceso.

### 22.2 Roles

- Dado un usuario lector, cuando consulta documentos, entonces solo ve documentos oficiales autorizados.
- Dado un lector sin permiso de descarga, cuando intenta descargar, entonces el sistema debe bloquear y ofrecer solicitud de descarga.
- Dado un administrador, cuando entra al módulo de usuarios, entonces puede crear, editar e inactivar usuarios.

### 22.3 Solicitudes

- Dado un usuario autorizado, cuando crea una solicitud con anexos, entonces la solicitud aparece en el tablero del administrador.
- Dado un administrador, cuando asigna una solicitud a un editor, entonces el editor la ve en su tablero.

### 22.4 Documentos y versiones

- Dado un editor, cuando crea un documento nuevo en borrador, entonces el sistema genera código temporal.
- Dado un documento nuevo aprobado y oficializado, cuando se publica, entonces el sistema genera código único definitivo.
- Dado un documento existente, cuando se crea una nueva versión, entonces conserva el código único y cambia la versión.

### 22.5 Revisión y aprobación

- Dado un borrador enviado a revisión, cuando todos aprueban, entonces pasa a borrador aprobado.
- Dado un borrador enviado a revisión, cuando uno rechaza sin observaciones, entonces el sistema no permite registrar el rechazo.
- Dado un borrador rechazado por al menos una persona, entonces el editor debe subir nueva versión de borrador para reiniciar ronda.

### 22.6 Relaciones

- Dado un documento, cuando se relaciona con otro, entonces la relación queda visible en el árbol.
- Dado una relación que ya no aplica, cuando se inactiva, entonces permanece en historial.

### 22.7 Archivo histórico

- Dado un documento oficial, cuando se intenta archivar sin sustituto, entonces el sistema no debe permitirlo.
- Dado un documento con relaciones activas, cuando se va a archivar, entonces el sistema debe mostrar las relaciones y solicitar decisión sobre cada una.

---

## 23. Datos semilla sugeridos en formato JSON

### 23.1 Procesos

```json
[
  {
    "group_code": "PE",
    "group_name": "PROCESOS ESTRATÉGICOS",
    "process_code": "PE01",
    "process_name": "Planeación Estratégica"
  },
  {
    "group_code": "PE",
    "group_name": "PROCESOS ESTRATÉGICOS",
    "process_code": "PE02",
    "process_name": "Gestión de la Dirección General"
  },
  {
    "group_code": "PE",
    "group_name": "PROCESOS ESTRATÉGICOS",
    "process_code": "PE03",
    "process_name": "Gobierno Corporativo y Cumplimiento"
  },
  {
    "group_code": "PE",
    "group_name": "PROCESOS ESTRATÉGICOS",
    "process_code": "PE04",
    "process_name": "Gestión de Indicadores y Desempeño"
  },
  {
    "group_code": "PE",
    "group_name": "PROCESOS ESTRATÉGICOS",
    "process_code": "PE05",
    "process_name": "Inteligencia de Negocios y Analítica"
  },
  {
    "group_code": "PC",
    "group_name": "PROCESOS CLAVE",
    "process_code": "PC01",
    "process_name": "Administración de Categorías"
  },
  {
    "group_code": "PC",
    "group_name": "PROCESOS CLAVE",
    "process_code": "PC02",
    "process_name": "Compras, Sourcing y Alianzas Estratégicas"
  },
  {
    "group_code": "PC",
    "group_name": "PROCESOS CLAVE",
    "process_code": "PC03",
    "process_name": "Investigación y Desarrollo de Nuevos Productos"
  },
  {
    "group_code": "PC",
    "group_name": "PROCESOS CLAVE",
    "process_code": "PC04",
    "process_name": "Manufactura de Productos"
  },
  {
    "group_code": "PC",
    "group_name": "PROCESOS CLAVE",
    "process_code": "PC05",
    "process_name": "Centros de Distribución y Logística"
  },
  {
    "group_code": "PC",
    "group_name": "PROCESOS CLAVE",
    "process_code": "PC06",
    "process_name": "Operación de Salas de Ventas"
  },
  {
    "group_code": "PC",
    "group_name": "PROCESOS CLAVE",
    "process_code": "PC07",
    "process_name": "E-Commerce y Canales Digitales"
  },
  {
    "group_code": "PC",
    "group_name": "PROCESOS CLAVE",
    "process_code": "PC08",
    "process_name": "Atención y Experiencia del Cliente"
  },
  {
    "group_code": "PC",
    "group_name": "PROCESOS CLAVE",
    "process_code": "PC09",
    "process_name": "Gestión de Devoluciones y Servicio Postventa"
  },
  {
    "group_code": "PS",
    "group_name": "PROCESOS DE SOPORTE",
    "process_code": "PS01",
    "process_name": "Gestión del talento humano"
  },
  {
    "group_code": "PS",
    "group_name": "PROCESOS DE SOPORTE",
    "process_code": "PS02",
    "process_name": "Gestión financiera y contable"
  },
  {
    "group_code": "PS",
    "group_name": "PROCESOS DE SOPORTE",
    "process_code": "PS03",
    "process_name": "Gestión de Tecnología y Sistemas de Información"
  },
  {
    "group_code": "PS",
    "group_name": "PROCESOS DE SOPORTE",
    "process_code": "PS04",
    "process_name": "Mantenimiento e Infraestructura"
  },
  {
    "group_code": "PS",
    "group_name": "PROCESOS DE SOPORTE",
    "process_code": "PS05",
    "process_name": "Mercadeo, marca y comunicación"
  },
  {
    "group_code": "PS",
    "group_name": "PROCESOS DE SOPORTE",
    "process_code": "PS06",
    "process_name": "Seguridad Operativa y Patrimonial"
  },
  {
    "group_code": "PS",
    "group_name": "PROCESOS DE SOPORTE",
    "process_code": "PS07",
    "process_name": "Control de Calidad Operativa"
  },
  {
    "group_code": "PS",
    "group_name": "PROCESOS DE SOPORTE",
    "process_code": "PS08",
    "process_name": "Gestión de Acreedores y Contratación"
  },
  {
    "group_code": "PM",
    "group_name": "PROCESOS DE EVALUACIÓN Y MEJORA",
    "process_code": "PM01",
    "process_name": "Auditoría y Control Interno"
  },
  {
    "group_code": "PM",
    "group_name": "PROCESOS DE EVALUACIÓN Y MEJORA",
    "process_code": "PM02",
    "process_name": "Gestión de Indicadores y KPI de Proceso"
  },
  {
    "group_code": "PM",
    "group_name": "PROCESOS DE EVALUACIÓN Y MEJORA",
    "process_code": "PM03",
    "process_name": "Mejora Continua y Transformación Operacional"
  },
  {
    "group_code": "PM",
    "group_name": "PROCESOS DE EVALUACIÓN Y MEJORA",
    "process_code": "PM04",
    "process_name": "Gestión de Riesgos Integrales"
  },
  {
    "group_code": "PM",
    "group_name": "PROCESOS DE EVALUACIÓN Y MEJORA",
    "process_code": "PM05",
    "process_name": "Satisfacción del Cliente"
  }
]
```

### 23.2 Tipos documentales

```json
[
  {
    "code": "POL",
    "name": "Política",
    "category": "principal",
    "definition": "Documento normativo que expresa la postura oficial del Grupo Calleja respecto a un tema relevante. Establece principios, reglas, compromisos y límites que deben ser cumplidos por todas las áreas. Una política responde a la pregunta: ¿qué se debe hacer y por qué?, no cómo se hace. Es obligatoria y tiene efecto institucional.",
    "must_contain": "• Objetivo de la política\n• Alcance (a quién aplica)\n• Fundamento o justificación\n• Principios o lineamientos\n• Responsables de cumplimiento\n• Referencia a procedimientos (si aplica)",
    "must_not_contain": "• Instrucciones paso a paso\n• Flujogramas operativos\n• Formatos de recolección de datos",
    "common_use_cases": "• Política de devoluciones en tiendas\n• Política de fijación de precios\n• Política de seguridad e higiene\n• Política de descuentos especiales",
    "recommended_review_frequency": "Cada 2 años o al cambiar el marco normativo o estratégico"
  },
  {
    "code": "PRO",
    "name": "Procedimiento",
    "category": "principal",
    "definition": "Documento que describe detalladamente los pasos secuenciales que deben seguirse para ejecutar un proceso. Indica qué se hace, quién lo hace, con qué insumos, cómo y qué resultado debe producirse. Es fundamental para garantizar la estandarización y el control de las actividades clave.",
    "must_contain": "• Nombre del procedimiento y código\n• Objetivo y alcance\n• Responsables\n• Pasos secuenciales (con numeración clara)\n• Entradas y salidas del proceso\n• Flujograma (si aplica)\n• Registros o evidencias generadas",
    "must_not_contain": "• Declaraciones normativas (esas van en políticas)\n• Casos específicos o excepcionales (van en instructivos)\n• Información de decisiones estratégicas",
    "common_use_cases": "• Procedimiento de solicitud de crédito a proveedor\n• Procedimiento de facturación\n• Procedimiento de reclamos del cliente\n• Procedimiento de control de inventario",
    "recommended_review_frequency": "Anual o cuando el proceso sufra cambios"
  },
  {
    "code": "NOR",
    "name": "Norma",
    "category": "principal",
    "definition": "Documento que establece reglas, requisitos o estándares obligatorios aplicables a procesos o comportamientos dentro de la organización. Garantiza consistencia y cumplimiento regulatorio o técnico.",
    "must_contain": "• Objetivo y ámbito de aplicación• Definiciones clave (si aplica)• Requisitos o reglas concretas• Responsables de cumplimiento• Referencias normativas o legales externas",
    "must_not_contain": "• Procedimientos detallados• Políticas generales (deben ser documentos separados)• Información redundante",
    "common_use_cases": "• Norma de seguridad en instalaciones• Norma de etiquetado de productos• Norma de acceso a sistemas informáticos",
    "recommended_review_frequency": "Cada 2 años o cuando exista un cambio en el marco regulatorio"
  },
  {
    "code": "LIN",
    "name": "Lineamiento",
    "category": "principal",
    "definition": "Documento que establece criterios, recomendaciones u orientaciones para guiar el cumplimiento de actividades, procesos o decisiones. No es obligatorio como una política, pero ayuda a uniformar criterios, promover buenas prácticas y alinear a las áreas hacia objetivos comunes. Responde a la pregunta: ¿cómo deberíamos hacerlo de forma consistente?",
    "must_contain": "• Objetivo del lineamiento \n• Alcance (a quién aplica) \n• Fundamento o justificación \n• Criterios o recomendaciones (las buenas prácticas esperadas) \n• Responsables sugeridos \n• Documentos relacionados (si aplica)",
    "must_not_contain": "• Declaraciones normativas (esas van en políticas) \n• Detalle de pasos operativos (eso va en procedimientos) \n• Casos particulares (eso va en instructivos)",
    "common_use_cases": "• Lineamientos de comunicación interna \n• Lineamientos para atención al cliente \n• Lineamientos para inventarios \n• Lineamientos de manejo de proveedores, productos o servicios",
    "recommended_review_frequency": "Cada 2 años o cuando cambien los criterios o recomendaciones clave"
  },
  {
    "code": "INS",
    "name": "Instructivo",
    "category": "principal",
    "definition": "Documento técnico y detallado que indica cómo realizar una tarea específica o usar una herramienta, equipo o sistema. Está orientado a la operación directa por parte del colaborador, generalmente vinculado a un solo puesto o función.",
    "must_contain": "• Nombre de la tarea\n• Requisitos o materiales previos\n• Instrucciones paso a paso con imágenes si es necesario\n• Recomendaciones o advertencias\n• Contacto para soporte (si aplica)",
    "must_not_contain": "• Políticas o justificaciones estratégicas\n• Información general que no aporte a la ejecución inmediata\n• Flujos de procesos complejos",
    "common_use_cases": "• Instructivo para emitir un ticket en caja\n• Instructivo para ingresar productos al sistema ERP\n• Instructivo de limpieza de góndolas",
    "recommended_review_frequency": "Cada vez que se actualice el sistema o equipo relacionado"
  },
  {
    "code": "GUI",
    "name": "Guía",
    "category": "principal",
    "definition": "Documento orientativo que sugiere buenas prácticas, recomendaciones o criterios para facilitar la toma de decisiones o el desarrollo de actividades. Su carácter no es obligatorio, pero sí recomendable. Ayuda a elevar la calidad y uniformidad.",
    "must_contain": "• Propósito de la guía\n• Recomendaciones organizadas por tema o etapa\n• Ejemplos ilustrativos\n• Sugerencias o criterios a seguir\n• Opciones viables para actuar",
    "must_not_contain": "• Pasos obligatorios (eso corresponde a procedimientos)\n• Decisiones normativas o sanciones\n• Instrucciones técnicas operativas",
    "common_use_cases": "• Guía de comunicación efectiva en punto de venta\n• Guía para manejo de clientes difíciles\n• Guía para diseño de promociones visuales",
    "recommended_review_frequency": "Cada 2 años o ante cambios significativos en el contexto"
  },
  {
    "code": "FOR",
    "name": "Formato / Formulario",
    "category": "principal",
    "definition": "Documento estructurado, físico o digital, que sirve para registrar datos de manera sistemática. Facilita la recolección, seguimiento o validación de información asociada a un proceso, control o verificación.",
    "must_contain": "• Encabezado con nombre del formato, código y versión\n• Campos o tablas para completar\n• Instrucciones de llenado (si es necesario)\n• Responsable de emisión y uso\n• Espacio para firmas o sellos (si aplica)",
    "must_not_contain": "• Texto explicativo detallado\n• Pasos operativos (van en instructivos o procedimientos)\n• Justificación normativa (va en políticas)",
    "common_use_cases": "• Formato de solicitud de vacaciones\n• Formulario de auditoría de piso de venta\n• Formato de registro de limpieza",
    "recommended_review_frequency": "Cada vez que se modifiquen los datos requeridos o los procesos relacionados"
  },
  {
    "code": "PLA",
    "name": "Plan",
    "category": "principal",
    "definition": "Documento que establece metas, objetivos, actividades, responsables, recursos y tiempos necesarios para lograr un resultado en un periodo definido. Es fundamental para orientar acciones estratégicas, tácticas u operativas.",
    "must_contain": "• Objetivo general y específicos\n• Actividades y tareas programadas\n• Recursos necesarios\n• Cronograma\n• Responsables\n• Indicadores de seguimiento",
    "must_not_contain": "• Instrucciones paso a paso de ejecución (va en procedimientos)\n• Declaraciones normativas (va en políticas)\n• Registros individuales",
    "common_use_cases": "• Plan de capacitación anual\n• Plan de lanzamiento de productos\n• Plan de mantenimiento preventivo",
    "recommended_review_frequency": "Anual o por cada ciclo operativo"
  },
  {
    "code": "INF",
    "name": "Reporte / Informe",
    "category": "principal",
    "definition": "Documento que presenta resultados, hallazgos, análisis o conclusiones derivadas de la ejecución de actividades, control, auditoría o proyectos. Sirve para la toma de decisiones, la rendición de cuentas y la retroalimentación.",
    "must_contain": "• Encabezado con fecha, título y responsable\n• Descripción del hecho, evento o análisis\n• Resultados numéricos o cualitativos\n• Conclusiones y recomendaciones (si aplica)\n• Anexos (gráficos, evidencias)",
    "must_not_contain": "• Reglas normativas (van en políticas)\n• Pasos operativos (van en procedimientos)\n• Registro crudo de datos sin análisis",
    "common_use_cases": "• Informe mensual de ventas\n• Reporte de cumplimiento de objetivos\n• Informe de hallazgos de auditoría",
    "recommended_review_frequency": "Según periodicidad del reporte (mensual, trimestral, puntual, etc.)"
  },
  {
    "code": "REG",
    "name": "Registro",
    "category": "principal",
    "definition": "Documento o archivo resultante de la ejecución de un proceso o actividad. Es evidencia documental que demuestra el cumplimiento de un procedimiento, acción, control o normativa.",
    "must_contain": "• Datos completados según formato\n• Fecha, firma o identificación del responsable\n• Evidencia verificable de cumplimiento\n• Relación con el procedimiento ejecutado",
    "must_not_contain": "• Texto explicativo\n• Reglas normativas o planificación\n• Análisis o interpretación (eso va en reportes)",
    "common_use_cases": "• Registro de asistencia\n• Registro de inspección de calidad\n• Registro de visitas o entregas",
    "recommended_review_frequency": "No aplica. Se conserva según tabla de retención documental"
  },
  {
    "code": "MAN",
    "name": "Manual",
    "category": "principal",
    "definition": "Documento estructurado que agrupa varios elementos documentales relacionados (políticas, procedimientos, instructivos), bajo un mismo eje temático o funcional. Es una herramienta de consulta que orienta de forma integral al lector. No debe contener el desarrollo completo de los documentos referenciados, sino sus resúmenes o enlaces.",
    "must_contain": "• Índice temático\n• Introducción y propósito del manual\n• Resumen de políticas y procedimientos (con códigos)\n• Enlaces o referencias a los documentos individuales\n• Glosario, anexos y roles clave",
    "must_not_contain": "• Desarrollo completo de procedimientos o políticas\n• Registros o formatos operativos\n• Instrucciones detalladas técnicas",
    "common_use_cases": "• Manual de políticas de RRHH\n• Manual de procesos operativos\n• Manual de inducción de personal",
    "recommended_review_frequency": "Cada 2 años o ante reestructuraciones mayores"
  },
  {
    "code": "MIN",
    "name": "Minuta",
    "category": "secundario",
    "definition": "Documento breve que resume los puntos tratados, acuerdos alcanzados y responsables asignados durante una reunión. Sirve para dar seguimiento a compromisos y deja constancia formal de la participación y decisiones adoptadas.",
    "must_contain": "• Fecha, lugar y objetivo de la reunión\n• Lista de participantes\n• Puntos tratados o temas abordados\n• Acuerdos y responsables asignados\n• Fecha de próxima reunión (si aplica)",
    "must_not_contain": "• Información no discutida\n• Opiniones personales sin sustento\n• Detalles extensos de cada intervención",
    "common_use_cases": "• Minuta de reunión de comité\n• Minuta de reunión operativa de tienda\n• Minuta de comité de innovación",
    "recommended_review_frequency": "No aplica. Se genera por evento"
  },
  {
    "code": "ATC",
    "name": "Análisis Técnico",
    "category": "secundario",
    "definition": "Documento que presenta una evaluación basada en datos, normas, estudios comparativos o criterios técnicos. Su objetivo es sustentar decisiones operativas o estratégicas con argumentos objetivos y verificables.",
    "must_contain": "• Objetivo del análisis\n• Metodología utilizada\n• Criterios técnicos o indicadores aplicados\n• Resultados y conclusiones\n• Recomendaciones o escenarios propuestos",
    "must_not_contain": "• Opiniones no sustentadas en datos\n• Información duplicada sin análisis\n• Resultados sin interpretación",
    "common_use_cases": "• Análisis de costo-beneficio de una tecnología\n• Análisis de factibilidad operativa de un cambio\n• Análisis comparativo de productos y proveedores",
    "recommended_review_frequency": "Se genera por evento; no requiere revisión periódica"
  },
  {
    "code": "PRY",
    "name": "Proyecto",
    "category": "secundario",
    "definition": "Documento que planifica, gestiona y documenta una iniciativa con objetivo, inicio y fin definidos. Integra planificación, ejecución, seguimiento y evaluación de resultados de una acción estructurada.",
    "must_contain": "• Justificación y objetivos del proyecto\n• Alcance, entregables y limitaciones\n• Cronograma y actividades principales\n• Recursos y presupuesto estimado\n• Indicadores de éxito y riesgos potenciales",
    "must_not_contain": "• Políticas o normas (se referencian pero no se desarrollan)\n• Información desactualizada sin revisión\n• Procedimientos operativos detallados",
    "common_use_cases": "• Proyecto de apertura de tienda\n• Proyecto de implementación de nuevo sistema\n• Proyecto de rebranding de categoría",
    "recommended_review_frequency": "Durante el ciclo de vida del proyecto y cierre formal"
  },
  {
    "code": "ACT",
    "name": "Acta",
    "category": "secundario",
    "definition": "Documento formal que deja constancia escrita de un hecho relevante, evento institucional, entrega o reunión con valor oficial. Debe estar firmada por los participantes clave para validar su contenido.",
    "must_contain": "• Encabezado con fecha, lugar y título\n• Descripción objetiva del hecho\n• Participantes con nombres y cargos\n• Firmas de conformidad o constancia\n• Documentos adjuntos o evidencias (si aplica)",
    "must_not_contain": "• Juicios de valor o emociones\n• Opiniones personales sin sustento\n• Información que no fue observada o registrada",
    "common_use_cases": "• Acta de entrega-recepción\n• Acta de hallazgos de auditoría\n• Acta de conformidad en reuniones de comité",
    "recommended_review_frequency": "No aplica. Se genera y archiva por evento"
  },
  {
    "code": "EVA",
    "name": "Evaluación",
    "category": "secundario",
    "definition": "Documento que valora el cumplimiento, impacto o desempeño de una acción, persona, producto o proceso. Debe basarse en criterios objetivos y comparables para apoyar decisiones de mejora o continuidad.",
    "must_contain": "• Criterios de evaluación definidos\n• Resultado de indicadores cuantitativos o cualitativos\n• Nivel de cumplimiento o desempeño\n• Observaciones del evaluador\n• Recomendaciones de mejora o reconocimiento",
    "must_not_contain": "• Opiniones sin evidencia\n• Información ajena al propósito evaluado\n• Juicios personales sin fundamento",
    "common_use_cases": "• Evaluación de desempeño del personal\n• Evaluación de campañas publicitarias\n• Evaluación de calidad de proveedores",
    "recommended_review_frequency": "Según ciclo de evaluación definido (mensual, semestral, anual)"
  },
  {
    "code": "MEM",
    "name": "Memorando",
    "category": "secundario",
    "definition": "Documento breve y directo utilizado como medio de comunicación interna entre áreas, jefaturas o colaboradores. Sirve para informar, instruir, justificar o solicitar algo de forma formal, pero ágil. Es ideal para temas puntuales o administrativos.",
    "must_contain": "• Fecha de emisión\n• Asunto claro y específico\n• Destinatario y remitente\n• Cuerpo del mensaje (breve y directo)\n• Firma o validación del emisor",
    "must_not_contain": "• Desarrollos normativos o técnicos extensos\n• Documentos ajenos al mensaje principal sin contexto\n• Lenguaje informal o poco estructurado",
    "common_use_cases": "• Memorando de notificación de uso de formato actualizado\n• Memorando de recordatorio de cumplimiento normativo\n• Memorando de instrucción de procedimiento temporal",
    "recommended_review_frequency": "No aplica. Se emite por necesidad y se archiva"
  },
  {
    "code": "SOL",
    "name": "Solicitud",
    "category": "secundario",
    "definition": "Documento mediante el cual una persona o unidad solicita formalmente una acción, recurso, autorización o cambio. Puede ser parte de un flujo aprobado o usado como registro inicial de una necesidad operativa o administrativa.",
    "must_contain": "• Identificación del solicitante\n• Fecha de solicitud\n• Descripción clara y precisa de lo que se solicita\n• Justificación o motivo (si aplica)\n• Espacio para firma o aprobación",
    "must_not_contain": "• Declaraciones normativas (va en políticas)\n• Información sin relación con la solicitud\n• Opiniones personales o no verificables",
    "common_use_cases": "• Solicitud de permisos, vacaciones o materiales\n• Solicitud de acceso a sistemas o claves\n• Solicitud de modificación de turnos o recursos",
    "recommended_review_frequency": "No aplica. Se genera y gestiona según flujo o proceso"
  },
  {
    "code": "ESD",
    "name": "Esquemas Documentales",
    "category": "secundario",
    "definition": "Documento gráfico o visual que representa la estructura, distribución, relaciones o flujos de la organización. Incluye organigramas, mapas de procesos, matrices de responsabilidades y otros diagramas organizativos.",
    "must_contain": "• Título claro y código único\n• Versión y fecha de emisión\n• Leyenda o clave explicativa\n• Representación gráfica clara y actualizada\n• Fuente o responsable del esquema",
    "must_not_contain": "• Información desactualizada\n• Ambigüedades en símbolos o colores\n• Falta de escala o proporción en diagramas",
    "common_use_cases": "• Organigrama general• Mapa de procesos• Matriz RACI• Diagramas de flujos de trabajo",
    "recommended_review_frequency": "Anual o cada vez que se produzcan cambios estructurales"
  },
  {
    "code": "IND",
    "name": "Indicaciones",
    "category": "secundario",
    "definition": "Documento breve que emite instrucciones puntuales o directrices específicas para ser aplicadas en una situación o periodo determinado. Es de carácter temporal y de aplicación directa.",
    "must_contain": "• Objetivo claro\n• Contexto o motivo\n• Descripción detallada de la indicación\n• Responsable de ejecución y seguimiento\n• Vigencia o periodo de aplicación",
    "must_not_contain": "• Políticas o normas generales\n• Procedimientos completos\n• Información que contradiga otros documentos vigentes",
    "common_use_cases": "• Indicaciones para cierre de inventario\n• Instrucciones para campañas promocionales\n• Directivas en caso de emergencia",
    "recommended_review_frequency": "No aplica, es temporal por evento"
  },
  {
    "code": "PRG",
    "name": "Programa",
    "category": "secundario",
    "definition": "Documento que detalla un conjunto organizado de actividades, objetivos y recursos planificados para ser ejecutados en un plazo determinado. Abarca desde programas de formación hasta campañas u otros proyectos.",
    "must_contain": "• Nombre y objetivo del programa\n• Alcance y beneficiarios\n• Cronograma de actividades\n• Recursos asignados\n• Responsables y roles\n• Indicadores de seguimiento (si aplica)",
    "must_not_contain": "• Procedimientos detallados\n• Políticas generales\n• Información duplicada de otros programas",
    "common_use_cases": "• Programa de capacitación anual\n• Programa de mantenimiento preventivo\n• Programa de responsabilidad social empresarial",
    "recommended_review_frequency": "Al inicio de cada periodo planificado (por ejemplo, anual)"
  }
]
```

---

## 24. Anexo A — Requerimientos textuales recibidos

1. Debe ser multiusuario y tener un sistema de permisos por roles y también un sistema de permisos granular.
2. Los roles serán:
un administrador, quien será que tenga el gobierno y control de la aplicación;
rol de editor, quien tendrá el control sobre todo lo relacionado a la operatividad de la aplicación, podrá subir borradores, someter a a probación y revisión, dar la subida de los documentos oficiales, mover documentos a archivo histórico, que sería como el proceso de dar de baja de forma definitiva a documentos, crear las relaciones de los documentos, la clasificación de los documentos, etc.
Rol de lector, que solamente tendrá acceso a los documentos oficiales para poder verlos, leerlos, sin posibilidad de descargarlos. La funcionalidad de descarga será a petición y tanto un administrador, como un editor podrán dar ese permiso para habilitar la descarga.
Rol de aprobación, rol de revisor, esto más que roles serán una especie de habilitadores temporales, es decir, tener la capacidad de elegir entre los ususaios quien será la persona encargada de aprobar, y otra de dar aprobación de revisión al documento, de manera que el editor tenga esa flexibilidad de elección de los usuarios que participan en la oficializaición de un documento. Estos roles tendrá funcionalidades de edición tipo Git, es decir, podrán dar comentarios editar directamente en el documento estableciendo ramas para cada uno, de manera que en un punto se pueda hacer merge de esos comentarios o modificaciones para por fin tener el documento listo y ya pueda dar su OK al documento.
3. La aplicación debe permitir crear un esquema documental, es decir, crear un maestro de clasificación documental, por ejemplo como el que se observa en las imágenes, Diagrama de Árbol de Carpetas y Diagrama de Árbol de Carpetas-Arbol de Subcarpetas, es decir tener la flexibilidad de crear una estructutra base bajo la cual posteriormente se hará la clasificaicón de los documentos.
4. La aplicaicón debe permitir crear también el esquema de tipo documental, así como se observa en Diagrama de Árbol de Carpetas-Arbol de Subcarpetas, es decir, un documento puede estar clasificado bajo un tipo documental y pertener a un determinado proceso. En TIPOS DOCUMENTALES Y CODIFICACIÓN se tienen los tipos documentales con sus nombres y codificación.
5. La aplicaicón debe permitir la creación de la codificación correlativa de versionamiento, teniendo versiones mayores y menores, bajo este esquema ejemplo POL-001-V1.0, donde POL es el tipo documental Política, 001 es el correlativo del tipo documental, juntos POL-001 deben conformar el código único de dicho documento, es decir este es su ID  de identidad, pudiendo el documento en algún momento cambiar de nombre pero conservar su esencia, luego V1 es la verisón de cambios mayores y .0 es el versionamiento de cambios menores,sobre todo cuando sean cambios de formato o reestructuración de la información, más no adicionamiento o quitar información.
6. Un documento puede tener múltiples versiones mayores y menores y se debe tener un histórico de este versionamiento presentando en cada versión cuáles han sido los cambios realizados.
7. Un documento puede estar relacionado con múltilpes documentos, así, cuando un documento realice un cambio de versión, siempre tendrá relaciones con los documentos que desde un inicio o posteriormente se ha ido relacionando.
8. Cuando un documento se de de baja y pase a ser arhivado, se debe establecer cuál es el documento que lo sustituye, por lo cual ya se debe terne ese documento que lo sustituye, así, todos los demás documentos relacionados pasarán a relacionarse con el nuevo documento y se deben hacer las adecuaciones que se consideren pertinentes a los documentos relacionados.
9. Se debe poder descargar el histórico de trazabilidad de cambios y versiones de los diferente documentos.
10. Se debe poder descargar el árbol de relaciones de documentos, esto es importante ya que para dar de baja un documento se debe poder ver cuáles son los documentos con los que se encuentre relacioando o los que afecta.
11. Se debe poder mover las relaciones de los documentos, es decir si de un documento que se da de baja nacen dos nuevos documentos, se deben poder mover las relaciones este nuevo documento y eliminar o inactivar la relación con el documentos anterior. Por cuestión de trazabilidad quizás lo recomendable sea inactivar la relación así se podrá saber que en un momento dado ese documento estuvo relacionado con un determinado documento.
12. Para la oficialización de documentos primero se subirá un borrador del documento, el cuál será sometido a revisión y aprobación, para eso el editor podrá seleccionar a los ususrios que tendrán esos roles.
Tanto los revisores como los aprobadores podrán aprobar o rechazar dicho borrador; si es rechazado deberán realizar sus observaciones de cambios y mejoras, de no hacer eso, simplemente no se admite el rechazo. Si en dado caso es rechazado por al menos uno de los revisores o aprobadores, se deberá subir un nuevo borrador, el cuál será sometido de nuevo al proceso de aprobación, este proceso es iterativo hasta que todos los involucrados aprueben el borrador.
Al ser aprobado de manera unánime el borrador el sistema pedirá cargar la versión definitiva, la cual será la que se muestre a todos los usuarios que son lectores. (es de mencionar que los usuairos que aprueban o rechazan solo tienen un rol temporal para ese documento en ese preciso momento y dicho rol termina cuando ya se da la aprobación unánime del borrador).
13. Es de mencionar que mientras el documento está en fase de borrador si tendrá una nomenclatura la cual no será la oficial, hasta qyue ya se de el espacio se establecerá el código que único que tendrá, esto cuando sea creado por primera vez, cuando es un borrador para una nueva versión de un documento ya esxistente conservará la trazabilidad de códio y versionamiento de didcho documento ya creado.
14. También el sistema debe tener un apartado de solicitudes de elaboración de documentos, en donde se establecerán los datos  correspondientes a la descripción del documento que se solicita y se podrán subir anexos, si el solicitante ya tiene borradores de dicho documento.
15. Dichas solicitudes deberán aparecer en tablero de seguimiento al administrador y este deberá hacer las asignaciones a los usuarios con rol de editor quien será el encargado de dar seguimiento a dicha solicitud hasta elaborar desde cero o crear una nueva versión del documento solicitado.

---

## 25. Anexo B — Detalle completo de tipos documentales principales

| Código | Tipo Documental | Definición Detallada | Qué debe contener | Qué no debe contener | Casos comunes de uso | Frecuencia de revisión recomendada |
| --- | --- | --- | --- | --- | --- | --- |
| POL | Política | Documento normativo que expresa la postura oficial del Grupo Calleja respecto a un tema relevante. Establece principios, reglas, compromisos y límites que deben ser cumplidos por todas las áreas. Una política responde a la pregunta: ¿qué se debe hacer y por qué?, no cómo se hace. Es obligatoria y tiene efecto institucional. | • Objetivo de la política<br>• Alcance (a quién aplica)<br>• Fundamento o justificación<br>• Principios o lineamientos<br>• Responsables de cumplimiento<br>• Referencia a procedimientos (si aplica) | • Instrucciones paso a paso<br>• Flujogramas operativos<br>• Formatos de recolección de datos | • Política de devoluciones en tiendas<br>• Política de fijación de precios<br>• Política de seguridad e higiene<br>• Política de descuentos especiales | Cada 2 años o al cambiar el marco normativo o estratégico |
| PRO | Procedimiento | Documento que describe detalladamente los pasos secuenciales que deben seguirse para ejecutar un proceso. Indica qué se hace, quién lo hace, con qué insumos, cómo y qué resultado debe producirse. Es fundamental para garantizar la estandarización y el control de las actividades clave. | • Nombre del procedimiento y código<br>• Objetivo y alcance<br>• Responsables<br>• Pasos secuenciales (con numeración clara)<br>• Entradas y salidas del proceso<br>• Flujograma (si aplica)<br>• Registros o evidencias generadas | • Declaraciones normativas (esas van en políticas)<br>• Casos específicos o excepcionales (van en instructivos)<br>• Información de decisiones estratégicas | • Procedimiento de solicitud de crédito a proveedor<br>• Procedimiento de facturación<br>• Procedimiento de reclamos del cliente<br>• Procedimiento de control de inventario | Anual o cuando el proceso sufra cambios |
| NOR | Norma | Documento que establece reglas, requisitos o estándares obligatorios aplicables a procesos o comportamientos dentro de la organización. Garantiza consistencia y cumplimiento regulatorio o técnico. | • Objetivo y ámbito de aplicación• Definiciones clave (si aplica)• Requisitos o reglas concretas• Responsables de cumplimiento• Referencias normativas o legales externas | • Procedimientos detallados• Políticas generales (deben ser documentos separados)• Información redundante | • Norma de seguridad en instalaciones• Norma de etiquetado de productos• Norma de acceso a sistemas informáticos | Cada 2 años o cuando exista un cambio en el marco regulatorio |
| LIN | Lineamiento | Documento que establece criterios, recomendaciones u orientaciones para guiar el cumplimiento de actividades, procesos o decisiones. No es obligatorio como una política, pero ayuda a uniformar criterios, promover buenas prácticas y alinear a las áreas hacia objetivos comunes. Responde a la pregunta: ¿cómo deberíamos hacerlo de forma consistente? | • Objetivo del lineamiento <br>• Alcance (a quién aplica) <br>• Fundamento o justificación <br>• Criterios o recomendaciones (las buenas prácticas esperadas) <br>• Responsables sugeridos <br>• Documentos relacionados (si aplica) | • Declaraciones normativas (esas van en políticas) <br>• Detalle de pasos operativos (eso va en procedimientos) <br>• Casos particulares (eso va en instructivos) | • Lineamientos de comunicación interna <br>• Lineamientos para atención al cliente <br>• Lineamientos para inventarios <br>• Lineamientos de manejo de proveedores, productos o servicios | Cada 2 años o cuando cambien los criterios o recomendaciones clave |
| INS | Instructivo | Documento técnico y detallado que indica cómo realizar una tarea específica o usar una herramienta, equipo o sistema. Está orientado a la operación directa por parte del colaborador, generalmente vinculado a un solo puesto o función. | • Nombre de la tarea<br>• Requisitos o materiales previos<br>• Instrucciones paso a paso con imágenes si es necesario<br>• Recomendaciones o advertencias<br>• Contacto para soporte (si aplica) | • Políticas o justificaciones estratégicas<br>• Información general que no aporte a la ejecución inmediata<br>• Flujos de procesos complejos | • Instructivo para emitir un ticket en caja<br>• Instructivo para ingresar productos al sistema ERP<br>• Instructivo de limpieza de góndolas | Cada vez que se actualice el sistema o equipo relacionado |
| GUI | Guía | Documento orientativo que sugiere buenas prácticas, recomendaciones o criterios para facilitar la toma de decisiones o el desarrollo de actividades. Su carácter no es obligatorio, pero sí recomendable. Ayuda a elevar la calidad y uniformidad. | • Propósito de la guía<br>• Recomendaciones organizadas por tema o etapa<br>• Ejemplos ilustrativos<br>• Sugerencias o criterios a seguir<br>• Opciones viables para actuar | • Pasos obligatorios (eso corresponde a procedimientos)<br>• Decisiones normativas o sanciones<br>• Instrucciones técnicas operativas | • Guía de comunicación efectiva en punto de venta<br>• Guía para manejo de clientes difíciles<br>• Guía para diseño de promociones visuales | Cada 2 años o ante cambios significativos en el contexto |
| FOR | Formato / Formulario | Documento estructurado, físico o digital, que sirve para registrar datos de manera sistemática. Facilita la recolección, seguimiento o validación de información asociada a un proceso, control o verificación. | • Encabezado con nombre del formato, código y versión<br>• Campos o tablas para completar<br>• Instrucciones de llenado (si es necesario)<br>• Responsable de emisión y uso<br>• Espacio para firmas o sellos (si aplica) | • Texto explicativo detallado<br>• Pasos operativos (van en instructivos o procedimientos)<br>• Justificación normativa (va en políticas) | • Formato de solicitud de vacaciones<br>• Formulario de auditoría de piso de venta<br>• Formato de registro de limpieza | Cada vez que se modifiquen los datos requeridos o los procesos relacionados |
| PLA | Plan | Documento que establece metas, objetivos, actividades, responsables, recursos y tiempos necesarios para lograr un resultado en un periodo definido. Es fundamental para orientar acciones estratégicas, tácticas u operativas. | • Objetivo general y específicos<br>• Actividades y tareas programadas<br>• Recursos necesarios<br>• Cronograma<br>• Responsables<br>• Indicadores de seguimiento | • Instrucciones paso a paso de ejecución (va en procedimientos)<br>• Declaraciones normativas (va en políticas)<br>• Registros individuales | • Plan de capacitación anual<br>• Plan de lanzamiento de productos<br>• Plan de mantenimiento preventivo | Anual o por cada ciclo operativo |
| INF | Reporte / Informe | Documento que presenta resultados, hallazgos, análisis o conclusiones derivadas de la ejecución de actividades, control, auditoría o proyectos. Sirve para la toma de decisiones, la rendición de cuentas y la retroalimentación. | • Encabezado con fecha, título y responsable<br>• Descripción del hecho, evento o análisis<br>• Resultados numéricos o cualitativos<br>• Conclusiones y recomendaciones (si aplica)<br>• Anexos (gráficos, evidencias) | • Reglas normativas (van en políticas)<br>• Pasos operativos (van en procedimientos)<br>• Registro crudo de datos sin análisis | • Informe mensual de ventas<br>• Reporte de cumplimiento de objetivos<br>• Informe de hallazgos de auditoría | Según periodicidad del reporte (mensual, trimestral, puntual, etc.) |
| REG | Registro | Documento o archivo resultante de la ejecución de un proceso o actividad. Es evidencia documental que demuestra el cumplimiento de un procedimiento, acción, control o normativa. | • Datos completados según formato<br>• Fecha, firma o identificación del responsable<br>• Evidencia verificable de cumplimiento<br>• Relación con el procedimiento ejecutado | • Texto explicativo<br>• Reglas normativas o planificación<br>• Análisis o interpretación (eso va en reportes) | • Registro de asistencia<br>• Registro de inspección de calidad<br>• Registro de visitas o entregas | No aplica. Se conserva según tabla de retención documental |
| MAN | Manual | Documento estructurado que agrupa varios elementos documentales relacionados (políticas, procedimientos, instructivos), bajo un mismo eje temático o funcional. Es una herramienta de consulta que orienta de forma integral al lector. No debe contener el desarrollo completo de los documentos referenciados, sino sus resúmenes o enlaces. | • Índice temático<br>• Introducción y propósito del manual<br>• Resumen de políticas y procedimientos (con códigos)<br>• Enlaces o referencias a los documentos individuales<br>• Glosario, anexos y roles clave | • Desarrollo completo de procedimientos o políticas<br>• Registros o formatos operativos<br>• Instrucciones detalladas técnicas | • Manual de políticas de RRHH<br>• Manual de procesos operativos<br>• Manual de inducción de personal | Cada 2 años o ante reestructuraciones mayores |

---

## 26. Anexo C — Detalle completo de tipos documentales secundarios

| Código | Tipo Documental | Definición Detallada | Qué debe contener | Qué no debe contener | Casos comunes de uso | Frecuencia de revisión recomendada |
| --- | --- | --- | --- | --- | --- | --- |
| MIN | Minuta | Documento breve que resume los puntos tratados, acuerdos alcanzados y responsables asignados durante una reunión. Sirve para dar seguimiento a compromisos y deja constancia formal de la participación y decisiones adoptadas. | • Fecha, lugar y objetivo de la reunión<br>• Lista de participantes<br>• Puntos tratados o temas abordados<br>• Acuerdos y responsables asignados<br>• Fecha de próxima reunión (si aplica) | • Información no discutida<br>• Opiniones personales sin sustento<br>• Detalles extensos de cada intervención | • Minuta de reunión de comité<br>• Minuta de reunión operativa de tienda<br>• Minuta de comité de innovación | No aplica. Se genera por evento |
| ATC | Análisis Técnico | Documento que presenta una evaluación basada en datos, normas, estudios comparativos o criterios técnicos. Su objetivo es sustentar decisiones operativas o estratégicas con argumentos objetivos y verificables. | • Objetivo del análisis<br>• Metodología utilizada<br>• Criterios técnicos o indicadores aplicados<br>• Resultados y conclusiones<br>• Recomendaciones o escenarios propuestos | • Opiniones no sustentadas en datos<br>• Información duplicada sin análisis<br>• Resultados sin interpretación | • Análisis de costo-beneficio de una tecnología<br>• Análisis de factibilidad operativa de un cambio<br>• Análisis comparativo de productos y proveedores | Se genera por evento; no requiere revisión periódica |
| PRY | Proyecto | Documento que planifica, gestiona y documenta una iniciativa con objetivo, inicio y fin definidos. Integra planificación, ejecución, seguimiento y evaluación de resultados de una acción estructurada. | • Justificación y objetivos del proyecto<br>• Alcance, entregables y limitaciones<br>• Cronograma y actividades principales<br>• Recursos y presupuesto estimado<br>• Indicadores de éxito y riesgos potenciales | • Políticas o normas (se referencian pero no se desarrollan)<br>• Información desactualizada sin revisión<br>• Procedimientos operativos detallados | • Proyecto de apertura de tienda<br>• Proyecto de implementación de nuevo sistema<br>• Proyecto de rebranding de categoría | Durante el ciclo de vida del proyecto y cierre formal |
| ACT | Acta | Documento formal que deja constancia escrita de un hecho relevante, evento institucional, entrega o reunión con valor oficial. Debe estar firmada por los participantes clave para validar su contenido. | • Encabezado con fecha, lugar y título<br>• Descripción objetiva del hecho<br>• Participantes con nombres y cargos<br>• Firmas de conformidad o constancia<br>• Documentos adjuntos o evidencias (si aplica) | • Juicios de valor o emociones<br>• Opiniones personales sin sustento<br>• Información que no fue observada o registrada | • Acta de entrega-recepción<br>• Acta de hallazgos de auditoría<br>• Acta de conformidad en reuniones de comité | No aplica. Se genera y archiva por evento |
| EVA | Evaluación | Documento que valora el cumplimiento, impacto o desempeño de una acción, persona, producto o proceso. Debe basarse en criterios objetivos y comparables para apoyar decisiones de mejora o continuidad. | • Criterios de evaluación definidos<br>• Resultado de indicadores cuantitativos o cualitativos<br>• Nivel de cumplimiento o desempeño<br>• Observaciones del evaluador<br>• Recomendaciones de mejora o reconocimiento | • Opiniones sin evidencia<br>• Información ajena al propósito evaluado<br>• Juicios personales sin fundamento | • Evaluación de desempeño del personal<br>• Evaluación de campañas publicitarias<br>• Evaluación de calidad de proveedores | Según ciclo de evaluación definido (mensual, semestral, anual) |
| MEM | Memorando | Documento breve y directo utilizado como medio de comunicación interna entre áreas, jefaturas o colaboradores. Sirve para informar, instruir, justificar o solicitar algo de forma formal, pero ágil. Es ideal para temas puntuales o administrativos. | • Fecha de emisión<br>• Asunto claro y específico<br>• Destinatario y remitente<br>• Cuerpo del mensaje (breve y directo)<br>• Firma o validación del emisor | • Desarrollos normativos o técnicos extensos<br>• Documentos ajenos al mensaje principal sin contexto<br>• Lenguaje informal o poco estructurado | • Memorando de notificación de uso de formato actualizado<br>• Memorando de recordatorio de cumplimiento normativo<br>• Memorando de instrucción de procedimiento temporal | No aplica. Se emite por necesidad y se archiva |
| SOL | Solicitud | Documento mediante el cual una persona o unidad solicita formalmente una acción, recurso, autorización o cambio. Puede ser parte de un flujo aprobado o usado como registro inicial de una necesidad operativa o administrativa. | • Identificación del solicitante<br>• Fecha de solicitud<br>• Descripción clara y precisa de lo que se solicita<br>• Justificación o motivo (si aplica)<br>• Espacio para firma o aprobación | • Declaraciones normativas (va en políticas)<br>• Información sin relación con la solicitud<br>• Opiniones personales o no verificables | • Solicitud de permisos, vacaciones o materiales<br>• Solicitud de acceso a sistemas o claves<br>• Solicitud de modificación de turnos o recursos | No aplica. Se genera y gestiona según flujo o proceso |
| ESD | Esquemas Documentales | Documento gráfico o visual que representa la estructura, distribución, relaciones o flujos de la organización. Incluye organigramas, mapas de procesos, matrices de responsabilidades y otros diagramas organizativos. | • Título claro y código único<br>• Versión y fecha de emisión<br>• Leyenda o clave explicativa<br>• Representación gráfica clara y actualizada<br>• Fuente o responsable del esquema | • Información desactualizada<br>• Ambigüedades en símbolos o colores<br>• Falta de escala o proporción en diagramas | • Organigrama general• Mapa de procesos• Matriz RACI• Diagramas de flujos de trabajo | Anual o cada vez que se produzcan cambios estructurales |
| IND | Indicaciones | Documento breve que emite instrucciones puntuales o directrices específicas para ser aplicadas en una situación o periodo determinado. Es de carácter temporal y de aplicación directa. | • Objetivo claro<br>• Contexto o motivo<br>• Descripción detallada de la indicación<br>• Responsable de ejecución y seguimiento<br>• Vigencia o periodo de aplicación | • Políticas o normas generales<br>• Procedimientos completos<br>• Información que contradiga otros documentos vigentes | • Indicaciones para cierre de inventario<br>• Instrucciones para campañas promocionales<br>• Directivas en caso de emergencia | No aplica, es temporal por evento |
| PRG | Programa | Documento que detalla un conjunto organizado de actividades, objetivos y recursos planificados para ser ejecutados en un plazo determinado. Abarca desde programas de formación hasta campañas u otros proyectos. | • Nombre y objetivo del programa<br>• Alcance y beneficiarios<br>• Cronograma de actividades<br>• Recursos asignados<br>• Responsables y roles<br>• Indicadores de seguimiento (si aplica) | • Procedimientos detallados<br>• Políticas generales<br>• Información duplicada de otros programas | • Programa de capacitación anual<br>• Programa de mantenimiento preventivo<br>• Programa de responsabilidad social empresarial | Al inicio de cada periodo planificado (por ejemplo, anual) |

---

## 27. Vacíos o decisiones pendientes por confirmar

Estos puntos no impiden iniciar el desarrollo, pero deben confirmarse para cerrar diseño final:

1. Stack tecnológico definitivo si no se desea usar Next.js + TypeScript + PostgreSQL.
2. Método de autenticación: usuarios locales, SSO corporativo, Microsoft Entra ID, Google Workspace u otro.
3. Repositorio final de archivos: local, SharePoint, OneDrive, Google Drive, S3, MinIO, Azure Blob u otro.
4. Formatos permitidos de archivo: PDF, DOCX, XLSX, PPTX, imágenes u otros.
5. Si los lectores podrán ver previsualización del documento completo o solo metadatos y visor controlado.
6. Si la edición tipo Git debe implementarse desde el inicio con editor colaborativo real o si basta una primera versión con comentarios/sugerencias y consolidación.
7. Código correcto para Esquemas Documentales: en imagen aparece `ESQ`, en Excel aparece `ESD`.
8. Si la aprobación requiere firma electrónica, firma digital o solamente aprobación registrada en el sistema.
9. Si se enviarán notificaciones por correo.
10. Si habrá fechas de vigencia, vencimiento y alertas de revisión periódica.
11. Si los permisos de descarga aprobados tendrán vencimiento obligatorio.
12. Si los documentos obsoletos serán visibles para lectores o solo para administradores/editores.
13. Si se requiere multicompañía, multiárea o separación por unidades organizativas.
14. Si se requiere importación masiva inicial de documentos existentes.
15. Si se requiere integración con un sistema documental existente.

---

## 28. Orden sugerido de implementación

1. Crear estructura base del proyecto.
2. Configurar base de datos, ORM y migraciones.
3. Crear modelos principales.
4. Crear seed de roles, permisos, procesos y tipos documentales.
5. Implementar autenticación.
6. Implementar autorización por roles/permisos.
7. Implementar CRUD de catálogos.
8. Implementar solicitudes documentales.
9. Implementar documentos y versiones.
10. Implementar carga y protección de archivos.
11. Implementar revisión/aprobación.
12. Implementar oficialización.
13. Implementar relaciones documentales.
14. Implementar archivo histórico/obsoletos.
15. Implementar explorador documental.
16. Implementar reportes/exportaciones.
17. Implementar auditoría.
18. Crear pruebas básicas.
19. Crear README final.

---

## 29. Nota final para Codex

Priorizar una primera versión funcional y escalable. No simplificar reglas de negocio críticas, especialmente:

- Control de roles y permisos.
- Código único y versionamiento.
- Aprobación unánime.
- Rechazo con observación obligatoria.
- Trazabilidad histórica.
- Inactivación de relaciones en vez de eliminación.
- Documento sustituto obligatorio para dar de baja.
- Restricción de descarga para lectores.

Si algún requerimiento avanzado no puede completarse en la primera iteración, dejar la estructura de datos, servicios e interfaz preparados para completarlo después.
