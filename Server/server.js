#!/usr/bin/env node
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = path.resolve(__dirname, '..');
const URL = `http://localhost:${PORT}`;
const DEFAULT_ROUTE = '/Intel/Eventide';
const IS_CMD_LAUNCH = process.argv.includes('--from-bat');
const SHUTDOWN_TIMEOUT_MS = 2000;
const WATCHDOG_TIMEOUT_MS = 10000;
const WATCHDOG_POLL_INTERVAL_MS = 2000;
const WATCHDOG_SHUTDOWN_COUNTDOWN_S = 3;
const BOX_RULE = '+------------------------------------------------------------------+';
const BOX_INNER_WIDTH = BOX_RULE.length - 2;

let browserOpened = false;
let shuttingDown = false;
let launcherHeartbeatAt = Date.now();
let pendingShutdownTimer = null;
let pendingShutdownInterval = null;
let pendingShutdownReason = null;
let pendingShutdownStartedAt = 0;

function boxLine(content) {
  return `|${content.padEnd(BOX_INNER_WIDTH)}|`;
}

function centerText(content) {
  const text = content.length > BOX_INNER_WIDTH ? content.slice(0, BOX_INNER_WIDTH) : content;
  const totalPadding = BOX_INNER_WIDTH - text.length;
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;
  return `${' '.repeat(leftPadding)}${text}${' '.repeat(rightPadding)}`;
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
};

