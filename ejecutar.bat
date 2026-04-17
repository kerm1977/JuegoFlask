@echo off
:: ===================================================
:: ENRUTADOR DE PROCESOS (No tocar)
:: ===================================================
if "%~1"=="FLASK_WATCHER" goto flask_watcher
if "%~1"=="TAIL_WATCHER" goto tail_watcher

:: ===================================================
:: PROCESO PRINCIPAL (Monitor y Lanzador)
:: ===================================================
title Lanzador de La Tribu (Modo Resiliente - Auto Reinicio)
color 0B

echo ===================================================
echo   Preparando Servidor Multijugador (Anti-Apagones)...
echo ===================================================
echo.

:: 1. Limpiar procesos colgados de sesiones anteriores
echo [*] Limpiando procesos colgados de Tailscale y Python...
taskkill /F /IM python.exe > nul 2>&1
taskkill /F /IM tailscale.exe > nul 2>&1

tailscale funnel reset > nul 2>&1
tailscale serve reset > nul 2>&1
timeout /t 2 /nobreak > nul

:: 2. Iniciar Flask en un proceso separado vigilado
echo [*] Iniciando Flask-SocketIO (Modo Guardian Activado)...
start "Servidor Flask (Auto-Reinicio)" "%~f0" FLASK_WATCHER
timeout /t 3 /nobreak > nul

:: 3. Iniciar Tailscale en un proceso separado vigilado
echo [*] Conectando Tailscale Funnel (Modo Guardian Activado)...
start "Tailscale Funnel (Auto-Reinicio)" "%~f0" TAIL_WATCHER
timeout /t 3 /nobreak > nul

:: 4. Abrir el navegador local para ti
echo [*] Abriendo la aplicacion en tu navegador local...
start http://127.0.0.1:5001

echo.
echo ===================================================
echo  [OK] SISTEMA DE DEFENSA Y AUTO-REINICIO ACTIVADO
echo ===================================================
echo  - Si cierras la ventana verde (Flask), se volvera a abrir.
echo  - Si cierras la ventana morada (Tailscale), se volvera a abrir.
echo  - Esta ventana azul vigilara tu conexion a Internet.
echo.
echo  PARA APAGAR TODO VERDADERAMENTE: 
echo  Cierra primero esta ventana azul, y luego las demas.
echo ===================================================
echo.

:: 5. Monitor de red en tiempo real (Se queda a la escucha siempre)
:monitor
ping -n 1 8.8.8.8 > nul
if errorlevel 1 (
    color 0C
    echo [%time%] [ALERTA] No hay conexion a internet. Esperando a que regrese la red...
) else (
    color 0B
    echo [%time%] [OK] Conexion a internet estable y funcionando.
)
:: Espera 10 segundos antes de volver a revisar
timeout /t 10 > nul
goto monitor

:: ===================================================
:: BLOQUES DE VIGILANCIA (WATCHDOGS INFINITOS)
:: ===================================================

:flask_watcher
title Servidor Flask
color 0A
:flask_loop
echo.
echo [!] Iniciando servidor Flask...
python app.py
echo.
echo [X] ALERTA: Flask se ha cerrado o ha fallado.
echo [*] Reiniciando servidor en 3 segundos...
timeout /t 3 > nul
goto flask_loop

:tail_watcher
title Tailscale Funnel
color 0D
:tail_loop
echo.
echo [!] Conectando a la red global de Tailscale...
tailscale funnel 5001
echo.
echo [X] ALERTA: Tailscale se ha desconectado o cerrado.
echo [*] Intentando reconectar en 5 segundos...
timeout /t 5 > nul
goto tail_loop