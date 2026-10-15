@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 未找到 Node.js。请双击“启动游戏.cmd”以离线方式打开。
  pause
  exit /b 1
)
start "" "http://127.0.0.1:8765"
node server.cjs
pause
