@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "%~dp0release\ModernFrontHD-3.8.2\ModernFrontHD.exe" (
  call "%~dp0启动独立版.cmd"
  exit /b
)
if exist "%~dp0release\ModernFrontHD\ModernFrontHD.exe" (
  call "%~dp0启动独立版.cmd"
  exit /b
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0play.ps1"
