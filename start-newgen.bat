@echo off
setlocal EnableExtensions
cd /d "%~dp0"
node server.js --from-bat
if errorlevel 1 pause