function serveFile(filePath, res, fallbackUrl) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`<h1>404 Not Found</h1><p>${fallbackUrl}</p>`);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>500 Server Error</h1>`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/__launcher/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ watchdog: IS_CMD_LAUNCH }));
    return;
  }

  if (req.url === '/__launcher/heartbeat') {
    const heartbeatAgeMs = Date.now() - launcherHeartbeatAt;
    launcherHeartbeatAt = Date.now();
    console.log(`[WATCHDOG] Heartbeat received (age=${heartbeatAgeMs}ms).`);
    // Cancel any pending close-triggered shutdown — a heartbeat means this was
    // a page navigation (e.g. address bar), not a true tab close.
    if (pendingShutdownTimer) {
      const elapsedMs = Date.now() - pendingShutdownStartedAt;
      console.log(`[WATCHDOG] Heartbeat cancelled pending "${pendingShutdownReason}" shutdown after ${elapsedMs}ms.`);
      clearTimeout(pendingShutdownTimer);
      pendingShutdownTimer = null;
      pendingShutdownReason = null;
      pendingShutdownStartedAt = 0;
    }
    if (pendingShutdownInterval) {
      clearInterval(pendingShutdownInterval);
      pendingShutdownInterval = null;
    }
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/__launcher/closed') {
    console.log('[WATCHDOG] Browser reported a close event. Starting graceful shutdown countdown.');
    res.writeHead(204);
    res.end();
    // Use a short grace period before shutting down. If a new heartbeat arrives
    // within 3 s the beforeunload fired during a page navigation, not a true close.
    if (!pendingShutdownTimer) {
      startWatchdogShutdownCountdown('BROWSER_CLOSED', WATCHDOG_SHUTDOWN_COUNTDOWN_S, true);
    }
    return;
  }

  if (req.url === '/__launcher/ping') {
    res.writeHead(204, { 'Cache-Control': 'no-store' });
    res.end();
    return;
  }

  // Strip query string
  const urlPath = req.url.split('?')[0];

  // If the request has no file extension it is a page route — serve the SPA shell
  const ext = path.extname(urlPath).toLowerCase();
  if (!ext) {
    serveFile(path.join(ROOT, 'Index.HTML'), res, req.url);
    return;
  }

  // Otherwise serve the static asset directly
  serveFile(path.join(ROOT, urlPath), res, req.url);
});

function printBanner() {
  console.log('');
  console.log(BOX_RULE);
  console.log(boxLine(centerText('NEWGEN SERVER')));
  console.log(BOX_RULE);
  console.log(`[1/5] Root directory : ${ROOT}`);
  console.log(`[2/5] Listen URL     : ${URL}`);
  console.log('[3/5] Boot sequence  : Initializing HTTP server...');
}

function printStatus(mode) {
  console.log('');
  console.log(BOX_RULE);
  console.log(boxLine(' STATUS: RUNNING                                                   '));
  console.log(boxLine(` Mode : ${mode}`));
  console.log(boxLine(` URL  : ${URL}${DEFAULT_ROUTE}`));
  console.log(boxLine(' NOTE : Close this window (or Ctrl+C) to stop the server.         '));
  console.log(BOX_RULE);
  console.log('');
}

function openBrowser() {
  if (browserOpened) return;
  browserOpened = true;

  const platform = process.platform;
  const command = platform === 'win32' ? 'cmd' : platform === 'darwin' ? 'open' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', `${URL}${DEFAULT_ROUTE}`] : [`${URL}${DEFAULT_ROUTE}`];

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.on('error', (error) => {
    console.error(`[WARN ] Browser auto-open failed: ${error.message}`);
  });
  child.unref();
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('');
  console.log(`[WATCHER] Received ${signal}. Shutting down NewGen server...`);
  server.close(() => {
    console.log('[WATCHER] Server stopped cleanly.');
    process.exit(0);
  });

  // Fallback to avoid hanging forever if close callback never fires.
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
}

function startWatchdogShutdownCountdown(signal, seconds, cancelableByHeartbeat) {
  if (shuttingDown || pendingShutdownTimer) return;

  let remainingSeconds = seconds;
  pendingShutdownReason = signal;
  pendingShutdownStartedAt = Date.now();
  console.log(`[WATCHDOG] ${signal}: shutdown countdown started (${seconds}s).`);
  console.log(`[WATCHDOG] ${remainingSeconds}s remaining...`);
  pendingShutdownInterval = setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds > 0) {
      console.log(`[WATCHDOG] ${remainingSeconds}s remaining...`);
      return;
    }
    clearInterval(pendingShutdownInterval);
    pendingShutdownInterval = null;
  }, 1000).unref();

  pendingShutdownTimer = setTimeout(() => {
    pendingShutdownTimer = null;
    pendingShutdownReason = null;
    pendingShutdownStartedAt = 0;
    if (pendingShutdownInterval) {
      clearInterval(pendingShutdownInterval);
      pendingShutdownInterval = null;
    }
    shutdown(signal);
  }, seconds * 1000);

  if (!cancelableByHeartbeat) {
    return;
  }
  console.log('[WATCHDOG] Waiting for heartbeat during countdown to cancel shutdown...');
}

function startLauncherWatchdog() {
  if (!IS_CMD_LAUNCH) {
    return;
  }

  setInterval(() => {
    const heartbeatAgeMs = Date.now() - launcherHeartbeatAt;
    if (heartbeatAgeMs > WATCHDOG_TIMEOUT_MS) {
      console.log('');
      console.log(`[WATCHDOG] Browser heartbeat timed out (age=${heartbeatAgeMs}ms, threshold=${WATCHDOG_TIMEOUT_MS}ms).`);
      startWatchdogShutdownCountdown('WATCHDOG_TIMEOUT', WATCHDOG_SHUTDOWN_COUNTDOWN_S, false);
    }
  }, WATCHDOG_POLL_INTERVAL_MS).unref();
}

printBanner();

server.listen(PORT, () => {
  console.log('[4/5] Readiness      : Server is accepting connections.');
  if (IS_CMD_LAUNCH) {
    console.log('[5/5] Browser action : Opening default browser...');
    openBrowser();
    startLauncherWatchdog();
    console.log('[ OK ] Browser launch command submitted.');
    printStatus('Launched from start-newgen.bat');
  } else {
    console.log('[5/5] Browser action : Skipped (manual node invocation).');
    printStatus('Manual node Server/server.js');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error('[ERROR] Port conflict detected.');
    console.error(`[ERROR] Port ${PORT} is already in use.`);
    if (IS_CMD_LAUNCH) {
      console.error('[INFO ] Existing server likely already running; opening browser only...');
      openBrowser();
      process.exit(0);
    }
    console.error('[HINT ] Stop the existing process or use a different port.');
    process.exit(1);
  } else {
    throw err;
  }
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
