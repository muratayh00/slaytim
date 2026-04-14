@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-all.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] Stop script failed.
  pause
  exit /b 1
)

echo [REDIS] Stopping Redis...
pushd "%~dp0server"
call npm run redis:down
if errorlevel 1 (
  echo [WARN] redis:down failed ^(container may already be stopped^).
) else (
  echo [OK] Redis stopped.
)
popd

echo.
echo [OK] System stopped.
exit /b 0
