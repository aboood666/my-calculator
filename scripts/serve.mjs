#!/usr/bin/env node
/**
 * Zero-dependency static file server for local development.
 * ES modules cannot load from `file://`, so the app needs an HTTP origin.
 *
 *   npm start            → http://localhost:5173
 *   PORT=8080 npm start  → custom port
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 5173;
const HOST = process.env.HOST || '127.0.0.1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function resolvePath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://${HOST}`).pathname);
  const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const absolute = path.normalize(path.join(ROOT, relative));
  // Never serve anything outside the project root.
  return absolute.startsWith(ROOT) ? absolute : null;
}

const server = http.createServer(async (request, response) => {
  const filePath = resolvePath(request.url ?? '/');
  if (!filePath) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Serving ${ROOT}\n→ http://${HOST}:${PORT}`);
});
