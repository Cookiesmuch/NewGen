@echo off
setlocal enabledelayedexpansion

echo Starting NewGen Server...
echo.

REM Start Node server in background
start "NewGen" /B node server.js

REM Wait for server to start
echo Waiting for server to start...
timeout /t 3 /nobreak

REM Open browser
echo Opening browser at http://localhost:3000...
start http://localhost:3000

REM Keep window open
echo.
echo NewGen is running at http://localhost:3000
echo Close this window to stop the server.
echo.
pause
