@echo off
:: Instala el bot como servicio de Windows usando NSSM.
:: Ejecutar como Administrador.
:: Requisito: nssm.exe en esta misma carpeta (servicio\nssm.exe)
:: Descarga: https://nssm.cc/download  (usar win64\nssm.exe)

setlocal
cd /d "%~dp0"

net session >nul 2>&1
if errorlevel 1 (
  echo ERROR: Ejecuta este archivo como Administrador ^(clic derecho - Ejecutar como administrador^).
  pause
  exit /b 1
)

set "NSSM=%~dp0nssm.exe"
if not exist "%NSSM%" (
  echo ERROR: No se encontro nssm.exe en:
  echo   %NSSM%
  echo.
  echo 1. Descarga NSSM desde https://nssm.cc/download
  echo 2. Copia win64\nssm.exe a esta carpeta ^(servicio^)
  echo 3. Vuelve a ejecutar este script.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js no esta en el PATH. Instala Node.js LTS y reabre la consola.
  pause
  exit /b 1
)

for /f "delims=" %%i in ('where node') do set "NODE_EXE=%%i" & goto :node_ok
:node_ok

set "APP_DIR=%~dp0.."
for %%I in ("%APP_DIR%") do set "APP_DIR=%%~fI"
set "SCRIPT=%APP_DIR%\index.js"
set "LOG_DIR=%APP_DIR%\logs"
set "SERVICE_NAME=MedimujerEmailRecordatorios"

if not exist "%SCRIPT%" (
  echo ERROR: No se encontro index.js en %APP_DIR%
  pause
  exit /b 1
)

if not exist "%APP_DIR%\.env" (
  echo ADVERTENCIA: No existe .env en el proyecto. Configuralo antes de iniciar el servicio.
)

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo.
echo === Instalando servicio Windows ===
echo Nombre:     %SERVICE_NAME%
echo Node:       %NODE_EXE%
echo Script:     %SCRIPT%
echo Directorio: %APP_DIR%
echo Logs:       %LOG_DIR%
echo.

"%NSSM%" stop "%SERVICE_NAME%" >nul 2>&1
"%NSSM%" remove "%SERVICE_NAME%" confirm >nul 2>&1

"%NSSM%" install "%SERVICE_NAME%" "%NODE_EXE%" "\"%SCRIPT%\""
if errorlevel 1 (
  echo ERROR al instalar el servicio.
  pause
  exit /b 1
)

"%NSSM%" set "%SERVICE_NAME%" AppDirectory "%APP_DIR%"
"%NSSM%" set "%SERVICE_NAME%" DisplayName "MEDIMUJER - Recordatorios por Correo"
"%NSSM%" set "%SERVICE_NAME%" Description "Envia correos de confirmacion y recordatorio de citas medicas."
"%NSSM%" set "%SERVICE_NAME%" Start SERVICE_AUTO_START
"%NSSM%" set "%SERVICE_NAME%" AppStdout "%LOG_DIR%\servicio-out.log"
"%NSSM%" set "%SERVICE_NAME%" AppStderr "%LOG_DIR%\servicio-err.log"
"%NSSM%" set "%SERVICE_NAME%" AppRotateFiles 1
"%NSSM%" set "%SERVICE_NAME%" AppRotateBytes 2097152
"%NSSM%" set "%SERVICE_NAME%" AppExit Default Restart
"%NSSM%" set "%SERVICE_NAME%" AppRestartDelay 10000

"%NSSM%" start "%SERVICE_NAME%"
if errorlevel 1 (
  echo El servicio se instalo pero no arranco. Revisa logs y .env.
) else (
  echo.
  echo Servicio instalado e iniciado correctamente.
)

echo.
echo Comandos utiles:
echo   services.msc
echo   nssm status %SERVICE_NAME%
echo   nssm stop %SERVICE_NAME%
echo   nssm start %SERVICE_NAME%
echo   nssm restart %SERVICE_NAME%
echo.
pause
endlocal
