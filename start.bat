@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if not errorlevel 1 (
  node server.mjs
  goto done
)
set "PROFILER_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%PROFILER_NODE%" (
  "%PROFILER_NODE%" server.mjs
  goto done
)
echo Node.js 22 or later is required. Install it from https://nodejs.org
:done
pause
