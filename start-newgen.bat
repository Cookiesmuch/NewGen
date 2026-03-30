@echo off
setlocal EnableExtensions
cd /d "%~dp0"
node Server/server.js --from-bat
