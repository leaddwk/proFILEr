import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { promises as fs, createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { randomUUID } from 'node:crypto';

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8' };
MIME['.mjs'] = MIME['.js'];
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const inside = (root, target) => target === root || target.startsWith(root + path.sep);
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };

function cleanName(name) {
  if (typeof name !== 'string' || !name.trim() || name.length > 200 || /[<>:"/\\|?*\x00-\x1f]/.test(name) || /[. ]$/.test(name) || /^\.{1,2}$/.test(name) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(name)) fail(400, '사용할 수 없는 이름입니다. 특수문자와 이름 끝의 마침표를 확인해 주세요.');
  if (name.startsWith('.profiler-')) fail(400, '이 이름은 시스템에서 사용하고 있습니다.');
  return name;
}
function deviceOf(req) {
  const ua = req.headers['user-agent'] || '';
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && req.headers['x-profiler-device'] === 'ios')) return 'ios';
  return /Android/i.test(ua) ? 'android' : 'computer';
}
async function bodyJson(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 1024 * 1024) fail(413, '텍스트는 1 MB까지 공유할 수 있어요.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, '요청 형식을 확인해 주세요.'); }
}
function validLink(value) {
  let url; try { url = new URL(value); } catch { fail(400, '올바른 링크를 입력해 주세요.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail(400, 'http 또는 https 링크를 입력해 주세요.');
  return url.href;
}

export async function createApp(options = {}) {
  const root = path.resolve(options.sharedDir || process.env.SHARED_DIR || path.join(projectDir, 'shared'));
  const dataDir = path.resolve(options.dataDir || process.env.DATA_DIR || path.join(projectDir, '.profiler'));
  const maxUploadBytes = options.maxUploadBytes ?? Number(process.env.MAX_UPLOAD_MB || 2048) * 1024 * 1024;
  if (!Number.isFinite(maxUploadBytes) || maxUploadBytes <= 0) throw new Error('MAX_UPLOAD_MB must be a positive number.');
  if (inside(root, dataDir)) throw new Error('DATA_DIR must be outside SHARED_DIR.');
  await fs.mkdir(root, { recursive: true }); await fs.mkdir(dataDir, { recursive: true });
  const realRoot = await fs.realpath(root);
  const metadataPath = path.join(dataDir, 'shares.json');
  let records = [];
  try { records = JSON.parse(await fs.readFile(metadataPath, 'utf8')); if (!Array.isArray(records)) throw new Error('Invalid shares.json'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let saveQueue = Promise.resolve();
  const commit = (record) => {
    const action = saveQueue.then(async () => {
      const next = [record, ...records]; const temp = path.join(dataDir, 'shares.next.json');
      await fs.writeFile(temp, JSON.stringify(next, null, 2)); await fs.rename(temp, metadataPath); records = next;
    }); saveQueue = action.catch(() => {}); return action;
  };
  const resolvePath = async (relative = '') => {
    if (typeof relative !== 'string' || relative.includes('\\') || relative.includes('\0') || relative.split('/').some(s => s === '..' || s.includes(':') || s.startsWith('.profiler-'))) fail(403, '공유 폴더 밖의 경로에는 접근할 수 없어요.');
    const absolute = path.resolve(root, relative);
    if (!inside(root, absolute)) fail(403, '공유 폴더 밖의 경로에는 접근할 수 없어요.');
    let real; try { real = await fs.realpath(absolute); } catch (error) { if (error.code === 'ENOENT') fail(404, '파일 또는 폴더를 찾을 수 없어요.'); throw error; }
    if (!inside(realRoot, real)) fail(403, '공유 폴더 밖의 경로에는 접근할 수 없어요.');
    // Block symbolic links and Windows junctions at every component.
    let current = root;
    for (const part of path.relative(root, absolute).split(path.sep).filter(Boolean)) { current = path.join(current, part); if ((await fs.lstat(current)).isSymbolicLink()) fail(403, '바로가기 폴더는 탐색할 수 없어요.'); }
    return absolute;
  };
  const relativeOf = absolute => path.relative(root, absolute).split(path.sep).join('/');
  const networkUrls = (port) => Object.values(os.networkInterfaces()).flat().filter(x => x && x.family === 'IPv4' && !x.internal).map(x => `http://${x.address}:${port}`);
  const byPath = () => new Map([...records].reverse().map(r => [r.path.toLowerCase(), r]));
  const scan = async (absolute, metadata, depth = 0) => {
    if (depth > 100) fail(422, '폴더 깊이가 너무 깊어요.');
    const dirents = await fs.readdir(absolute, { withFileTypes: true }); const entries = [];
    for (const ent of dirents) {
      if (ent.isSymbolicLink() || ent.name.startsWith('.profiler-') || (!ent.isFile() && !ent.isDirectory())) continue;
      const full = path.join(absolute, ent.name); let stat;
      try { stat = await fs.lstat(full); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      const rel = relativeOf(full); const record = metadata.get(rel.toLowerCase());
      let entry = { name: ent.name, path: rel, type: ent.isDirectory() ? 'folder' : (record?.kind || 'file'), size: stat.size, createdAt: record?.createdAt || stat.mtime.toISOString(), device: record?.device || 'local', id: record?.id || null, childCount: 0 };
      if (ent.isDirectory()) {
        const children = await scan(full, metadata, depth + 1); entry.size = children.reduce((sum, child) => sum + child.size, 0); entry.childCount = children.length;
        const latest = children.reduce((last, child) => child.createdAt > last.createdAt ? child : last, { createdAt: '', device: 'local' });
        entry.createdAt = record?.createdAt || latest.createdAt || stat.mtime.toISOString(); entry.device = latest.createdAt ? latest.device : (record?.device || 'local');
      }
      entries.push(entry);
    }
    return entries;
  };
  const reserveFile = async (parent, requested) => {
    const ext = path.extname(requested); const base = requested.slice(0, requested.length - ext.length);
    for (let i = 0; i < 10000; i++) { const name = i ? `${base} (${i})${ext}` : requested; const target = path.join(parent, name); try { const handle = await fs.open(target, 'wx'); return { target, name, handle }; } catch (error) { if (error.code !== 'EEXIST') throw error; } }
    fail(409, '같은 이름의 파일이 너무 많아요. 다른 이름을 사용해 주세요.');
  };
  const store = async (req, parentRelative, requestedName, kind, content, mime) => {
    const parent = await resolvePath(parentRelative); if (!(await fs.stat(parent)).isDirectory()) fail(400, '저장할 폴더를 선택해 주세요.');
    cleanName(requestedName);
    const tempPath = path.join(parent, `.profiler-${randomUUID()}.upload`);
    let final;
    try {
      let size = 0;
      if (kind === 'file') {
        if (Number(req.headers['content-length']) > maxUploadBytes) fail(413, `파일은 ${Math.floor(maxUploadBytes / 1024 / 1024)} MB까지 공유할 수 있어요.`);
        const limiter = new Transform({ transform(chunk, encoding, cb) { size += chunk.length; cb(size > maxUploadBytes ? new HttpError(413, '파일 용량 제한을 초과했어요.') : null, chunk); } });
        await pipeline(req, limiter, createWriteStream(tempPath, { flags: 'wx' }));
      } else { const buffer = Buffer.from(content); size = buffer.length; await fs.writeFile(tempPath, buffer, { flag: 'wx' }); }
      final = await reserveFile(parent, requestedName); await final.handle.close(); await fs.rename(tempPath, final.target);
      const record = { id: randomUUID(), path: relativeOf(final.target), name: final.name, kind, size, device: deviceOf(req), createdAt: new Date().toISOString(), mime: mime || 'application/octet-stream' };
      if (kind === 'text') record.content = content;
      if (kind === 'link') record.content = validLink(content.split('\nURL=')[1]?.trim() || '');
      await commit(record); return record;
    } catch (error) { await fs.unlink(tempPath).catch(() => {}); if (final) await fs.unlink(final.target).catch(() => {}); throw error; }
  };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const localPort = server.address()?.port;
      const hosts = new Set(['localhost', '127.0.0.1', '[::1]', os.hostname().toLowerCase(), ...Object.values(os.networkInterfaces()).flat().filter(Boolean).map(x => x.address.toLowerCase())]);
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      if (!hosts.has(url.hostname.toLowerCase())) fail(403, '서버의 로컬 주소로 접속해 주세요.');
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) fail(403, '이 서버의 페이지에서 요청해 주세요.');
      if (req.headers['sec-fetch-site'] === 'cross-site') fail(403, '외부 사이트의 요청은 허용하지 않아요.');
      const method = req.method;
      if (url.pathname === '/api/info' && method === 'GET') {
        const items = await scan(root, byPath());
        return json(res, 200, { name: 'proFILEr', sharedDir: root, maxUploadBytes, urls: networkUrls(localPort), localhost: `http://localhost:${localPort}`, totalShares: records.length, totalBytes: items.reduce((n, x) => n + x.size, 0) });
      }
      if (url.pathname === '/api/shares' && method === 'GET') {
        const available = await Promise.all(records.map(async r => { try { await resolvePath(r.path); return { ...r, available: true }; } catch { return { ...r, available: false }; } }));
        return json(res, 200, { shares: available });
      }
      if (url.pathname === '/api/list' && method === 'GET') {
        const rel = url.searchParams.get('path') || ''; const folder = await resolvePath(rel);
        if (!(await fs.stat(folder)).isDirectory()) fail(400, '폴더 경로를 확인해 주세요.');
        return json(res, 200, { path: relativeOf(folder), entries: await scan(folder, byPath()) });
      }
      if (url.pathname === '/api/upload' && method === 'POST') {
        const record = await store(req, url.searchParams.get('path') || '', url.searchParams.get('name') || '', 'file', null, req.headers['content-type']);
        return json(res, 201, { share: record });
      }
      if (url.pathname === '/api/share' && method === 'POST') {
        const body = await bodyJson(req); if (!['text', 'link'].includes(body.kind)) fail(400, '공유 유형을 확인해 주세요.');
        if (typeof body.content !== 'string' || !body.content.trim()) fail(400, '공유할 내용을 입력해 주세요.');
        const content = body.kind === 'link' ? validLink(body.content.trim()) : body.content;
        const defaultName = body.kind === 'link' ? new URL(content).hostname : content.trim().split('\n')[0].slice(0, 45).replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/[. ]+$/, '') || '메모';
        const title = cleanName(body.name?.trim() || defaultName); const ext = body.kind === 'link' ? '.url' : '.txt';
        const name = title.toLowerCase().endsWith(ext) ? title : title + ext;
        const record = await store(req, body.path || '', name, body.kind, body.kind === 'link' ? `[InternetShortcut]\nURL=${content}\n` : content, body.kind === 'link' ? 'application/internet-shortcut' : 'text/plain; charset=utf-8');
        return json(res, 201, { share: record });
      }
      if (url.pathname === '/api/folders' && method === 'POST') {
        const body = await bodyJson(req); const parent = await resolvePath(body.path || ''); const name = cleanName(body.name);
        if (!(await fs.stat(parent)).isDirectory()) fail(400, '상위 폴더를 확인해 주세요.');
        try { await fs.mkdir(path.join(parent, name)); } catch (error) { if (error.code === 'EEXIST') fail(409, '같은 이름의 폴더가 이미 있어요.'); throw error; }
        return json(res, 201, { path: relativeOf(path.join(parent, name)) });
      }
      if (url.pathname === '/api/download' && ['GET', 'HEAD'].includes(method)) {
        const file = await resolvePath(url.searchParams.get('path') || ''); const stat = await fs.stat(file); if (!stat.isFile()) fail(400, '다운로드할 파일을 선택해 주세요.');
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': stat.size, 'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(path.basename(file)).replace(/'/g, '%27')}`, 'Cache-Control': 'no-store' });
        if (method === 'HEAD') return res.end();
        const stream = createReadStream(file); stream.on('error', () => res.destroy()); res.on('close', () => stream.destroy()); stream.pipe(res); return;
      }
      if (url.pathname.startsWith('/api/')) fail(404, '요청한 기능을 찾을 수 없어요.');
      if (!['GET', 'HEAD'].includes(method)) fail(405, '허용하지 않는 요청입니다.');
      const staticFiles = { '/': 'index.html', '/app.js': 'app.js', '/sort.mjs': 'sort.mjs', '/style.css': 'style.css', '/favicon.svg': 'favicon.svg', '/logo.svg': 'logo.svg' };
      const staticName = staticFiles[url.pathname]; if (!staticName) fail(404, '페이지를 찾을 수 없어요.');
      const buffer = await fs.readFile(path.join(projectDir, 'public', staticName)); res.writeHead(200, { 'Content-Type': MIME[path.extname(staticName)], 'Content-Length': buffer.length, 'Cache-Control': 'no-cache' }); res.end(method === 'HEAD' ? undefined : buffer);
    } catch (error) {
      if (res.headersSent || res.destroyed) return;
      if (!error.status) console.error(error);
      json(res, error.status || 500, { error: error.status ? error.message : '처리하지 못했어요. 서버 상태와 저장 공간을 확인해 주세요.' });
    }
  });
  server.requestTimeout = 0; server.headersTimeout = 60000;
  return { server, root, networkUrls };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4310); const host = process.env.HOST || '0.0.0.0';
  const app = await createApp();
  app.server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Set PORT to another number.` : error.message); process.exitCode = 1; });
  app.server.listen(port, host, () => { const actual = app.server.address().port; console.log(`proFILEr · http://localhost:${actual}\nShared folder: ${app.root}`); for (const url of app.networkUrls(actual)) console.log(`LAN: ${url}`); });
}
