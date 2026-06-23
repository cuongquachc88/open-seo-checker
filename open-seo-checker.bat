@echo off
cd /d "%~dp0"
start /b node dist\index.js serve --port 7437
timeout /t 2 /nobreak >nul
start http://localhost:7437
