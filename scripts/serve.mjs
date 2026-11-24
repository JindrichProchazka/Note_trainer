import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8' };

export function createStaticServer() {
  return http.createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }
    if (pathname === '/Note_trainer') {
      response.writeHead(302, { Location: './Note_trainer/' }).end();
      return;
    }
    if (pathname.startsWith('/Note_trainer/')) pathname = pathname.slice('/Note_trainer'.length);
    if (pathname === '/') pathname = '/index.html';
    if (pathname === '/favicon.ico') { response.writeHead(204).end(); return; }
    // Serve only application assets; never expose Git metadata or local documents.
    const allowed = pathname === '/index.html' || /^\/(?:css|js)\/[a-zA-Z0-9_./-]+$/.test(pathname);
    const relative = pathname.slice(1);
    const target = path.resolve(ROOT, relative);
    if (!allowed || relative.split(/[\\/]/).some(segment => segment.startsWith('.')) ||
        !target.startsWith(ROOT) || !MIME[path.extname(target)]) {
      response.writeHead(404).end('Not found');
      return;
    }
    try {
      const body = await readFile(target);
      response.writeHead(200, { 'Content-Type': MIME[path.extname(target)], 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const portIndex = process.argv.indexOf('--port');
  const port = portIndex === -1 ? 5173 : Number(process.argv[portIndex + 1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Use a port between 1 and 65535.');
    process.exitCode = 1;
  } else {
    const server = createStaticServer();
    server.on('error', error => { console.error(error.message); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () =>
      console.log(`NoteTrainer: http://127.0.0.1:${port}/Note_trainer/\nPress Ctrl+C to stop.`));
  }
}
