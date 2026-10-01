import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createApp } from '../server.mjs';
import { sortFiles } from '../public/sort.mjs';

test('local sharing persists actual files, metadata, devices and folders safely', async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'profiler-test-'));
  const options = { sharedDir: path.join(temp, 'shared'), dataDir: path.join(temp, 'data'), maxUploadBytes: 1024 };
  const app = await createApp(options);
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const request = async (route, body, headers = {}) => {
    const response = await fetch(base + route, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) } : { headers });
    return { status: response.status, data: await response.json() };
  };
  t.after(async () => {
    await new Promise(resolve => app.server.close(resolve));
    const resolved = path.resolve(temp);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('profiler-test-'));
    await fs.rm(resolved, { recursive: true, force: true });
  });
  let textRecord;
  await t.test('text and links become files with server timestamps and device metadata', async () => {
    assert.equal((await request('/api/folders', { name: '노트', path: '' })).status, 201);
    const text = await request('/api/share', { kind: 'text', name: '생각', content: '안녕하세요\n다른 기기에서 만나요.', path: '노트' }, { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' });
    assert.equal(text.status, 201); textRecord = text.data.share;
    assert.equal(textRecord.device, 'ios'); assert.equal(textRecord.path, '노트/생각.txt'); assert.ok(Number.isFinite(Date.parse(textRecord.createdAt)));
    assert.equal(await fs.readFile(path.join(options.sharedDir, textRecord.path), 'utf8'), '안녕하세요\n다른 기기에서 만나요.');
    const link = await request('/api/share', { kind: 'link', name: '참고 링크', content: 'https://example.com/reference', path: '' }, { 'User-Agent': 'Mozilla/5.0 (Linux; Android 15)' });
    assert.equal(link.status, 201); assert.equal(link.data.share.device, 'android');
    assert.match(await fs.readFile(path.join(options.sharedDir, link.data.share.path), 'utf8'), /URL=https:\/\/example.com\/reference/);
    const list = await request('/api/list'); const folder = list.data.entries.find(x => x.name === '노트');
    assert.equal(folder.device, 'ios'); assert.equal(folder.size, textRecord.size);
    const invalid = await request('/api/share', { kind: 'link', content: 'javascript:alert(1)' }); assert.equal(invalid.status, 400);
  });
  await t.test('binary upload and download preserve bytes and duplicate names', async () => {
    const payload = Uint8Array.from([0, 255, 12, 88, 4]);
    for (let i = 0; i < 2; i++) {
      const response = await fetch(base + '/api/upload?name=data.bin&path=' , { method: 'POST', body: payload, headers: { 'Content-Type': 'application/octet-stream', 'User-Agent': 'Desktop Browser' } });
      assert.equal(response.status, 201); const { share } = await response.json(); assert.equal(share.name, i ? 'data (1).bin' : 'data.bin'); assert.equal(share.device, 'computer');
      const download = await fetch(base + '/api/download?path=' + encodeURIComponent(share.path));
      assert.deepEqual(new Uint8Array(await download.arrayBuffer()), payload); assert.match(download.headers.get('content-disposition'), /attachment/);
    }
    const oversized = await fetch(base + '/api/upload?name=large.bin', { method: 'POST', body: Buffer.alloc(1025) }); assert.equal(oversized.status, 413);
    assert.equal((await request('/api/list')).data.entries.some(x => x.name === 'large.bin'), false);
  });
  await t.test('concurrent shares keep unique filenames and all metadata', async () => {
    const responses = await Promise.all(Array.from({ length: 8 }, (_, i) => request('/api/share', { kind: 'text', name: '동시 공유', content: `message ${i}` })));
    assert.ok(responses.every(x => x.status === 201));
    assert.equal(new Set(responses.map(x => x.data.share.path)).size, 8);
    const all = await request('/api/shares'); assert.equal(all.data.shares.length, 12);
  });
  await t.test('path traversal, reserved Windows names and cross-origin writes are blocked', async () => {
    for (const route of ['/api/list?path=..', '/api/download?path=..%2Fsecret', '/api/list?path=C%3A%2FWindows', '/api/list?path=..%5Csecret']) assert.equal((await request(route)).status, 403);
    for (const name of ['CON', '../outside', 'bad:name', 'trailing.']) assert.equal((await request('/api/folders', { name })).status, 400);
    const cross = await request('/api/share', { kind: 'text', content: 'blocked' }, { Origin: 'https://external.example' }); assert.equal(cross.status, 403);
    const hostileHostStatus = await new Promise((resolve, reject) => {
      const req = http.get(base + '/api/info', { headers: { Host: 'attacker.example' } }, res => { res.resume(); resolve(res.statusCode); });
      req.on('error', reject);
    });
    assert.equal(hostileHostStatus, 403);
    const same = await request('/api/share', { kind: 'text', name: '같은 출처', content: 'allowed' }, { Origin: base }); assert.equal(same.status, 201);
    await fs.mkdir(path.join(temp, 'outside')); await fs.writeFile(path.join(temp, 'outside', 'private.txt'), 'private');
    try { await fs.symlink(path.join(temp, 'outside'), path.join(options.sharedDir, 'shortcut'), 'junction'); }
    catch (error) { if (error.code === 'EPERM') return; throw error; }
    assert.equal((await request('/api/list?path=shortcut')).status, 403);
    assert.equal((await request('/api/list')).data.entries.some(x => x.name === 'shortcut'), false);
  });
  await t.test('records survive server reload and removed files retain their log', async () => {
    await fs.unlink(path.join(options.sharedDir, textRecord.path));
    const reloaded = await createApp(options); await new Promise(resolve => reloaded.server.listen(0, '127.0.0.1', resolve));
    try { const shares = await (await fetch(`http://127.0.0.1:${reloaded.server.address().port}/api/shares`)).json(); assert.equal(shares.shares.length, 13); assert.equal(shares.shares.find(x => x.id === textRecord.id).available, false); }
    finally { await new Promise(resolve => reloaded.server.close(resolve)); }
  });
});

test('all six explorer sorts keep folders first, with natural filename order', () => {
  const entries = [
    { type:'file', name:'file10.txt', device:'ios', createdAt:'2026-01-02T00:00:00Z' },
    { type:'folder', name:'folder10', device:'android', createdAt:'2026-01-01T00:00:00Z' },
    { type:'file', name:'file2.txt', device:'computer', createdAt:'2026-01-03T00:00:00Z' },
    { type:'folder', name:'folder2', device:'ios', createdAt:'2026-01-04T00:00:00Z' }
  ];
  for (const key of ['name', 'date', 'device']) for (const direction of ['asc', 'desc']) {
    const sorted = sortFiles(entries, key, direction); assert.deepEqual(sorted.map(x=>x.type), ['folder','folder','file','file']);
    if(key==='name') assert.deepEqual(sorted.map(x=>x.name), direction==='asc'?['folder2','folder10','file2.txt','file10.txt']:['folder10','folder2','file10.txt','file2.txt']);
    if(key==='date') assert.equal(sorted[0].name, direction==='asc'?'folder10':'folder2');
    if(key==='device') assert.equal(sorted[0].device, direction==='asc'?'android':'ios');
  }
  assert.equal(entries[0].name, 'file10.txt');
});
