@echo off
setlocal
cd /d "%~dp0"
title proFILEr
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-windows.ps1"
pause
