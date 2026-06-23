@echo off
setlocal

cd /d "%~dp0"
set "HOST=127.0.0.1"
if "%PORT%"=="" set "PORT=3000"
if not "%~1"=="" set "PORT=%~1"
if "%AUTO_APPLY_DB_SCHEMA%"=="" set "AUTO_APPLY_DB_SCHEMA=1"
set "APP_URL=http://%HOST%:%PORT%"

call :validar_entorno
if errorlevel 1 exit /b 1

call :validar_puerto_libre
if errorlevel 1 exit /b 1

call :diagnostico_runtime
if errorlevel 1 exit /b 1

echo ==========================================
echo   Gestor Documental - Modo Produccion
echo ==========================================
echo.
if /I "%AUTO_APPLY_DB_SCHEMA%"=="0" (
  echo Paso 1: sincronizacion de base de datos omitida por AUTO_APPLY_DB_SCHEMA=0.
) else (
  echo Paso 1: generando cliente Prisma...
  echo.
  call npm.cmd run db:generate
  set "DB_GENERATE_EXIT_CODE=%ERRORLEVEL%"
  if not "%DB_GENERATE_EXIT_CODE%"=="0" (
    echo.
    echo No fue posible generar Prisma Client.
    echo La app no se iniciara hasta corregir este paso.
    pause
    exit /b %DB_GENERATE_EXIT_CODE%
  )

  echo.
  echo Paso 2: aplicando schema Prisma a la base de datos...
  echo.
  call npm.cmd run db:push
  set "DB_PUSH_EXIT_CODE=%ERRORLEVEL%"
  if not "%DB_PUSH_EXIT_CODE%"=="0" (
    echo.
    echo No fue posible aplicar el schema Prisma.
    echo Revisa DATABASE_URL, permisos del usuario SQL y cambios destructivos pendientes.
    pause
    exit /b %DB_PUSH_EXIT_CODE%
  )

  echo.
  echo Paso 3: alineando indices SQL Server...
  echo.
  call npm.cmd run db:setup:sqlserver
  set "DB_SQLSERVER_EXIT_CODE=%ERRORLEVEL%"
  if not "%DB_SQLSERVER_EXIT_CODE%"=="0" (
    echo.
    echo No fue posible alinear los indices filtrados de SQL Server.
    pause
    exit /b %DB_SQLSERVER_EXIT_CODE%
  )

  echo.
  echo Paso 4: alineando extensiones de schema complementarias...
  echo.
  call npm.cmd run db:setup:request-tracking
  set "DB_REQUEST_TRACKING_EXIT_CODE=%ERRORLEVEL%"
  if not "%DB_REQUEST_TRACKING_EXIT_CODE%"=="0" (
    echo.
    echo No fue posible alinear el schema complementario de solicitudes.
    pause
    exit /b %DB_REQUEST_TRACKING_EXIT_CODE%
  )
)

echo.
echo Paso 5: compilando la aplicacion...
echo.

call npm.cmd run build
set "BUILD_EXIT_CODE=%ERRORLEVEL%"

if not "%BUILD_EXIT_CODE%"=="0" (
  echo.
  echo La compilacion fallo. No se iniciara el servidor de produccion.
  pause
  exit /b %BUILD_EXIT_CODE%
)

echo.
echo Compilacion completada.
echo URL: %APP_URL%
echo.
echo Para detener la aplicacion, cierra esta ventana o presiona Ctrl+C.
echo.

call npm.cmd run start -- --hostname %HOST% --port %PORT%

set "START_EXIT_CODE=%ERRORLEVEL%"
if not "%START_EXIT_CODE%"=="0" (
  echo.
  echo El servidor de produccion no pudo iniciarse correctamente.
  pause
)

exit /b %START_EXIT_CODE%

:validar_entorno
if not exist "package.json" (
  echo.
  echo No se encontro package.json en la carpeta actual.
  echo Ejecuta este archivo desde la raiz del proyecto.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo.
  echo No se encontro la carpeta node_modules.
  echo Antes de iniciar la aplicacion debes ejecutar:
  echo   npm install
  pause
  exit /b 1
)

if not exist ".env" if "%DATABASE_URL%"=="" (
  echo.
  echo No se encontro el archivo .env y DATABASE_URL no esta definida en el entorno.
  echo Configura las variables de entorno del servidor o coloca un .env valido antes de continuar.
  pause
  exit /b 1
)

exit /b 0

:validar_puerto_libre
set "PORT_PID="
for /f "tokens=2,5" %%A in ('netstat -ano -p TCP ^| findstr /C:"LISTENING" ^| findstr /C:"%HOST%:%PORT%"') do (
  if "%%A"=="%HOST%:%PORT%" set "PORT_PID=%%B"
)

if defined PORT_PID (
  echo.
  echo El puerto %HOST%:%PORT% ya esta en uso por el proceso PID %PORT_PID%.
  echo Si esa instancia ya corresponde a la aplicacion, abre %APP_URL% en el navegador.
  echo Si necesitas otra instancia, cierra el proceso anterior o usa otro puerto.
  echo.
  echo Ejemplos:
  echo   iniciar-app-produccion.cmd 3001
  echo   set PORT=3001 ^& iniciar-app-produccion.cmd
  pause
  exit /b 1
)

exit /b 0

:diagnostico_runtime
echo.
echo Verificando configuracion de runtime...

if defined LIBREOFFICE_EXECUTABLE_PATH (
  if exist "%LIBREOFFICE_EXECUTABLE_PATH%" (
    echo LibreOffice detectado en variable de entorno:
    echo   %LIBREOFFICE_EXECUTABLE_PATH%
  ) else (
    echo ADVERTENCIA: LIBREOFFICE_EXECUTABLE_PATH esta definida, pero el archivo no existe:
    echo   %LIBREOFFICE_EXECUTABLE_PATH%
    echo La app iniciara, pero Word y PowerPoint no tendran vista previa hasta corregirlo.
  )
  exit /b 0
)

if exist ".env" (
  findstr /B /C:"LIBREOFFICE_EXECUTABLE_PATH=" ".env" >nul
  if not errorlevel 1 (
    echo LibreOffice sera tomado desde el archivo .env al iniciar la aplicacion.
    exit /b 0
  )
)

echo ADVERTENCIA: No se detecto LIBREOFFICE_EXECUTABLE_PATH en el entorno actual.
echo La app iniciara, pero la vista previa ofimatica quedara deshabilitada hasta configurarlo.
exit /b 0
