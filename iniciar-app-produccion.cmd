@echo off
setlocal

cd /d "%~dp0"
set "HOST=127.0.0.1"
if "%PORT%"=="" set "PORT=3000"
if not "%~1"=="" set "PORT=%~1"
set "APP_URL=http://%HOST%:%PORT%"

call :validar_entorno
if errorlevel 1 exit /b 1

call :validar_puerto_libre
if errorlevel 1 exit /b 1

echo ==========================================
echo   Gestor Documental - Modo Produccion
echo ==========================================
echo.
echo Paso 1: compilando la aplicacion...
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
