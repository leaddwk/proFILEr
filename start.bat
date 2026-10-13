@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if not errorlevel 1 (
  node server.mjs
  goto done
)
echo Node.js 22 or later is required. Install it from https://nodejs.org
:done
pause
