@echo off
rem Keep Windows CRLF line endings; launcher-format.test.cjs checks this.
cd /d "%~dp0"
if exist "release\ModernFrontHD-3.16.0\ModernFrontHD.exe" (
 start "" "release\ModernFrontHD-3.16.0\ModernFrontHD.exe"
) else if exist "release\ModernFrontHD\ModernFrontHD.exe" (
 start "" "release\ModernFrontHD\ModernFrontHD.exe"
) else (
 echo Desktop build is missing. Run build-desktop.ps1 first.
 pause
)
