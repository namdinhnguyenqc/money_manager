const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const cacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const resolveEnvDistDir = () => {
  if (!process.env.DIST_DIR) return null;
  return path.isAbsolute(process.env.DIST_DIR)
    ? process.env.DIST_DIR
    : path.join(rootDir, process.env.DIST_DIR);
};

const getIndexPath = (dirPath) => path.join(dirPath, 'index.html');

const getDirScore = (dirPath) => {
  const indexPath = getIndexPath(dirPath);
  if (!fs.existsSync(indexPath)) return -1;
  return fs.statSync(indexPath).mtimeMs;
};

const resolveDistDir = () => {
  const candidates = [
    resolveEnvDistDir(),
    path.join(rootDir, 'dist-local-web'),
    path.join(rootDir, 'dist-review-web'),
  ].filter(Boolean);

  const ranked = candidates
    .map((dirPath) => ({ dirPath, score: getDirScore(dirPath) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.dirPath || null;
};

const distDir = resolveDistDir();

const sendFile = (res, filePath) => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, {
        'Content-Type': 'text/plain; charset=utf-8',
        ...cacheHeaders,
      });
      res.end('500 Internal Server Error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      ...cacheHeaders,
    });
    res.end(data);
  });
};

if (!distDir) {
  console.error('[serve:web:local] Missing local web build folder.');
  console.error('[serve:web:local] Run one of these first:');
  console.error('[serve:web:local] npm run build:web:local');
  console.error('[serve:web:local] npm run build:web:review');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  let fullPath = path.join(distDir, safePath);

  if (fullPath.endsWith(path.sep)) {
    fullPath = path.join(fullPath, 'index.html');
  }

  fs.stat(fullPath, (err, stat) => {
    if (!err && stat.isFile()) {
      sendFile(res, fullPath);
      return;
    }

    const fallback = path.join(distDir, 'index.html');
    fs.stat(fallback, (fallbackErr, fallbackStat) => {
      if (!fallbackErr && fallbackStat.isFile()) {
        sendFile(res, fallback);
        return;
      }
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
        ...cacheHeaders,
      });
      res.end('404 Not Found');
    });
  });
});

server.listen(port, host, () => {
  console.log(`[serve:web:local] Serving: ${distDir}`);
  console.log(`[serve:web:local] URL: http://${host}:${port}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[serve:web:local] Port ${port} is in use. Try another port:`);
    console.error(`[serve:web:local] PowerShell: $env:PORT=4180; npm run serve:web:local`);
    process.exit(1);
  }
  console.error('[serve:web:local] Server error:', err);
  process.exit(1);
});
