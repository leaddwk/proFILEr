import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function run(command, args, options) {
  const child = spawn(command, args, options);
  let output = '';
  child.stdout.on('data', x => output += x); child.stderr.on('data', x => output += x);
  return { child, output: () => output, done: once(child, 'close') };
}
test('Unix release launcher downloads, reuses, serves and stops a verified runtime', {
  skip: process.platform === 'win32', timeout: 360_000,
}, async t => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'profiler-launcher-'));
  const project = path.join(scratch, 'proFILEr 한글 space');
  await fs.mkdir(path.join(project, 'scripts'), { recursive: true });
  for (const name of ['server.mjs', 'start.sh', 'scripts/start-unix.sh']) await fs.copyFile(path.join(root, name), path.join(project, name));
  await fs.cp(path.join(root, 'public'), path.join(project, 'public'), { recursive: true });
  let server;
  const env = { ...process.env, HOST: '127.0.0.1', SHARED_DIR: path.join(project, 'shared'), DATA_DIR: path.join(project, 'data') };
  t.after(async () => {
    if (server && server.child.exitCode === null && server.child.signalCode === null) {
      server.child.kill('SIGTERM'); await server.done;
    }
    assert.ok(path.resolve(scratch).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.ok(path.basename(scratch).startsWith('profiler-launcher-'));
    await fs.rm(scratch, { recursive: true, force: true });
  });
  const setup = run('bash', ['start.sh', '--setup-only'], { cwd: project, env });
  const [setupCode] = await setup.done;
  assert.equal(setupCode, 0, setup.output());
  assert.match(setup.output(), /Preparing Node.js/);
  // An unreachable proxy proves the second setup needs no download.
  const offlineEnv = { ...env, https_proxy: 'http://127.0.0.1:1', HTTPS_PROXY: 'http://127.0.0.1:1' };
  const cached = run('bash', ['start.sh', '--setup-only'], { cwd: project, env: offlineEnv });
  assert.equal((await cached.done)[0], 0, cached.output());
  assert.doesNotMatch(cached.output(), /Preparing Node.js/);
  const reservation = net.createServer(); await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  server = run('bash', ['start.sh', '--no-browser'], { cwd: project, env: { ...offlineEnv, PORT: String(port) } });
  const deadline = Date.now() + 20_000;
  while (!server.output().includes('Keep this terminal open') && Date.now() < deadline && server.child.exitCode === null) await new Promise(resolve => setTimeout(resolve, 100));
  assert.match(server.output(), /Keep this terminal open/, server.output());
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/info`).then(r => r.json())).name, 'proFILEr');
  assert.match(await fetch(`http://127.0.0.1:${port}/`).then(r => r.text()), /proFILEr/);
  server.child.kill('SIGTERM'); await server.done;
  await assert.rejects(fetch(`http://127.0.0.1:${port}/api/info`));
  const runtimeName = (await fs.readdir(path.join(project, '.runtime'))).find(x => x.startsWith('node-'));
  await fs.appendFile(path.join(project, '.runtime', runtimeName, 'bin', 'node'), 'tampered');
  const corrupted = run('bash', ['start.sh', '--setup-only'], { cwd: project, env: offlineEnv });
  assert.equal((await corrupted.done)[0], 1);
  assert.match(corrupted.output(), /Cached Node.js checksum mismatch/);
});
