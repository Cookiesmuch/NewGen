#!/usr/bin/env node
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
  gray: '\x1b[90m',
};

function now() {
  return new Date().toISOString();
}

function log(level, color, message, details = '') {
  const suffix = details ? ` ${details}` : '';
  console.log(`${color}[${level}]${colors.reset} ${now()} ${message}${suffix}`);
}

function info(message, details) {
  log('INFO', colors.cyan, message, details);
}

function ok(message, details) {
  log('PASS', colors.green, message, details);
}

function warn(message, details) {
  log('WARN', colors.yellow, message, details);
}

function fail(message, details) {
  log('FAIL', colors.red, message, details);
}

function relativePath(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function extractPageRoutes(indexHtmlPath) {
  const source = fs.readFileSync(indexHtmlPath, 'utf8');
  const routeRegex = /\{\s*path:\s*'([^']+)'\s*,\s*src:\s*'([^']+)'\s*\}/g;
  const routes = [];
  let match;
  while ((match = routeRegex.exec(source)) !== null) {
    routes.push({ path: match[1], src: match[2] });
  }

  const navRegex = /data-path="([^"]+)"/g;
  const navRoutes = [];
  while ((match = navRegex.exec(source)) !== null) {
    navRoutes.push(match[1]);
  }

  return { routes, navRoutes: Array.from(new Set(navRoutes)) };
}

