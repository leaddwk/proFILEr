import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const selected = process.argv.indexOf('--platform');
const platforms = selected < 0 ? ['windows', 'macos', 'linux'] : [process.argv[selected + 1]];
if (platforms.some(x => !['windows', 'macos', 'linux'].includes(x))) throw new Error('Use --platform windows, macos or linux.');
// Explicit allowlist prevents packaging user data, logs, credentials and cached runtimes.
const common = ['README.md', 'QUICKSTART.md', 'package.json', 'server.mjs', 'public/app.js', 'public/favicon.svg', 'public/index.html', 'public/logo.svg', 'public/sort.mjs', 'public/style.css'];
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let n = index;
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(entries) {
  const local = [], central = [];
  let offset = 0;
  for (const { name, bytes, executable } of entries) {
    const filename = Buffer.from('proFILEr/' + name);
    const compressed = deflateRawSync(bytes), crc = crc32(bytes);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(8, 8); header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(bytes.length, 22); header.writeUInt16LE(filename.length, 26);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50); record.writeUInt16LE(0x314, 4); record.writeUInt16LE(20, 6);
    record.writeUInt16LE(0x800, 8); record.writeUInt16LE(8, 10); record.writeUInt16LE(33, 14);
    record.writeUInt32LE(crc, 16); record.writeUInt32LE(compressed.length, 20); record.writeUInt32LE(bytes.length, 24); record.writeUInt16LE(filename.length, 28);
    record.writeUInt32LE(((executable ? 0o100755 : 0o100644) << 16) >>> 0, 38); record.writeUInt32LE(offset, 42);
    local.push(header, filename, compressed); central.push(record, filename);
    offset += header.length + filename.length + compressed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
await mkdir(path.join(root, 'dist'), { recursive: true });
for (const platform of platforms) {
  const launchers = platform === 'windows' ? ['start.bat', 'scripts/start-windows.ps1'] : ['start.sh', 'scripts/start-unix.sh', ...(platform === 'macos' ? ['start.command'] : [])];
  const entries = await Promise.all([...common, ...launchers].map(async name => ({ name, bytes: await readFile(path.join(root, name)), executable: /\.(sh|command)$/.test(name) })));
  const filename = `proFILEr-v${version}-${platform}.zip`, archive = zip(entries);
  await writeFile(path.join(root, 'dist', filename), archive);
  await writeFile(path.join(root, 'dist', filename + '.sha256'), `${createHash('sha256').update(archive).digest('hex')}  ${filename}\n`);
  console.log(path.join(root, 'dist', filename));
}
