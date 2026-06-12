# Gestor Documental

Aplicación web inicial para gestión documental empresarial con:

- autenticación local preparada para SSO futuro
- administración de usuarios, roles y grupos lectores
- control de versiones documentales
- flujo de revisión, aprobación y oficialización
- explorador documental con lectura controlada
- consulta documental con IA sobre fuentes autorizadas
- arquitectura preparada para `SQL Server`, almacenamiento local abstraído y proveedor IA desacoplado

## Stack base

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Prisma` preparado para `SQL Server`

## Estado actual

La base implementada en esta iteración cubre:

- shell principal de producto
- login, logout y recuperación de contraseña en modo mock
- sesión por cookie firmada y protección de rutas
- navegación filtrada por rol
- autorización mock para lector, editor y administrador
- dashboard operativo
- vistas iniciales de solicitudes, documentos, revisión, explorador, IA y usuarios
- datos mock alineados al dominio
- configuración base para `SQL Server` y `.env`
- esquema inicial `Prisma` orientado al modelo documental

Todavía no están conectados:

- persistencia real
- autenticación contra base de datos o directorio corporativo
- almacenamiento real de archivos
- extracción/vectorización real
- autorizaciones ejecutadas contra base de datos

## Variables de entorno

Usa `.env.example` como punto de partida.

Variables clave:

- `DATABASE_URL`
- `AUTH_MODE`
- `SESSION_SECRET`
- `FILE_STORAGE_DRIVER`
- `AI_PROVIDER`
- `AI_CHAT_MODEL`
- `AI_EMBEDDING_MODEL`

## Credenciales demo

Mientras la autenticación siga en modo mock, la pantalla de login expone estas cuentas:

- `ana.pleitez / Admin123!`
- `luis.martinez / Editor123!`
- `juan.arias / Lector123!`

## Desarrollo local

1. Instalar dependencias:

```bash
npm install
```

En PowerShell local puede ser necesario usar:

```powershell
npm.cmd install
```

2. Crear `.env` a partir de `.env.example`.

3. Iniciar desarrollo:

```bash
npm run dev
```

4. Para validar sobre la build optimizada:

```bash
npm run build
npm run start
```

5. Abrir [http://localhost:3000](http://localhost:3000)

## Base de datos

El proyecto queda orientado a `SQL Server`. Para desarrollo local, la ruta recomendada es:

- `SQL Server 2022 Developer` con `TCP/IP` habilitado
- `SQL Server Express` si quieres una instalación más ligera

Nota práctica:

- `LocalDB` puede responder a `sqlcmd`, pero no es la ruta adecuada para Prisma en este proyecto.
- Prisma documenta para Windows local el uso de una instancia completa de SQL Server y la habilitación de `TCP/IP`.

## Scripts de base de datos

- `npm run db:generate`
- `npm run db:push`
- `npm run db:validate`
- `npm run db:studio`

## Próximas fases sugeridas

1. Conectar Prisma Client y repositorios sobre `SQL Server`.
2. Sustituir el repositorio mock de usuarios por autenticación real.
3. Crear migraciones iniciales.
4. Conectar carga de `PDF` y `DOCX`.
5. Implementar autorización unificada para lectura, histórico, descarga e IA.
6. Conectar pipeline real de extracción e indexación IA.
