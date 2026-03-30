#!/usr/bin/env node
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;
const URL = `http://localhost:${PORT}`;
const IS_CMD_LAUNCH = process.argv.includes('--from-bat');

let browserOpened = false;
let shuttingDown = false;

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
  // Strip query string
  const urlPath = req.url.split('?')[0];

  // If the request has no file extension it is a page route — serve the SPA shell
  const ext = path.extname(urlPath).toLowerCase();
  if (!ext) {
    serveFile(path.join(ROOT, 'NewGen.html'), res, req.url);
    return;
  }

  // Otherwise serve the static asset directly
  serveFile(path.join(ROOT, urlPath), res, req.url);
});

function printBanner() {
  console.log('');
  console.log('+------------------------------------------------------------------+');
  console.log('|                           NEWGEN SERVER                           |');
  console.log('+------------------------------------------------------------------+');
  console.log(`[1/5] Root directory : ${ROOT}`);
  console.log(`[2/5] Listen URL     : ${URL}`);
  console.log('[3/5] Boot sequence  : Initializing HTTP server...');
}

function printStatus(mode) {
  console.log('');
  console.log('+------------------------------------------------------------------+');
  console.log('| STATUS: RUNNING                                                   |');
  console.log(`| Mode : ${mode.padEnd(57)}|`);
  console.log(`| URL  : ${URL.padEnd(57)}|`);
  console.log('| NOTE : Close this window (or Ctrl+C) to stop the server.         |');
  console.log('+------------------------------------------------------------------+');
  console.log('');
}

function openBrowser() {
  if (browserOpened) return;
  browserOpened = true;

  const platform = process.platform;
  const command = platform === 'win32' ? 'cmd' : platform === 'darwin' ? 'open' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', URL] : [URL];

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

  setTimeout(() => process.exit(0), 2000).unref();
}

printBanner();

server.listen(PORT, () => {
  console.log('[4/5] Readiness      : Server is accepting connections.');
  if (IS_CMD_LAUNCH) {
    console.log('[5/5] Browser action : Opening default browser...');
    openBrowser();
    console.log('[ OK ] Browser launch command submitted.');
    printStatus('Launched from start-newgen.bat');
  } else {
    console.log('[5/5] Browser action : Skipped (manual node invocation).');
    printStatus('Manual node server.js');
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
