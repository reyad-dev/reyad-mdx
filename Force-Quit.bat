@echo off
title ReyadMDX - Force quit
echo.
echo   Closing any stuck ReyadMDX / Electron instance...
echo.

taskkill /F /IM "ReyadMDX.exe" >nul 2>nul
if not errorlevel 1 echo   - closed: ReyadMDX.exe

taskkill /F /IM electron.exe >nul 2>nul
if not errorlevel 1 echo   - closed: electron.exe

echo.
echo   Done. You can start the app again now.
timeout /t 3 >nul
