@echo off
title Lanzador de La Tribu (Flask + Tailscale Automatico)
color 0B

echo ===================================================
echo   Preparando Servidor Flask Multijugador...
echo ===================================================
echo.

:: 1. Cerrar procesos colgados y LIMPIAR TAILSCALE
echo [*] Limpiando procesos y caché de Tailscale...
taskkill /F /IM python.exe > nul 2>&1
taskkill /F /IM pocketbase.exe > nul 2>&1
taskkill /F /IM node.exe > nul 2>&1

:: Resetear configuraciones previas de Tailscale
tailscale funnel reset > nul 2>&1
tailscale serve reset > nul 2>&1
timeout /t 2 /nobreak > nul

:: 2. Iniciar Servidor Flask (Web + SocketIO)
:: Cambiamos al puerto 5001 para evitar conflictos de caché
echo [*] Iniciando Flask-SocketIO en el puerto 5001...
start "Servidor Flask" cmd /k "python app.py"
timeout /t 3 /nobreak > nul

:: 3. Iniciar Tailscale Funnel
echo [*] Conectando el embudo de Tailscale Funnel al puerto 5001...
start "Tailscale Funnel" cmd /k "tailscale funnel 5001"
timeout /t 3 /nobreak > nul

:: 4. Abrir navegadores
echo [*] Abriendo la aplicacion en tu navegador...
start http://127.0.0.1:5001

echo.
echo ===================================================
echo  ¡Todo listo! 
echo  Servidor de Juegos iniciado en el puerto 5001.
echo  Comparte tu enlace de Tailscale sin problemas.
echo.
echo  [ ! ] MODO ANTI-SUSPENSION ACTIVADO [ ! ]
echo  Esta ventana enviara un latido de red (Ping) 
echo  cada 60 segundos para evitar que Tailscale 
echo  y la tarjeta de red se duerman. 
echo  MINIMIZALA PERO NO LA CIERRES.
echo ===================================================

:latido
ping 100.100.100.100 -n 1 -w 2000 > nul 2>&1
ping 8.8.8.8 -n 1 -w 2000 > nul 2>&1
timeout /t 60 /nobreak > nul
goto latido