# Despliegue Windows Server

## Objetivo

Esta aplicacion se despliega como web self-hosted en Windows Server.
LibreOffice no va dentro del codigo fuente de la app: se instala o se despliega como runtime del servidor, en carpeta separada, y la app lo invoca para generar vistas previas de Word y PowerPoint.

## Estructura recomendada

```text
C:\Apps\GestorDocumental\
  app\
  runtime\
    libreoffice\
      program\
        soffice.com
  storage\
  logs\
```

## Variables de entorno recomendadas

```env
AUTH_MODE=database
FILE_STORAGE_ROOT=./storage
FILE_PREVIEW_CACHE_ROOT=./storage/derived-previews
LIBREOFFICE_EXECUTABLE_PATH=C:\Apps\GestorDocumental\runtime\libreoffice\program\soffice.com
LIBREOFFICE_TIMEOUT_MS=45000
SERVER_ACTIONS_BODY_SIZE_LIMIT=64mb
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=<base64-fixed-key>
```

## Criterio operativo

- Las politicas de extensiones y limites de carga se administran desde `/admin/settings`.
- La ruta a LibreOffice y el timeout se administran desde el entorno del servidor.
- Excel se previsualiza en HTML.
- PDF e imagenes se muestran nativamente.
- Word, PowerPoint y formatos ofimaticos compatibles se convierten server-side a PDF para vista previa.

## Pasos para IT

1. Desplegar la aplicacion en `C:\Apps\GestorDocumental\app`.
2. Desplegar LibreOffice en `C:\Apps\GestorDocumental\runtime\libreoffice`.
3. Configurar variables de entorno del servicio o pool que ejecuta Node.js.
4. Ejecutar `iniciar-app-produccion.cmd`.
5. Publicar la app detras de un reverse proxy en IIS, nginx o equivalente.

## Notas

- `iniciar-app-produccion.cmd` ahora ejecuta `db:generate`, `db:push`, `db:setup:sqlserver` y `db:setup:request-tracking` antes de compilar y arrancar.
- Eso deja aplicado en la base el `schema.prisma` vigente, incluyendo la tabla `AppSetting` usada por la administracion de formatos y limites.
- Si IT necesita omitir la sincronizacion automatica en un arranque puntual, puede usar `set AUTO_APPLY_DB_SCHEMA=0` antes de ejecutar el script.
- No se recomienda almacenar la ruta del ejecutable de LibreOffice en base de datos porque es un dato de infraestructura, no de negocio.
- Si se despliegan multiples instancias, definir `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` compartida entre todas.
- La cache de previews puede limpiarse sin afectar los archivos originales; se regenerara bajo demanda.
