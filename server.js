#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

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

server.listen(PORT, () => {
  console.log(`\n╔═══════════════════════════════════════════╗`);
  console.log(`║  NewGen Server Ready                      ║`);
  console.log(`║  Open: http://localhost:${PORT}            ║`);
  console.log(`║  Press Ctrl+C to stop                     ║`);
  console.log(`╚═══════════════════════════════════════════╝\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   Run at a different port: PORT=3001 node server.js\n`);
    process.exit(1);
  } else {
    throw err;
  }
});
