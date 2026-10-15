@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "%~dp0release\ModernFrontHD\ModernFrontHD.exe" (
  start "" "%~dp0release\ModernFrontHD\ModernFrontHD.exe"
  exit /b
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0play.ps1"