function parseDeepDiveMappings(viewerPath) {
  const source = fs.readFileSync(viewerPath, 'utf8');
  const mappingRegex = /'([^']+)'\s*:\s*'([^']+\.html)'/g;
  const mappings = [];
  let match;
  while ((match = mappingRegex.exec(source)) !== null) {
    mappings.push({ route: match[1], target: match[2] });
  }
  return mappings;
}

async function fetchWithDiagnostics(url, options = {}) {
  const start = Date.now();
  try {
    const response = await fetch(url, { cache: 'no-store', ...options });
    const duration = Date.now() - start;
    const body = await response.text();
    return { response, body, duration };
  } catch (error) {
    const duration = Date.now() - start;
    const method = options.method || 'GET';
    throw new Error(`Fetch failed (${method} ${url}) after ${duration}ms: ${error.message}`);
  }
}

function startServer() {
  return spawn(process.execPath, [SERVER_ENTRY], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
}

function responseLooksLikeMissingContent(body) {
  return /<h1>\s*404 Not Found\s*<\/h1>/i.test(body);
}

async function waitForServerReady(serverProcess, timeoutMs = 20000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let finished = false;

    const done = (err) => {
      if (finished) return;
      finished = true;
      clearInterval(poll);
      clearTimeout(timeout);
      if (err) {
        reject(new Error(`${err.message}\n--- STDOUT ---\n${stdout}\n--- STDERR ---\n${stderr}`));
      } else {
        resolve({ startupMs: Date.now() - startedAt, stdout, stderr });
      }
    };

    serverProcess.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(`${colors.gray}[server]${colors.reset} ${text}`);
    });

    serverProcess.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(`${colors.gray}[server-err]${colors.reset} ${text}`);
    });

    serverProcess.on('exit', (code, signal) => {
      done(new Error(`Server exited before readiness (code=${code}, signal=${signal})`));
    });

    const poll = setInterval(async () => {
      try {
        const response = await fetch(`${BASE_URL}/__launcher/ping`, { cache: 'no-store' });
        if (response.status === 204 || response.ok) {
          done();
        }
      } catch {
        // wait until server is ready
      }
    }, 250);

    const timeout = setTimeout(() => {
      done(new Error(`Timed out waiting for server to become ready after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

async function shutdownServer(serverProcess) {
  if (!serverProcess || serverProcess.killed) return;
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      serverProcess.kill('SIGKILL');
      resolve();
    }, 3000);

    serverProcess.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });

    serverProcess.kill('SIGTERM');
  });
}

async function main() {
  info('Starting NewGen debug test', `(root=${ROOT})`);
  if (!fs.existsSync(SERVER_ENTRY)) {
    throw new Error(`Missing server entry: ${SERVER_ENTRY}`);
  }

  const indexPath = path.join(ROOT, 'Index.HTML');
  const deepDiveViewerPath = path.join(ROOT, 'Source', 'INTEL', 'Eventide', 'eventide.deepdive.viewer.html');

  const { routes, navRoutes } = extractPageRoutes(indexPath);
  const deepDiveMappings = parseDeepDiveMappings(deepDiveViewerPath);

  info('Discovered routes from Index.HTML', `(total=${routes.length}, nav=${navRoutes.length})`);
  info('Discovered deep-dive mappings', `(total=${deepDiveMappings.length})`);

  const serverProcess = startServer();

  let failures = 0;
  let warnings = 0;

  try {
    const ready = await waitForServerReady(serverProcess);
    ok('Server reached readiness', `(startup=${ready.startupMs}ms)`);

    info('Checking watchdog endpoints from server.js');
    const watchdogChecks = [
      { path: '/__launcher/status', expectedStatus: 200, label: 'status endpoint' },
      { path: '/__launcher/heartbeat', expectedStatus: 204, label: 'heartbeat endpoint', method: 'POST' },
      { path: '/__launcher/ping', expectedStatus: 204, label: 'ping endpoint' },
      { path: '/__launcher/closed', expectedStatus: 204, label: 'closed endpoint', method: 'POST' },
    ];

    for (const check of watchdogChecks) {
      const { response, body, duration } = await fetchWithDiagnostics(`${BASE_URL}${check.path}`, {
        method: check.method || 'GET',
      });

      if (response.status === check.expectedStatus) {
        ok(`Watchdog ${check.label} responded`, `(status=${response.status}, duration=${duration}ms)`);
      } else {
        failures += 1;
        fail(`Watchdog ${check.label} unexpected status`, `(expected=${check.expectedStatus}, got=${response.status}, duration=${duration}ms, body=${JSON.stringify(body.slice(0, 240))})`);
      }
    }

    info('Checking route navigability and content loading');
    const loadedRoutes = [];
    const missingRoutes = [];

    for (const route of routes) {
      const { response, body, duration } = await fetchWithDiagnostics(`${BASE_URL}${route.path}`);
      const hasShell = body.includes('NewGen Dynamic Loader') && body.includes('const PAGES = [');

      if (response.ok && hasShell) {
        loadedRoutes.push(route.path);
        ok('Route navigable', `(path=${route.path}, src=${route.src}, status=${response.status}, duration=${duration}ms, shell=yes)`);
      } else {
        failures += 1;
        missingRoutes.push(route.path);
        fail('Route failed shell load', `(path=${route.path}, status=${response.status}, duration=${duration}ms, shell=${hasShell ? 'yes' : 'no'})`);
      }

      const { response: sourceResponse, body: sourceBody, duration: sourceDuration } = await fetchWithDiagnostics(`${BASE_URL}${route.src}`);
      const sourceLooksLikeContent = sourceBody.trim().length > 0 && !responseLooksLikeMissingContent(sourceBody);

      if (sourceResponse.ok && sourceLooksLikeContent) {
        ok('Source page loaded', `(src=${route.src}, status=${sourceResponse.status}, duration=${sourceDuration}ms, size=${sourceBody.length})`);
      } else {
        failures += 1;
        fail('Source page failed to load', `(src=${route.src}, status=${sourceResponse.status}, duration=${sourceDuration}ms, bytes=${sourceBody.length})`);
      }
    }

    info('Checking deep-dive targets used by viewer mapping');
    const deepDiveTargetFailures = [];

    for (const mapping of deepDiveMappings) {
      const absoluteTarget = path.join(path.dirname(deepDiveViewerPath), mapping.target);
      if (!fs.existsSync(absoluteTarget)) {
        failures += 1;
        deepDiveTargetFailures.push(mapping);
        fail('Deep-dive mapping target missing', `(route=${mapping.route}, target=${mapping.target})`);
        continue;
      }

      const relativeTarget = `/${relativePath(absoluteTarget)}`;
      const { response, body, duration } = await fetchWithDiagnostics(`${BASE_URL}${relativeTarget}`);
      const looksLikeContent = body.trim().length > 0 && !responseLooksLikeMissingContent(body);
      if (response.ok && looksLikeContent) {
        ok('Deep-dive target reachable', `(route=${mapping.route}, target=${relativeTarget}, status=${response.status}, duration=${duration}ms)`);
      } else {
        failures += 1;
        fail('Deep-dive target unreachable', `(route=${mapping.route}, target=${relativeTarget}, status=${response.status}, duration=${duration}ms, bytes=${body.length})`);
      }
    }

    info('Scanning for potentially orphaned brochure/deep-dive html files');

    const allHtmlFiles = [];
    function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const absolute = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          walk(absolute);
        } else if (entry.isFile() && /\.html$/i.test(entry.name)) {
          allHtmlFiles.push(absolute);
        }
      }
    }
    walk(ROOT);

    const explicitlyReferenced = new Set([
      relativePath(indexPath),
      ...routes.map((r) => r.src.replace(/^\//, '')),
      ...deepDiveMappings.map((m) => relativePath(path.join(path.dirname(deepDiveViewerPath), m.target))),
    ]);

    const orphanCandidates = allHtmlFiles
      .map((absPath) => relativePath(absPath))
      .filter((relPath) => relPath !== 'Index.HTML' && !explicitlyReferenced.has(relPath))
      .sort();

    if (orphanCandidates.length === 0) {
      ok('No potential orphaned HTML files found');
    } else {
      warnings += orphanCandidates.length;
      warn('Potential orphaned HTML files detected', `(count=${orphanCandidates.length})`);
      for (const candidate of orphanCandidates) {
        warn('Orphan candidate', `(file=${candidate})`);
      }
    }

    console.log('');
    console.log('================ DEBUG SUMMARY ================');
    console.log(`Routes declared in Index.HTML : ${routes.length}`);
    console.log(`Top-nav routes discovered     : ${navRoutes.length}`);
    console.log(`Routes loaded successfully    : ${loadedRoutes.length}`);
    console.log(`Routes with failures          : ${missingRoutes.length}`);
    console.log(`Deep-dive mappings            : ${deepDiveMappings.length}`);
    console.log(`Potential orphan candidates   : ${orphanCandidates.length}`);
    console.log(`Warnings                      : ${warnings}`);
    console.log(`Failures                      : ${failures}`);
    console.log('==============================================');

    if (failures > 0) {
      process.exitCode = 1;
    }
  } finally {
    await shutdownServer(serverProcess);
  }
}

main().catch((error) => {
  fail('Debug test crashed', error.stack || error.message);
  process.exit(1);
});
