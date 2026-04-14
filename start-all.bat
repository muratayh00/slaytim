@echo off
setlocal
cd /d "%~dp0"

echo [REDIS] Starting Redis...
pushd "%~dp0server"
call npm run redis:up
if errorlevel 1 (
  echo [WARN] redis:up failed. PowerShell launcher will retry.
) else (
  call npm run redis:check
  if errorlevel 1 (
    echo [WARN] redis:check failed. PowerShell launcher will enforce STRICT_REDIS.
  ) else (
    echo [OK] Redis is reachable.
  )
)
popd

set STRICT_REDIS=true

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-all.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] Start script failed.
  pause
  exit /b 1
)

echo.
echo [OK] System started.
exit /b 0
