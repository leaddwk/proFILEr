// An isolated fixture server for browser QA; never touches the user's shared folder.
import { createApp } from '../server.mjs';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'profiler-browser-'));
const app = await createApp({ sharedDir:path.join(scratch,'shared'), dataDir:path.join(scratch,'data') });
await new Promise(resolve=>app.server.listen(4311,'127.0.0.1',resolve));
const base='http://127.0.0.1:4311';
const send=(route,body,ua='Desktop Browser')=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':ua},body:JSON.stringify(body)});
await send('/api/folders',{name:'디자인',path:''});
await send('/api/folders',{name:'프로젝트',path:''});
await send('/api/folders',{name:'참고 자료',path:'프로젝트'});
await send('/api/share',{kind:'text',name:'회의 메모',content:'작은 파일부터 큰 아이디어까지.\n모든 기기에서 이어지는 나의 공유 공간.',path:''},'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)');
await send('/api/share',{kind:'link',name:'디자인 레퍼런스',content:'https://example.com/design',path:'디자인'},'Mozilla/5.0 (Linux; Android 15)');
await send('/api/share',{kind:'text',name:'프로젝트2',content:'프로젝트 진행 내용을 함께 기록합니다.',path:'프로젝트'});
await send('/api/share',{kind:'text',name:'프로젝트10',content:'숫자를 포함한 파일 이름 정렬을 확인합니다.',path:'프로젝트'});
await fetch(base+'/api/upload?name=readme.txt&path=',{method:'POST',headers:{'Content-Type':'text/plain'},body:'proFILEr browser QA sample file'});
console.log(`QA: ${base}\nScratch: ${scratch}`);
async function clean(){app.server.closeAllConnections();await new Promise(resolve=>app.server.close(resolve));const resolved=path.resolve(scratch);if(!resolved.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(resolved).startsWith('profiler-browser-'))throw new Error('Unexpected scratch path');await fs.rm(resolved,{recursive:true,force:true});process.exit(0);}
process.on('SIGINT',clean);process.on('SIGTERM',clean);
