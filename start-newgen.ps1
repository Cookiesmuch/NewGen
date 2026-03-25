#!/usr/bin/env pwsh
# NewGen Server Launcher
# Starts server, opens browser, and cleanly shuts down when done

$port = 3000
$url = "http://localhost:$port"

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  NewGen Server Launcher                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Starting Node.js server on port $port..." -ForegroundColor Green

# Start Node server as a background job
$serverJob = Start-Job -ScriptBlock { node server.js } -ErrorAction Stop

# Wait for server to be ready
Start-Sleep -Seconds 2

# Check if server job is still running
if ($serverJob.State -eq "Failed") {
  Write-Host "Failed to start server!" -ForegroundColor Red
  Receive-Job -Job $serverJob
  exit 1
}

Write-Host "Server started (Job ID: $($serverJob.Id))" -ForegroundColor Green
Write-Host "Opening browser at $url..." -ForegroundColor Green

# Open browser
Start-Process $url

Write-Host "`n✓ NewGen is running!" -ForegroundColor Green
Write-Host "  Browser: $url" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop`n" -ForegroundColor Yellow

# Wait for server job to complete or user interruption
try {
  Wait-Job -Job $serverJob -ErrorAction Stop
} catch {
  # Ctrl+C or other interruption
}

Write-Host "`nShutting down..." -ForegroundColor Yellow

# Kill the server job
Stop-Job -Job $serverJob -ErrorAction SilentlyContinue
Remove-Job -Job $serverJob -ErrorAction SilentlyContinue

# Try to close ANY remaining node processes (in case of orphans)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Server stopped. Goodbye!`n" -ForegroundColor Green
