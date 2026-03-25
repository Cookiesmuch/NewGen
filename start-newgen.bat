@echo off
setlocal enabledelayedexpansion

echo Starting NewGen Server...
start "NewGen Server" node server.js

echo Waiting for server to start...
timeout /t 2 /nobreak

echo Opening browser...
start http://localhost:3000

echo.
echo NewGen is running at http://localhost:3000
echo Close this window to stop the server.
echo.

:wait
timeout /t 1 /nobreak >nul
tasklist /fi "imagename eq node.exe" /fo csv | find /i "node.exe" >nul
if not errorlevel 1 goto wait

echo Server stopped.
pause
