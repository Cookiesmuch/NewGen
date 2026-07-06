#!/usr/bin/env node
// Validates the true-filepath site structure:
//   1. every route in assets/nav.js has a real <route>/index.html on disk
//   2. every page is reachable through Server/server.js with HTTP 200
//   3. every deep-dive stub points at an existing content fragment
//   4. unknown routes return HTTP 404
//   5. launcher watchdog endpoints respond
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SERVER_ENTRY = path.join(ROOT, 'Server', 'server.js');
const BASE_URL = 'http://127.0.0.1:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

let failures = 0;
let passes = 0;

function log(level, color, message, details = '') {
  const suffix = details ? ` ${details}` : '';
  console.log(`${color}[${level}]${colors.reset} ${message}${suffix}`);
}

function info(message, details) { log('INFO', colors.cyan, message, details); }
function ok(message, details) { passes += 1; log('PASS', colors.green, message, details); }
function fail(message, details) { failures += 1; log('FAIL', colors.red, message, details); }

function extractNavRoutes() {
  const navSource = fs.readFileSync(path.join(ROOT, 'assets', 'nav.js'), 'utf8');
  const routeRegex = /path:\s*'(\/[^']*)'/g;
  const routes = new Set();
  let match;
  while ((match = routeRegex.exec(navSource)) !== null) {
    routes.add(match[1]);
  }
  return Array.from(routes);
}

function extractDeepdiveStubs() {
  const stubs = [];
  const eventideDir = path.join(ROOT, 'Intel', 'Eventide');
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.name === 'index.html') {
        const html = fs.readFileSync(absolute, 'utf8');
        const match = html.match(/window\.NG_DEEPDIVE_SRC\s*=\s*"([^"]+)"/);
        if (match) {
          stubs.push({ stub: absolute, contentRel: match[1] });
        }
      }
    }
  };
  walk(eventideDir);
  return stubs;
}

async function fetchStatus(url, options = {}) {
  const response = await fetch(url, { cache: 'no-store', redirect: 'follow', ...options });
  const body = await response.text();
  return { status: response.status, body };
}

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SERVER_ENTRY], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Server did not report readiness within 10s'));
      }
    }, 10000);
    child.stdout.on('data', (chunk) => {
      if (!settled && String(chunk).includes('accepting connections')) {
        settled = true;
        clearTimeout(timeout);
        resolve(child);
      }
    });
    child.on('exit', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`Server exited early with code ${code}`));
      }
    });
  });
}

async function main() {
  const navRoutes = extractNavRoutes();
  info('Routes discovered in assets/nav.js', `(total=${navRoutes.length})`);

  for (const route of navRoutes) {
    const indexPath = route === '/'
      ? path.join(ROOT, 'index.html')
      : path.join(ROOT, ...route.split('/').filter(Boolean), 'index.html');
    if (fs.existsSync(indexPath)) {
      ok('Route file exists', `(route=${route})`);
    } else {
      fail('Route file missing', `(route=${route}, expected=${path.relative(ROOT, indexPath)})`);
    }
  }

  const stubs = extractDeepdiveStubs();
  info('Deep-dive stubs discovered', `(total=${stubs.length})`);
  for (const { stub, contentRel } of stubs) {
    const contentAbs = path.resolve(path.dirname(stub), contentRel);
    if (fs.existsSync(contentAbs)) {
      ok('Deep-dive content exists', `(stub=${path.relative(ROOT, stub)})`);
    } else {
      fail('Deep-dive content missing', `(stub=${path.relative(ROOT, stub)}, content=${contentRel})`);
    }
  }

  info('Starting local server for HTTP checks');
  const server = await startServer();
  try {
    for (const route of navRoutes) {
      const url = route === '/' ? `${BASE_URL}/` : `${BASE_URL}${route}/`;
      const { status, body } = await fetchStatus(url);
      if (status === 200 && body.includes('<html')) {
        ok('Route serves page', `(route=${route}, status=${status})`);
      } else {
        fail('Route did not serve page', `(route=${route}, status=${status})`);
      }
    }

    const { status: redirectStatus } = await fetchStatus(`${BASE_URL}/Intel/Eventide`, { redirect: 'manual' });
    if (redirectStatus === 301) {
      ok('Extensionless directory URL redirects to trailing slash');
    } else {
      fail('Missing trailing-slash redirect', `(status=${redirectStatus})`);
    }

    const { status: notFoundStatus } = await fetchStatus(`${BASE_URL}/Nope/DoesNotExist/`);
    if (notFoundStatus === 404) {
      ok('Unknown route returns 404');
    } else {
      fail('Unknown route did not 404', `(status=${notFoundStatus})`);
    }

    // Agent-readiness surface: robots.txt, sitemap, agent-skills index.
    const { status: robotsStatus, body: robotsBody } = await fetchStatus(`${BASE_URL}/robots.txt`);
    if (robotsStatus === 200 && robotsBody.includes('Sitemap:') && robotsBody.includes('User-agent:')) {
      ok('robots.txt served with sitemap reference');
    } else {
      fail('robots.txt missing or incomplete', `(status=${robotsStatus})`);
    }

    const { status: sitemapStatus, body: sitemapBody } = await fetchStatus(`${BASE_URL}/sitemap.xml`);
    if (sitemapStatus === 200) {
      const staleRoutes = navRoutes.filter((route) => {
        const loc = route === '/' ? 'https://newgen.firev.xx.kg/' : `https://newgen.firev.xx.kg${route}/`;
        return !sitemapBody.includes(`<loc>${loc}</loc>`);
      });
      if (staleRoutes.length === 0) {
        ok('sitemap.xml lists every nav route');
      } else {
        fail('sitemap.xml is stale — rerun scripts/generate-sitemap.js', `(missing=${staleRoutes.slice(0, 3).join(', ')}…)`);
      }
    } else {
      fail('sitemap.xml missing', `(status=${sitemapStatus})`);
    }

    const { status: skillsStatus, body: skillsBody } = await fetchStatus(`${BASE_URL}/.well-known/agent-skills/index.json`);
    let skillsOk = false;
    if (skillsStatus === 200) {
      try {
        const parsed = JSON.parse(skillsBody);
        skillsOk = Array.isArray(parsed.skills) && parsed.skills.every((s) => s.name && s.url && s.sha256);
      } catch (error) { /* fall through to fail */ }
    }
    if (skillsOk) {
      ok('agent-skills index served and well-formed');
    } else {
      fail('agent-skills index missing or malformed', `(status=${skillsStatus})`);
    }

    const watchdogChecks = [
      { path: '/__launcher/status', expectedStatus: 200, label: 'status endpoint' },
      { path: '/__launcher/heartbeat', expectedStatus: 204, label: 'heartbeat endpoint', method: 'POST' },
      { path: '/__launcher/ping', expectedStatus: 204, label: 'ping endpoint' },
    ];
    for (const check of watchdogChecks) {
      const { status } = await fetchStatus(`${BASE_URL}${check.path}`, { method: check.method || 'GET' });
      if (status === check.expectedStatus) {
        ok(`Watchdog ${check.label} responded`, `(status=${status})`);
      } else {
        fail(`Watchdog ${check.label} unexpected status`, `(expected=${check.expectedStatus}, got=${status})`);
      }
    }
  } finally {
    server.kill('SIGTERM');
  }

  console.log('');
  console.log(`PASS: ${passes}  FAIL: ${failures}`);
  process.exitCode = failures > 0 ? 1 : 0;
}

main().catch((error) => {
  fail('Test run crashed', `(${error.message})`);
  process.exitCode = 1;
});
