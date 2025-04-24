@echo off
REM Levanta el servidor primero
start "" iniciar-servidor.bat

REM Espera 2 segundos para asegurar que el servidor arranque antes de la app
timeout /t 2 >nul

REM Ejecuta la aplicación principal
start "" Transmisiones-Frias.exe
