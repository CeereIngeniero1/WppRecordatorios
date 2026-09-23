@echo off
:: Desinstala el servicio MedimujerEmailRecordatorios.
:: Ejecutar como Administrador.

setlocal
cd /d "%~dp0"

net session >nul 2>&1
if errorlevel 1 (
  echo ERROR: Ejecuta este archivo como Administrador.
  pause
  exit /b 1
)

set "NSSM=%~dp0nssm.exe"
set "SERVICE_NAME=MedimujerEmailRecordatorios"

if not exist "%NSSM%" (
  echo ERROR: No se encontro nssm.exe en esta carpeta.
  pause
  exit /b 1
)

echo Deteniendo y eliminando %SERVICE_NAME%...
"%NSSM%" stop "%SERVICE_NAME%"
"%NSSM%" remove "%SERVICE_NAME%" confirm

echo Listo.
pause
endlocal
