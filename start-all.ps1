$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $root "server"
$clientDir = Join-Path $root "client"
$logDir = Join-Path $root ".codex-logs"

if (!(Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Get-NodeProcessByPattern {
  param([string]$Pattern)
  Get-CimInstance Win32_Process -Filter "name='node.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine -match [Regex]::Escape($Pattern) }
}

function Test-PortListening {
  param([int]$Port)
  $line = netstat -ano | Select-String "LISTENING" | Select-String ":$Port\s"
  return [bool]$line
}

function Start-DetachedPowerShell {
  param(
    [string]$Name,
    [string]$WorkingDir,
    [string]$Command,
    [string]$DetectPattern,
    [string]$LogFile,
    [int]$Port = 0
  )

  $existing = Get-NodeProcessByPattern -Pattern $DetectPattern
  if ($existing) {
    Write-Host "[$Name] already running (PID: $($existing[0].ProcessId))"
    return
  }

  if ($Port -gt 0 -and (Test-PortListening -Port $Port)) {
    Write-Warning "[$Name] port $Port is occupied by another process. Not starting to avoid false-positive startup."
    return
  }

  $cmd = "cd `"$WorkingDir`"; $Command *>> `"$LogFile`""
  Start-Process -FilePath "powershell" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $cmd | Out-Null
  Write-Host "[$Name] started"
}

function Wait-RedisReady {
  param(
    [string]$WorkingDir,
    [int]$MaxAttempts = 20,
    [int]$SleepSeconds = 1
  )

  Push-Location $WorkingDir
  try {
    for ($i = 1; $i -le $MaxAttempts; $i++) {
      npm run redis:check *> $null
      if ($LASTEXITCODE -eq 0) {
        Write-Host "[redis] ready (attempt $i/$MaxAttempts)"
        return $true
      }
      Write-Host "[redis] waiting... ($i/$MaxAttempts)"
      Start-Sleep -Seconds $SleepSeconds
    }
    Write-Warning "[redis] not ready after $MaxAttempts attempts."
    return $false
  } finally {
    Pop-Location
  }
}

function Test-DockerAvailable {
  try {
    docker info *> $null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

function Ensure-DockerEngine {
  param(
    [int]$MaxAttempts = 30,
    [int]$SleepSeconds = 2
  )

  if (Test-DockerAvailable) {
    return $true
  }

  Write-Host "[docker] engine not ready, trying to start Docker Desktop..."
  $dockerDesktopExe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
  if (Test-Path $dockerDesktopExe) {
    try {
      Start-Process -FilePath $dockerDesktopExe | Out-Null
    } catch {
      Write-Warning "[docker] Docker Desktop could not be started automatically: $($_.Exception.Message)"
    }
  } else {
    Write-Warning "[docker] Docker Desktop executable not found at $dockerDesktopExe"
  }

  # Best-effort service start (may require elevated privileges)
  try {
    $svc = Get-Service -Name "com.docker.service" -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -ne "Running") {
      Start-Service -Name "com.docker.service" -ErrorAction SilentlyContinue
    }
  } catch {}

  for ($i = 1; $i -le $MaxAttempts; $i++) {
    Start-Sleep -Seconds $SleepSeconds
    if (Test-DockerAvailable) {
      Write-Host "[docker] engine ready (attempt $i/$MaxAttempts)"
      return $true
    }
    Write-Host "[docker] waiting for engine... ($i/$MaxAttempts)"
  }

  Write-Warning "[docker] engine is still unavailable."
  return $false
}

function Cleanup-ConflictingDockerStacks {
  param([string]$ServerDir)
  $composeFiles = @(
    (Join-Path $ServerDir "docker-compose.staging.e2e.yml"),
    (Join-Path $ServerDir "docker-compose.staging.yml")
  )

  foreach ($compose in $composeFiles) {
    if (Test-Path $compose) {
      try {
        docker compose -f $compose down --remove-orphans *> $null
      } catch {}
    }
  }
}

function Get-EnvValueFromFile {
  param(
    [string]$FilePath,
    [string]$Key
  )

  if (!(Test-Path $FilePath)) {
    return $null
  }

  $line = Get-Content -Path $FilePath | Where-Object { $_ -match "^\s*$Key\s*=" } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  $value = ($line -replace "^\s*$Key\s*=\s*", "").Trim()
  if ($value.StartsWith('"') -and $value.EndsWith('"')) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  return $value
}

function Test-ServerEnvPreflight {
  param([string]$ServerDir)

  $envFile = Join-Path $ServerDir ".env"
  if (!(Test-Path $envFile)) {
    Write-Warning "[env] server/.env not found. Dev server may start with missing DB config."
    return
  }

  $databaseUrl = Get-EnvValueFromFile -FilePath $envFile -Key "DATABASE_URL"
  $directUrl = Get-EnvValueFromFile -FilePath $envFile -Key "DIRECT_URL"

  if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    Write-Warning "[env] DATABASE_URL is missing in server/.env"
  } elseif ($databaseUrl -match "<SUPABASE_DB_PASSWORD>|YOUR-PASSWORD|your_password_here") {
    Write-Warning "[env] DATABASE_URL still contains placeholder password."
  } elseif ($databaseUrl -notmatch "pooler\.supabase\.com:6543") {
    Write-Warning "[env] DATABASE_URL is not using Supabase transaction pooler (:6543)."
  } else {
    Write-Host "[env] DATABASE_URL uses Supabase transaction pooler."
  }

  if ([string]::IsNullOrWhiteSpace($directUrl)) {
    Write-Warning "[env] DIRECT_URL is missing in server/.env"
  } elseif ($directUrl -match "<SUPABASE_DB_PASSWORD>|YOUR-PASSWORD|your_password_here") {
    Write-Warning "[env] DIRECT_URL still contains placeholder password."
  } else {
    Write-Host "[env] DIRECT_URL configured."
  }
}

Test-ServerEnvPreflight -ServerDir $serverDir

Write-Host "==> Starting Redis (Docker)..."
$redisReady = $false
if (Ensure-DockerEngine -MaxAttempts 30 -SleepSeconds 2) {
  try {
    Cleanup-ConflictingDockerStacks -ServerDir $serverDir
    Push-Location $serverDir
    npm run redis:up | Out-Null
    Pop-Location
    $redisReady = Wait-RedisReady -WorkingDir $serverDir -MaxAttempts 20 -SleepSeconds 1
  } catch {
    try { Pop-Location } catch {}
    Write-Warning "[redis] Docker available but Redis failed to start. Worker will be skipped."
    $redisReady = $false
  }
} else {
  Write-Host "[redis] Docker engine not available. Running server in local fallback mode."
  $redisReady = $false
}

$strictRedisRaw = if ($null -ne $env:STRICT_REDIS -and $env:STRICT_REDIS -ne '') { $env:STRICT_REDIS } else { 'false' }
$strictRedis = ([string]$strictRedisRaw).ToLowerInvariant() -eq 'true'
if ($strictRedis -and -not $redisReady) {
  Write-Error "[redis] STRICT_REDIS=true and Redis is not ready. Aborting startup (no fallback allowed)."
  exit 1
}

Write-Host "==> Starting worker / server / client..."
# fresh log files per boot to avoid stale/confusing historical errors
@(
  (Join-Path $logDir "worker.log")
  (Join-Path $logDir "server-dev.log")
  (Join-Path $logDir "client-dev.log")
) | ForEach-Object {
  try { if (Test-Path $_) { Clear-Content $_ -Force } } catch {}
}

if ($redisReady) {
  Start-DetachedPowerShell -Name "worker" -WorkingDir $serverDir -Command "npm run worker:conversion:redis" -DetectPattern "worker-conversion-redis.js" -LogFile (Join-Path $logDir "worker.log")
} else {
  Write-Host "[worker] skipped (Redis not ready, fallback mode active)"
}
$recEnvCommand = "`$env:REC_ENABLED='true'; `$env:REC_SHADOW_MODE='true'; `$env:REC_SERVE_SLIDEO_FEED='false'; `$env:REC_CANARY_PERCENT='0';"
$serverCommand = if ($redisReady) {
  "$recEnvCommand `$env:REDIS_ENABLED='true'; `$env:CONVERSION_LOCAL_FALLBACK='false'; npm run dev"
} else {
  "$recEnvCommand `$env:REDIS_ENABLED='false'; npm run dev"
}
if (-not $redisReady) {
  Write-Host "[server] starting with REDIS_ENABLED=false (fallback mode)"
}
Write-Host "[server] recommendation env: REC_ENABLED=true, REC_SHADOW_MODE=true, REC_SERVE_SLIDEO_FEED=false, REC_CANARY_PERCENT=0"
Start-DetachedPowerShell -Name "server" -WorkingDir $serverDir -Command $serverCommand -DetectPattern "src/index.js" -LogFile (Join-Path $logDir "server-dev.log") -Port 5001
Start-DetachedPowerShell -Name "client" -WorkingDir $clientDir -Command "npm run dev:clean" -DetectPattern "next dev" -LogFile (Join-Path $logDir "client-dev.log") -Port 3000

Write-Host ""
Write-Host "==> Waiting for server to boot..."
$serverReady = $false
for ($i = 1; $i -le 24; $i++) {
  Start-Sleep -Seconds 1
  try {
    $h = Invoke-WebRequest -Uri "http://localhost:5001/api/health" -UseBasicParsing -TimeoutSec 2
    if ($h.StatusCode -lt 500) { $serverReady = $true; break }
  } catch {}
  Write-Host "  [server] waiting... ($i/24s)"
}

Write-Host ""
Write-Host "==> Health checks"
if ($serverReady) {
  try {
    $health = Invoke-WebRequest -Uri "http://localhost:5001/api/health/conversion" -UseBasicParsing -TimeoutSec 5
    Write-Host "[server] $($health.StatusCode) /api/health/conversion"
    try {
      $healthJson = $health.Content | ConvertFrom-Json
      if ($healthJson.queue.mode -eq "redis_disabled") {
        Write-Host "[server] conversion queue mode: redis_disabled (expected when Docker/Redis is down)"
      } else {
        Write-Host "[server] conversion queue mode: $($healthJson.queue.mode)"
      }
      Write-Host "[server] converters: libreOffice=$($healthJson.converters.libreOffice), powerPoint=$($healthJson.converters.powerPoint)"
    } catch {}
  } catch {
    Write-Warning "[server] health check failed: $($_.Exception.Message)"
  }
} else {
  Write-Warning "[server] did not respond within 24s - check $logDir\server-dev.log"
}

Write-Host "[client] Next.js dev compile typically takes 10-30s after start."
Write-Host "         Watch $logDir\client-dev.log for 'Ready in' message."

Write-Host ""
Write-Host "Logs:"
Write-Host " - $logDir\worker.log"
Write-Host " - $logDir\server-dev.log"
Write-Host " - $logDir\client-dev.log"

Write-Host ""
Write-Host "==> Opening browser (client may still be compiling - refresh if blank)..."
try {
  Start-Process "http://localhost:3000" | Out-Null
  Write-Host "[browser] opened http://localhost:3000"
} catch {
  Write-Warning "[browser] could not open automatically: $($_.Exception.Message)"
}
