$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$serverDir = Join-Path $root "server"
$clientDir = Join-Path $root "client"

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][scriptblock]$Script,
    [Parameter(Mandatory = $true)][string]$StepName
  )
  & $Script
  if ($LASTEXITCODE -ne 0) {
    throw "[FAIL] $StepName failed with exit code $LASTEXITCODE"
  }
}

Write-Host "==> [1/3] Preflight (prod domains)"
Push-Location $root
Invoke-Step -StepName "Preflight" -Script {
  node scripts/preflight-launch.mjs --url https://slaytim.com --api-url https://api.slaytim.com/api
}
Pop-Location

Write-Host "==> [2/3] Staging proof (conversion chain)"
Push-Location $serverDir
Invoke-Step -StepName "Staging proof" -Script {
  npm run staging:proof
}
Pop-Location

Write-Host "==> [3/3] E2E smoke (Playwright)"
Push-Location $clientDir
Invoke-Step -StepName "E2E smoke" -Script {
  npm run test:e2e
}
Pop-Location

Write-Host ""
Write-Host "[OK] Release gate passed: preflight + staging proof + e2e smoke"
