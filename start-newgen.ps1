#!/usr/bin/env pwsh

$port = 3000
$url = "http://localhost:$port"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$boxInnerWidth = 50
$maxWaitSeconds = 20
$serverProcess = $null
$existingServer = $false

Write-Host "`n╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                NewGen PS Launcher                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
Write-Host "[01/06] Workspace: $root" -ForegroundColor Gray
Write-Host "[02/06] Target   : $url" -ForegroundColor Gray

Write-Host "[03/06] Checking existing server..." -ForegroundColor Yellow
try {
  $probe = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
  if ($probe.StatusCode -ge 200 -and $probe.StatusCode -lt 400) {
    $existingServer = $true
    Write-Host "[ OK ] Existing NewGen instance detected." -ForegroundColor Green
  }
} catch {
  Write-Host "[ OK ] No existing server detected." -ForegroundColor Green
}

if (-not $existingServer) {
  Write-Host "[04/06] Starting Node.js server..." -ForegroundColor Yellow
  try {
    $serverProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $root -PassThru -ErrorAction Stop
  } catch {
    Write-Host "[ERR ] Failed to start Node.js server. Ensure Node.js is installed and available in PATH." -ForegroundColor Red
    exit 1
  }

  Write-Host "[05/06] Waiting for readiness (up to $maxWaitSeconds s)..." -ForegroundColor Yellow
  $ready = $false
  for ($i = 1; $i -le $maxWaitSeconds; $i++) {
    try {
      $probe = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
      if ($probe.StatusCode -ge 200 -and $probe.StatusCode -lt 400) {
        $ready = $true
        Write-Host "[ OK ] Server responded after $i second(s)." -ForegroundColor Green
        break
      }
    } catch {}
    Start-Sleep -Seconds 1
  }

  if (-not $ready) {
    Write-Host "[ERR ] Server did not become ready in time." -ForegroundColor Red
    if ($serverProcess) {
      Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    }
    exit 1
  }
} else {
  Write-Host "[04/06] Start skipped (already running)." -ForegroundColor DarkCyan
  Write-Host "[05/06] Readiness wait skipped." -ForegroundColor DarkCyan
}

Write-Host "[06/06] Opening browser..." -ForegroundColor Yellow
Start-Process $url

Write-Host "`n╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║ Status: Running                                   ║" -ForegroundColor Cyan
if ($existingServer) {
  Write-Host "║ Mode  : Attached to existing server               ║" -ForegroundColor Cyan
} else {
  Write-Host "║ Mode  : Started by launcher                       ║" -ForegroundColor Cyan
}
$urlLine = "URL   : $url"
$urlLine = ($urlLine + (" " * $boxInnerWidth)).Substring(0, $boxInnerWidth)
Write-Host "║ $urlLine ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Read-Host "Press Enter to close launcher"

if ($serverProcess) {
  Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
}
