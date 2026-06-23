@echo off
setlocal

cd /d "%~dp0"
set "HOST=127.0.0.1"
if "%PORT%"=="" set "PORT=3000"
if not "%~1"=="" set "PORT=%~1"
if "%AUTO_APPLY_DB_SCHEMA%"=="" set "AUTO_APPLY_DB_SCHEMA=0"
set "APP_URL=http://%HOST%:%PORT%"

call :validar_entorno
if errorlevel 1 exit /b 1

call :validar_puerto_libre
if errorlevel 1 exit /b 1

set "SHOULD_SYNC_DB=0"
if /I not "%AUTO_APPLY_DB_SCHEMA%"=="0" (
  if /I "%AUTH_MODE%"=="database" set "SHOULD_SYNC_DB=1"

  if "%SHOULD_SYNC_DB%"=="0" if exist ".env" (
    findstr /B /I /C:"AUTH_MODE=database" ".env" >nul
    if not errorlevel 1 set "SHOULD_SYNC_DB=1"

    findstr /B /I /C:"AUTH_MODE=\"database\"" ".env" >nul
    if not errorlevel 1 set "SHOULD_SYNC_DB=1"
  )

  if "%SHOULD_SYNC_DB%"=="1" (
    echo.
    echo Sincronizando schema Prisma para entorno database...
    echo.

    call npm.cmd run db:generate
    set "DB_GENERATE_EXIT_CODE=%ERRORLEVEL%"
    if not "%DB_GENERATE_EXIT_CODE%"=="0" (
      echo.
      echo No fue posible generar Prisma Client antes de iniciar la app.
      pause
      exit /b %DB_GENERATE_EXIT_CODE%
    )

    call npm.cmd run db:push
    set "DB_PUSH_EXIT_CODE=%ERRORLEVEL%"
    if not "%DB_PUSH_EXIT_CODE%"=="0" (
      echo.
      echo No fue posible aplicar el schema Prisma antes de iniciar la app.
      echo Revisa DATABASE_URL y el acceso a SQL Server.
      pause
      exit /b %DB_PUSH_EXIT_CODE%
    )
  )
)

echo ==========================================
echo   Gestor Documental - Modo Desarrollo
echo ==========================================
echo.
echo URL: %APP_URL%
echo.
echo Si es la primera vez que lo ejecutas, espera a que Next.js termine de arrancar.
echo Para detener la aplicacion, cierra esta ventana o presiona Ctrl+C.
echo.

call npm.cmd run dev -- --hostname %HOST% --port %PORT%

set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo La aplicacion no pudo arrancar correctamente.
  echo Revisa el mensaje mostrado arriba.
  pause
)

exit /b %EXIT_CODE%

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
  echo Si necesitas una nueva instancia, cierra el proceso anterior o usa otro puerto.
  echo.
  echo Ejemplos:
  echo   iniciar-app.cmd 3001
  echo   set PORT=3001 ^& iniciar-app.cmd
  pause
  exit /b 1
)

exit /b 0
