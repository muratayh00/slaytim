$ErrorActionPreference = "SilentlyContinue"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $root "server"

Write-Host "==> Stopping worker/server/client node processes for this workspace..."

$pids = New-Object System.Collections.Generic.HashSet[int]

# 1) Kill known listeners on project ports.
# 3000 = Next.js client dev, 5001 = Express API, 3100 = Next.js E2E test server
$portMatches = netstat -ano | Select-String "LISTENING" | Select-String ":3000|:3100|:5001|:5002"
foreach ($m in $portMatches) {
  $parts = ($m.ToString().Trim() -split "\s+")
  if ($parts.Length -ge 5) {
    $procId = 0
    if ([int]::TryParse($parts[-1], [ref]$procId)) { [void]$pids.Add($procId) }
  }
}

# 2) Kill known dev process signatures (for this stack).
$workspacePids = Get-CimInstance Win32_Process -Filter "name='node.exe'" |
  Where-Object {
    if (-not $_.CommandLine) {
      $false
    } else {
      $cmd = $_.CommandLine.ToLowerInvariant()
      (
        $cmd -like "*worker-conversion-redis.js*" -or
        $cmd -like "*conversion.worker.js*" -or
        $cmd -like "*src/index.js*" -or
        $cmd -like "*nodemon*" -or
        $cmd -like "*next*dist*bin*next*" -or
        $cmd -like "*start-server.js*"
      )
    }
  } |
  Select-Object -ExpandProperty ProcessId

foreach ($procId in $workspacePids) { [void]$pids.Add([int]$procId) }

if ($pids.Count -gt 0) {
  foreach ($procId in $pids) {
    try {
      Stop-Process -Id $procId -Force
      Write-Host "stopped pid=$procId"
    } catch {}
  }
} else {
  Write-Host "No matching node process found."
}

Write-Host "==> Stopping Redis (Docker)..."
Push-Location $serverDir
npm run redis:down | Out-Null
Pop-Location

Write-Host "Done."
