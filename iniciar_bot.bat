@echo off
title Bot de WhatsApp - Recordatorios
echo ===================================================
echo     Iniciando Bot de WhatsApp para Recordatorios
echo ===================================================
echo.
:: Cambiar al directorio donde se encuentra este archivo .bat
cd /d "%~dp0"

:: Ejecutar el proyecto
node index.js

echo.
echo El bot se ha detenido o ha ocurrido un error.
pause
