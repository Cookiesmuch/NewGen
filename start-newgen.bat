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
set "SERVER_ALREADY_RUNNING="

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
  set "SERVER_ALREADY_RUNNING=1"
  echo [INFO ] Existing NewGen instance detected on %URL%.
  echo [INFO ] Server startup will be skipped.
) else (
  echo [ OK  ] No active server was detected on port %PORT%.
)
echo.

if not defined SERVER_ALREADY_RUNNING (
  echo [06/08] Launching NewGen server process...
  pushd "%ROOT%"
  start "NewGen Server" /B node server.js
  popd
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
    echo [HINT ] Check this terminal for server errors and retry.
    echo.
    pause
    exit /b 1
  )
  echo [ OK  ] NewGen responded after !READY_AT! second(s).
) else (
  echo [06/08] Startup skipped (existing server in use).
  echo [07/08] Readiness check skipped (existing server already responded).
)
echo.

echo [08/08] Opening browser at %URL%...
call :open_browser_session
echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
call :boxline "SESSION STATUS: RUNNING"
echo ╠══════════════════════════════════════════════════════════════════════╣
call :boxline "Browser opened successfully."
if defined BROWSER_PID (
  call :boxline "Browser PID tracked : !BROWSER_PID!"
  call :boxline "Closing CMD will close this browser window."
  call :boxline "Closing this browser window will close CMD."
) else (
  call :boxline "Browser process tracking unavailable."
  call :boxline "Bidirectional close sync unavailable for this browser."
)
if defined SERVER_ALREADY_RUNNING (
  call :boxline "Server mode: Attached to existing server."
) else (
  call :boxline "Server mode: Started by this launcher."
)
call :boxline "Health check status : READY"
call :boxline "Runtime engine      : Node.js"
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

for /f %%P in ('powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \"ProcessId=$PID\").ParentProcessId"') do (
  set "LAUNCHER_PID=%%P"
)

if defined LAUNCHER_PID (
  start "" powershell -NoProfile -WindowStyle Hidden -Command "$launcherPid=%LAUNCHER_PID%; $browserPid=%BROWSER_PID%; $maxSeconds=%WATCHDOG_MAX_SECONDS%; $elapsed=0; while ($elapsed -lt $maxSeconds) { $launcherAlive = Get-Process -Id $launcherPid -ErrorAction SilentlyContinue; $browserAlive = Get-Process -Id $browserPid -ErrorAction SilentlyContinue; if (-not $launcherAlive) { Stop-Process -Id $browserPid -Force -ErrorAction SilentlyContinue; break }; if (-not $browserAlive) { Stop-Process -Id $launcherPid -Force -ErrorAction SilentlyContinue; break }; Start-Sleep -Milliseconds 500; $elapsed += 0.5 }" >nul 2>nul
)
exit /b 0
