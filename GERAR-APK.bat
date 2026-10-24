@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gerar-apk.ps1" %*
pause
