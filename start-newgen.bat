@echo off
setlocal EnableExtensions EnableDelayedExpansion
title NewGen Launcher
color 0B
cls

set "PORT=3000"
set "URL=http://localhost:%PORT%"
set "ROOT=%~dp0"
set "MAX_WAIT_SECONDS=20"
set "WATCHDOG_MAX_SECONDS=43200"
set "BROWSER_PID="
set "LAUNCHER_PID="

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║                         NEWGEN CMD LAUNCHER                         ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.
echo [01/08] Workspace   : %ROOT%
echo [02/08] Target URL  : %URL%
echo [03/08] Port        : %PORT%
echo.

echo [04/08] Verifying Node.js runtime...
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo [HINT ] Install Node.js and re-run this launcher.
  echo.
  pause
  exit /b 1
)
echo [ OK  ] Node.js runtime detected.
echo.

echo [05/08] Checking whether NewGen is already running...
call :probe_server
if not errorlevel 1 (
  echo [INFO ] Existing NewGen instance detected on %URL%.
  echo [INFO ] Skipping server start and opening browser directly...
  call :open_browser_session
  echo.
  echo ╔══════════════════════════════════════════════════════════════════════╗
  call :boxline "SESSION STATUS: ATTACHED TO EXISTING SERVER"
  echo ╠══════════════════════════════════════════════════════════════════════╣
  call :boxline "Browser opened successfully."
  if defined BROWSER_PID (
    call :boxline "Browser PID tracked : !BROWSER_PID!"
    call :boxline "Bidirectional close link active (CMD <-> Browser)."
  ) else (
    call :boxline "Browser process tracking unavailable."
    call :boxline "Auto-close on CMD exit is not supported for this browser."
  )
  call :boxline "Existing server process retained."
  echo ╚══════════════════════════════════════════════════════════════════════╝
  echo.
  pause
  exit /b 0
)
echo [ OK  ] No active server was detected on port %PORT%.
echo.

echo [06/08] Launching NewGen server process...
start "NewGen Server" /B cmd /c "cd /d \"%ROOT%\" && node server.js"
echo [ OK  ] Launch command submitted.
echo.

echo [07/08] Waiting for server readiness (up to %MAX_WAIT_SECONDS%s)...
set "READY="
for /L %%I in (1,1,%MAX_WAIT_SECONDS%) do (
  call :probe_server
  if not errorlevel 1 (
    set "READY=1"
    set "READY_AT=%%I"
    goto :SERVER_READY
  )
  <nul set /p "=."
  timeout /t 1 /nobreak >nul
)

:SERVER_READY
echo.
if not defined READY (
  echo [WARN ] NewGen did not respond within %MAX_WAIT_SECONDS% seconds.
  echo [HINT ] Check the server output in this window for error details.
  echo.
  pause
  exit /b 1
)

echo [ OK  ] NewGen responded after !READY_AT! second(s).
echo [08/08] Opening browser at %URL%...
call :open_browser_session
echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
call :boxline "SESSION STATUS: RUNNING"
echo ╠══════════════════════════════════════════════════════════════════════╣
call :boxline "Browser opened successfully."
if defined BROWSER_PID (
  call :boxline "Browser PID tracked : !BROWSER_PID!"
  call :boxline "Bidirectional close link active (CMD <-> Browser)."
) else (
  call :boxline "Browser process tracking unavailable."
  call :boxline "Auto-close on CMD exit is not supported for this browser."
)
call :boxline "Health check status : READY"
call :boxline "Runtime engine      : Node.js"
call :boxline "Tip: Close this launcher window to end the session."
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.
pause
exit /b 0

:boxline
set "BOX_TEXT=%~1"
set "BOX_LINE=%BOX_TEXT%                                                                    "
set "BOX_LINE=!BOX_LINE:~0,68!"
echo ║ !BOX_LINE! ║
exit /b 0

:probe_server
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
exit /b %errorlevel%

:open_browser_session
set "BROWSER_PID="
for /f %%P in ('powershell -NoProfile -Command "$url='%URL%'; $edge=Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'; $chrome=Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'; if (Test-Path $edge) { $p=Start-Process -FilePath $edge -ArgumentList '--new-window', $url -PassThru; $p.Id; exit 0 }; if (Test-Path $chrome) { $p=Start-Process -FilePath $chrome -ArgumentList '--new-window', $url -PassThru; $p.Id; exit 0 }; exit 1"') do (
  set "BROWSER_PID=%%P"
)

if not defined BROWSER_PID (
  start "" "%URL%"
  exit /b 0
)

for /f %%P in ('powershell -NoProfile -Command "$pp=(Get-CimInstance Win32_Process -Filter \"ProcessId=$PID\").ParentProcessId; Write-Output $pp"') do (
  set "LAUNCHER_PID=%%P"
)

if defined LAUNCHER_PID (
  start "" powershell -NoProfile -WindowStyle Hidden -Command "$launcherPid=%LAUNCHER_PID%; $browserPid=%BROWSER_PID%; $maxSeconds=%WATCHDOG_MAX_SECONDS%; $elapsed=0; while ($elapsed -lt $maxSeconds) { $launcherAlive = Get-Process -Id $launcherPid -ErrorAction SilentlyContinue; $browserAlive = Get-Process -Id $browserPid -ErrorAction SilentlyContinue; if (-not $launcherAlive) { Stop-Process -Id $browserPid -Force -ErrorAction SilentlyContinue; break }; if (-not $browserAlive) { Stop-Process -Id $launcherPid -Force -ErrorAction SilentlyContinue; break }; Start-Sleep -Milliseconds 500; $elapsed += 0.5 }; if ($elapsed -ge $maxSeconds) { Stop-Process -Id $browserPid -Force -ErrorAction SilentlyContinue }" >nul 2>nul
)
exit /b 0
