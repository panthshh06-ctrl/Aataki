@echo off
TITLE Aataki Admin System Setup and Launch
cd /d "%~dp0"
color 0A
echo ===================================================
echo   Aataki E-Commerce Admin Management System Setup
echo ===================================================
echo.

echo [1/4] Checking Node.js version...
node -v

echo.
echo [2/4] Installing dependencies...
call npm install --ignore-scripts

echo.
echo [3/4] Seeding database with initial admin and sample data...
node backend/database/seed.js

echo.
echo [4/4] Starting Aataki server...
echo The server will print the active website and admin URL.
echo If port 3000 is busy, it will automatically use port 3001.
echo Default Login: admin@aataki.com / Admin@123
echo.
node backend/server.js
pause
