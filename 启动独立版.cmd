@echo off
cd /d "%~dp0"
if exist "release\ModernFrontHD\ModernFrontHD.exe" (
 start "" "release\ModernFrontHD\ModernFrontHD.exe"
) else (
 echo Desktop build is missing. Run build-desktop.ps1 first.
 pause
)
