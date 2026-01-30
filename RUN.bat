@echo off
chcp 65001 >nul
cls
echo ========================================
echo    ORIONIS Website
echo ========================================
echo.
echo Запуск сервера...
echo.

cd /d "%~dp0"
node src/server.js

pause
