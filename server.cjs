const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const DIST_DIR = path.join(__dirname, 'dist');
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'foodiehub-state.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 20;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
};

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const normaliseState = (candidate) => Object.fromEntries(Object.entries(candidate ?? {}).map(([key, entry]) => [key, {
  value: entry?.value,
  updatedAt: Number(entry?.updatedAt) || 0,
  version: Number(entry?.version) || 1,
}]));

const readStateFile = (filePath) => normaliseState(JSON.parse(fs.readFileSync(filePath, 'utf8')));

const backupFiles = () => fs.readdirSync(BACKUP_DIR)
  .filter((fileName) => /^foodiehub-state-\d+\.json$/.test(fileName))
  .sort((left, right) => right.localeCompare(left));

let state = {};
try {
  state = readStateFile(STATE_FILE);
} catch (error) {
  const recoveryFile = backupFiles().find((fileName) => {
    try {
      readStateFile(path.join(BACKUP_DIR, fileName));
      return true;
    } catch {
      return false;
    }
  });
  if (recoveryFile) {
    state = readStateFile(path.join(BACKUP_DIR, recoveryFile));
    console.warn(`Recovered state from backup ${recoveryFile}.`);
  } else {
    console.warn(`No valid state file or backup found; starting with empty state. ${error.message}`);
  }
}

let lastBackupTime = 0;
const saveState = () => {
  const temporaryFile = `${STATE_FILE}.tmp`;
  const now = Date.now();
  if (fs.existsSync(STATE_FILE) && (now - lastBackupTime > 60000)) {
    try {
      const backupFile = path.join(BACKUP_DIR, `foodiehub-state-${now}.json`);
      fs.copyFileSync(STATE_FILE, backupFile);
      lastBackupTime = now;
      const staleBackups = backupFiles().slice(MAX_BACKUPS);
      staleBackups.forEach((fileName) => fs.rmSync(path.join(BACKUP_DIR, fileName), { force: true }));
    } catch (e) {
      console.warn('Backup creation failed:', e.message);
    }
  }

  const jsonContent = JSON.stringify(state, null, 2);
  try {
    fs.writeFileSync(temporaryFile, jsonContent, 'utf8');
    try {
      fs.renameSync(temporaryFile, STATE_FILE);
    } catch (renameErr) {
      // Fallback for Windows locking issues
      fs.copyFileSync(temporaryFile, STATE_FILE);
      try { fs.unlinkSync(temporaryFile); } catch {}
    }
  } catch (err) {
    // Direct write fallback
    fs.writeFileSync(STATE_FILE, jsonContent, 'utf8');
  }
};

const sendJson = (response, status, payload) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
};

const readBody = (request) => new Promise((resolve, reject) => {
  let body = '';
  let rejected = false;
  request.on('data', (chunk) => {
    if (rejected) return;
    body += chunk;
    if (body.length > 10 * 1024 * 1024) {
      rejected = true;
      reject(new Error('Payload too large'));
      request.resume();
    }
  });
  request.on('end', () => {
    if (!rejected) resolve(body);
  });
  request.on('error', reject);
});

const serveStatic = (request, response, pathname) => {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const candidate = path.resolve(DIST_DIR, `.${requested}`);
  const distRoot = path.resolve(DIST_DIR);
  const safePath = candidate === distRoot || candidate.startsWith(`${distRoot}${path.sep}`) ? candidate : path.join(DIST_DIR, 'index.html');
  fs.readFile(safePath, (error, content) => {
    if (!error) {
      const ext = path.extname(safePath);
      const headers = { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' };
      if (ext === '.html' || safePath.endsWith('sw.js') || safePath.endsWith('manifest.webmanifest')) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      }
      response.writeHead(200, headers);
      response.end(content);
      return;
    }
    fs.readFile(path.join(DIST_DIR, 'index.html'), (fallbackError, fallback) => {
      if (fallbackError) {
        response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Run npm run build before starting FoodieHub.');
        return;
      }
      response.writeHead(200, { 
        'Content-Type': MIME_TYPES['.html'],
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
      response.end(fallback);
    });
  });
};

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const match = requestUrl.pathname.match(/^\/api\/state\/(.+)$/);
  if (match) {
    let key;
    try {
      key = decodeURIComponent(match[1]);
    } catch {
      sendJson(response, 400, { error: 'Invalid state key encoding' });
      return;
    }
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(key)) {
      sendJson(response, 400, { error: 'Invalid state key' });
      return;
    }
    if (request.method === 'GET') {
      const entry = state[key];
      sendJson(response, 200, entry ? entry : { value: null, updatedAt: 0, version: 0 });
      return;
    }
    if (request.method === 'POST') {
      try {
        const payload = JSON.parse(await readBody(request));
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          sendJson(response, 400, { error: 'Request body must be an object' });
          return;
        }
        if (!Object.prototype.hasOwnProperty.call(payload, 'value')) {
          sendJson(response, 400, { error: 'Missing value' });
          return;
        }
        if (!Object.prototype.hasOwnProperty.call(payload, 'expectedVersion') || !Number.isInteger(Number(payload.expectedVersion)) || Number(payload.expectedVersion) < 0) {
          sendJson(response, 400, { error: 'expectedVersion is required and must be a non-negative integer' });
          return;
        }
        const currentEntry = state[key];
        const currentVersion = currentEntry?.version ?? 0;
        if (Number(payload.expectedVersion) !== currentVersion) {
          sendJson(response, 409, { error: 'State conflict', key, current: currentEntry ?? { value: null, updatedAt: 0, version: 0 } });
          return;
        }
        const updatedAt = Date.now();
        const nextEntry = { value: payload.value, updatedAt, version: currentVersion + 1 };
        state[key] = nextEntry;
        try {
          saveState();
        } catch (error) {
          if (currentEntry) state[key] = currentEntry;
          else delete state[key];
          throw error;
        }
        sendJson(response, 200, { ok: true, updatedAt, version: nextEntry.version });
      } catch {
        sendJson(response, 400, { error: 'Invalid JSON or payload too large' });
      }
      return;
    }
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }
  if (request.method !== 'GET') {
    response.writeHead(405);
    response.end();
    return;
  }
  serveStatic(request, response, requestUrl.pathname);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use by another application or an existing FoodieHub instance.`);
    console.error(`👉 Solution: Close any terminal running FoodieHub or kill the process using port ${PORT}.\n`);
  } else {
    console.error('\n❌ Server error:', err.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('\n======================================================');
  console.log(`🍽️  FoodieHub POS Server running on port ${PORT}`);
  console.log('======================================================');
  console.log(`💻 Main Cashier PC : http://localhost:${PORT}`);

  const interfaces = os.networkInterfaces();
  let foundLan = false;
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`📱 Wi-Fi / LAN (${name}): http://${net.address}:${PORT}`);
        foundLan = true;
      }
    }
  }
  if (!foundLan) {
    console.log(`📱 Connect devices on the same Wi-Fi using this PC's IP address:${PORT}`);
  }
  console.log('======================================================\n');
});
