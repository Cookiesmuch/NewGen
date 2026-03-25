@echo off
setlocal enabledelayedexpansion

echo Starting NewGen Server...
echo.

node server.js &
set SERVER_PID=!errorlevel!

timeout /t 2 /nobreak

echo Opening browser...
start http://localhost:3000

echo.
echo NewGen is running at http://localhost:3000
echo Close this window to stop the server.
echo.

pause
