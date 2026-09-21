#!/usr/bin/env node
/**
 * Development server: builds once, serves dist/, watches the sources and
 * rebuilds on change. Connected browsers reload over Server-Sent Events.
 * No dependencies — node:http and node:fs only.
 *
 *   node scripts/dev.mjs [--port 4173] [--host 127.0.0.1]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const DIST = join(ROOT, 'dist');

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const PORT = Number(flag('port', process.env.PORT || 4173));
const HOST = flag('host', process.env.HOST || '127.0.0.1');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const clients = new Set();
let building = false;
let queued = false;

function runBuild() {
  if (building) { queued = true; return; }
  building = true;
  const child = spawn(process.execPath, [join(here, 'build.mjs')], { stdio: 'inherit' });
  child.on('exit', (code) => {
    building = false;
    if (code === 0) {
      for (const res of clients) res.write('event: reload\ndata: 1\n\n');
    }
    if (queued) { queued = false; runBuild(); }
  });
}

const LIVE_RELOAD = `<script>
(() => {
  const es = new EventSource('/__dev');
  es.addEventListener('reload', () => location.reload());
  es.onerror = () => setTimeout(() => location.reload(), 1500);
})();
</script>`;

async function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const candidates = clean.endsWith('/')
    ? [join(DIST, clean, 'index.html')]
    : [join(DIST, clean), join(DIST, clean, 'index.html'), join(DIST, `${clean}.html`)];
  for (const candidate of candidates) {
    if (!candidate.startsWith(DIST)) continue;
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch { /* next */ }
  }
  return null;
}

const server = createServer(async (req, res) => {
  if (req.url.startsWith('/__dev')) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  const file = await resolveFile(req.url);
  if (!file) {
    const offline = await resolveFile('/offline.html');
    const body = offline ? await readFile(offline, 'utf8') : '<h1>404</h1>';
    res.writeHead(404, { 'Content-Type': MIME['.html'] });
    res.end(body.replace('</body>', `${LIVE_RELOAD}</body>`));
    return;
  }

  const ext = extname(file);
  const type = MIME[ext] || 'application/octet-stream';
  if (ext === '.html') {
    const body = await readFile(file, 'utf8');
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body.replace('</body>', `${LIVE_RELOAD}</body>`));
    return;
  }
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(await readFile(file));
});

let debounce;
for (const dir of ['src', 'content', 'scripts']) {
  watch(join(ROOT, dir), { recursive: true }, (_event, filename) => {
    if (!filename || filename.includes('~')) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      console.log(`\n↻ ${dir}/${filename} changed — rebuilding`);
      runBuild();
    }, 80);
  });
}

runBuild();
server.listen(PORT, HOST, () => {
  console.log(`\n  Chinar dev server\n  → http://${HOST}:${PORT}\n  watching src/, content/, scripts/ · Ctrl+C to stop\n`);
});
