@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\release-gate.ps1"
if errorlevel 1 (
  echo.
  echo [FAIL] Release gate failed.
  exit /b 1
)

echo.
echo [OK] Release gate passed.
exit /b 0

