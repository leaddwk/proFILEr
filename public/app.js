import { sortFiles, deviceLabels } from './sort.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const paths = {
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  folder: '<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 9h18"/>',
  folderPlus: '<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 14h6m-3-3v6"/>',
  share: '<path d="M12 16V3m-4 4 4-4 4 4M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/>',
  upload: '<path d="M12 17V8m-4 4 4-4 4 4"/><path d="M7 18H5a4 4 0 0 1-.6-8 7.5 7.5 0 0 1 14.5-1.8A5 5 0 0 1 19 18h-2"/>',
  text: '<path d="M4 5h16M4 10h16M4 15h12M4 20h8"/>',
  link: '<path d="m10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(2 0)"/>',
  wifi: '<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-10 4a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r=".5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  triangleRight: '<path d="m8 5 9 7-9 7z" fill="currentColor" stroke="none"/>',
  triangleDown: '<path d="m5 8 7 9 7-9z" fill="currentColor" stroke="none"/>',
  devices: '<rect x="2" y="3" width="15" height="12" rx="2"/><path d="M9 15v4M5 19h8"/><rect x="16" y="9" width="6" height="12" rx="1.5"/>',
  computer: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4M7 21h10"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4M11 19h2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  shield: '<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6zM8 12l3 3 5-6"/>',
  stack: '<path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  window: '<rect x="2" y="3" width="20" height="18" rx="3"/><path d="M2 9h20M8 9v12M6 6h.01M9 6h.01"/>',
  tree: '<path d="M5 3v14a3 3 0 0 0 3 3h4M5 10h7"/><rect x="12" y="6" width="8" height="7" rx="1.5"/><rect x="12" y="16" width="8" height="7" rx="1.5"/>',
  up: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  sort: '<path d="M4 6h16M4 12h10M4 18h4"/>',
  sortAsc: '<path d="M7 20V4m-3 3 3-3 3 3M14 6h3M14 12h5M14 18h7"/>',
  sortDesc: '<path d="M7 4v16m-3-3 3 3 3-3M14 6h7M14 12h5M14 18h3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  archive: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M10 3h4v3h-4v3h4v3h-4v3h4v3h-4z"/>',
  check: '<path d="m5 12 4 4 10-10"/>'
};
const icon = name => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`;
function paintIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon)); }
paintIcons();

const state = { tab: 'share', kind: 'file', filter: 'all', shares: [], info: null, destination: '', pickerPath: '', folderContext: '', mode: 'window', path: '', selectedFolder: '', sortKey: 'name', direction: 'asc', expanded: new Set(), cache: new Map(), uploading: false, loadingExplorer: false };
try { const prefs = JSON.parse(localStorage.getItem('profiler-preferences') || '{}'); if (['window','tree'].includes(prefs.mode)) state.mode=prefs.mode; if (['name','date','device'].includes(prefs.sortKey)) state.sortKey=prefs.sortKey; if (['asc','desc'].includes(prefs.direction)) state.direction=prefs.direction; } catch {}
const deviceNames = deviceLabels;
const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
const formatDate = value => new Intl.DateTimeFormat('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false }).format(new Date(value));
const timeOf = value => new Intl.DateTimeFormat('ko-KR', { hour:'2-digit', minute:'2-digit', hour12:false }).format(new Date(value));
const dayKey = value => new Date(value).toLocaleDateString('sv-SE');
function dayLabel(value) { const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate()-1); if(dayKey(value)===dayKey(today))return '오늘';if(dayKey(value)===dayKey(yesterday))return '어제';return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date(value)); }
function bytes(n) { if(!n)return '0 B'; const u=['B','KB','MB','GB','TB'];const i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),4);return `${new Intl.NumberFormat('ko-KR',{maximumFractionDigits:i>0?1:0}).format(n/1024**i)} ${u[i]}`; }
const badge = device => `<span class="device-badge">${icon(device==='computer'||device==='local'?'computer':'phone')}${esc(deviceNames[device]||deviceNames.local)}</span>`;
function fileStyle(name, kind) { if(kind==='folder')return 'folder';if(kind==='text'||kind==='link')return kind;const ext=name.split('.').pop().toLowerCase();if(['png','jpg','jpeg','gif','webp','heic','svg'].includes(ext))return 'image';if(ext==='pdf')return 'pdf';if(['zip','7z','rar','tar','gz'].includes(ext))return 'archive';return 'file'; }
const downloadUrl = rel => `/api/download?path=${encodeURIComponent(rel)}`;
function toast(message, error=false) { clearTimeout(toast.timer);$('#toast').textContent=message;$('#toast').classList.toggle('error',error);$('#toast').hidden=false;toast.timer=setTimeout(()=>$('#toast').hidden=true,4000); }
async function api(url, options={}) { const response=await fetch(url,options);let data;try{data=await response.json();}catch{throw new Error('서버에 연결할 수 없어요.');}if(!response.ok)throw new Error(data.error||'요청을 처리하지 못했어요.');return data; }
const post = (url,body) => api(url,{method:'POST',headers:{'Content-Type':'application/json','X-Profiler-Device':clientDevice()},body:JSON.stringify(body)});
function clientDevice() { const ua=navigator.userAgent;return /iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)?'ios':/Android/.test(ua)?'android':'computer'; }
async function copy(value) { try { if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(value);else{const input=document.createElement('textarea');input.value=value;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.focus();input.select();const ok=document.execCommand('copy');input.remove();if(!ok)throw new Error('복사에 실패했어요.');}toast('클립보드에 복사했어요.'); }catch{toast('복사하지 못했어요. 내용을 선택해서 복사해 주세요.',true);} }
function openDialog(id) { const el=$(`#${id}`);if(!el.open)el.showModal(); }
$$('[data-close]').forEach(button=>button.addEventListener('click',()=>$(`#${button.dataset.close}`).close()));
$$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}}));

function renderActivity() {
  $('#activity-count').textContent=state.shares.length;
  const list=state.shares.filter(share=>state.filter==='all'||share.kind===state.filter);
  if(!list.length){$('#activity-list').innerHTML=`<div class="empty-state"><span class="empty-icon">${icon(state.filter==='all'?'share':state.filter)}</span><strong>${state.shares.length?'아직 이 유형의 공유가 없어요':'첫 번째 공유를 기다리고 있어요'}</strong><p>${state.shares.length?'파일, 텍스트, 링크 중 다른 유형을 선택해 보세요.':'파일을 놓거나 짧은 메모를 남겨보세요.<br>어느 기기에서 보냈는지도 여기에 함께 기록돼요.'}</p></div>`;return;}
  let previousDay='';let html='';
  for(const share of list){const day=dayKey(share.createdAt);if(day!==previousDay){html+=`<div class="date-label">${esc(dayLabel(share.createdAt))}</div>`;previousDay=day;}
    const style=fileStyle(share.name,share.kind);let preview=share.kind==='text'?esc(share.content):share.kind==='link'?`<a href="${esc(share.content)}" target="_blank" rel="noopener noreferrer">${esc(share.content)}</a>`:esc(share.path.includes('/')?share.path.slice(0,share.path.lastIndexOf('/')):'공유 폴더');
    html+=`<article class="share-item"><span class="file-symbol ${style}">${icon(style==='pdf'?'file':style)}</span><div class="share-item-body"><button class="share-name" data-detail="${esc(share.id)}" title="${esc(share.name)}">${esc(share.name)}</button><p class="share-preview">${preview}</p><div class="share-metadata">${badge(share.device)}<span class="meta-separator"></span><time datetime="${esc(share.createdAt)}" title="${esc(formatDate(share.createdAt))}">${esc(timeOf(share.createdAt))}</time><span class="meta-separator"></span><span>${bytes(share.size)}</span>${share.available?'':'<span>파일 이동됨</span>'}</div></div>${share.kind==='text'?`<button class="icon-button item-action" data-copy="${esc(share.id)}" aria-label="${esc(share.name)} 텍스트 복사" title="복사">${icon('copy')}</button>`:share.kind==='link'?`<a class="icon-button item-action" href="${esc(share.content)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(share.name)} 링크 열기" title="링크 열기">${icon('external')}</a>`:share.available?`<a class="icon-button item-action" href="${downloadUrl(share.path)}" aria-label="${esc(share.name)} 다운로드" title="다운로드">${icon('download')}</a>`:''}</article>`;
  }
  $('#activity-list').innerHTML=html;
}
function renderInfo() {
  if(!state.info)return;$('#total-shares').textContent=`${state.info.totalShares.toLocaleString()}개의 공유`;$('#total-size').textContent=`${bytes(state.info.totalBytes)} 저장됨`;
  $('#connection-label').textContent='로컬 네트워크';$('#connection-button').classList.add('connected');
  $('#upload-limit').textContent=`여러 파일 선택 가능 · 파일당 최대 ${bytes(state.info.maxUploadBytes)}`;
  $('#local-folder-path').textContent=state.info.sharedDir;
  $('#network-addresses').innerHTML=state.info.urls.length?state.info.urls.map(url=>`<div class="address-card"><code>${esc(url)}</code><button class="icon-button" data-copy-url="${esc(url)}" aria-label="접속 주소 복사" title="주소 복사">${icon('copy')}</button></div>`).join(''):'<p class="dialog-description">네트워크 주소를 찾지 못했어요. Wi-Fi 또는 유선 네트워크에 연결해 주세요.</p>';
}
let refreshInFlight=false;
let refreshAgain=false;
async function refresh(quiet=false) {
  if(refreshInFlight){if(!quiet)refreshAgain=true;return;}refreshInFlight=true;
  try{const [activity,info]=await Promise.all([api('/api/shares'),api('/api/info')]);const changed=JSON.stringify(activity.shares)!==JSON.stringify(state.shares);state.shares=activity.shares;state.info=info;renderInfo();if(changed||!quiet)renderActivity();if(state.tab==='explorer'&&(changed||!quiet)){state.cache.clear();await renderExplorer();}}
  catch(error){$('#connection-label').textContent='연결 끊김';$('#connection-button').classList.remove('connected');if(!quiet){toast(error.message,true);if(!state.shares.length)$('#activity-list').innerHTML='<div class="error-state">연결하지 못했어요.<br>새로고침해서 다시 시도해 주세요.</div>';}}
  finally{refreshInFlight=false;if(refreshAgain){refreshAgain=false;void refresh();}}
}
$$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{state.filter=button.dataset.filter;$$('[data-filter]').forEach(el=>el.classList.toggle('active',el===button));renderActivity();}));
$$('[data-kind]').forEach(button=>button.addEventListener('click',()=>{state.kind=button.dataset.kind;$$('[data-kind]').forEach(el=>{el.classList.toggle('selected',el===button);el.setAttribute('aria-selected',String(el===button));});$$('.composer-panel').forEach(el=>el.hidden=el.id!==`${state.kind}-composer`);}));
$('#refresh-shares').addEventListener('click',()=>refresh());
$('#connection-button').addEventListener('click',()=>openDialog('connection-dialog'));
$('#connect-shortcut').addEventListener('click',()=>openDialog('connection-dialog'));
$('#network-addresses').addEventListener('click',event=>{const button=event.target.closest('[data-copy-url]');if(button)copy(button.dataset.copyUrl);});
$('#activity-list').addEventListener('click',event=>{const detail=event.target.closest('[data-detail]');const copyButton=event.target.closest('[data-copy]');if(detail)openDetail(state.shares.find(x=>x.id===detail.dataset.detail));if(copyButton)copy(state.shares.find(x=>x.id===copyButton.dataset.copy)?.content||'');});

function openDetail(share) {
  if(!share)return;$('#detail-symbol').innerHTML=icon(share.kind==='file'?'file':share.kind);$('#detail-title').textContent=share.name;$('#detail-meta').innerHTML=`${badge(share.device)}<span>${esc(formatDate(share.createdAt))}</span><span>${bytes(share.size)}</span>`;
  $('#detail-content').innerHTML=share.kind==='text'?`<pre class="detail-text">${esc(share.content)}</pre>`:share.kind==='link'?`<a class="detail-link" href="${esc(share.content)}" target="_blank" rel="noopener noreferrer">${esc(share.content)}</a>`:`<p class="detail-description">${esc(share.path)}${share.available?'':'<br>공유 이후 파일이 이동되었거나 삭제되었어요.'}</p>`;
  $('#detail-actions').innerHTML=`${share.available?`<a class="primary" href="${downloadUrl(share.path)}">${icon('download')}다운로드</a>`:''}${['text','link'].includes(share.kind)?`<button class="subtle-button" id="detail-copy">${icon('copy')}복사</button>`:''}`;
  $('#detail-copy')?.addEventListener('click',()=>copy(share.content));openDialog('detail-dialog');
}
for(const kind of ['text','link'])$(`#${kind}-composer`).addEventListener('submit',async event=>{
  event.preventDefault();const button=event.currentTarget.querySelector('button[type=submit]');button.disabled=true;
  try{await post('/api/share',{kind,content:$(`#${kind}-content`).value,name:$(`#${kind}-title`).value,path:state.destination});$(`#${kind}-composer`).reset();toast(kind==='text'?'텍스트를 공유했어요.':'링크를 공유했어요.');state.cache.clear();await refresh();}
  catch(error){toast(error.message,true);}finally{button.disabled=false;}
});
function upload(file,pathName,onProgress) {
  return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('POST',`/api/upload?path=${encodeURIComponent(pathName)}&name=${encodeURIComponent(file.name)}`);xhr.setRequestHeader('Content-Type',file.type||'application/octet-stream');xhr.setRequestHeader('X-Profiler-Device',clientDevice());xhr.upload.onprogress=event=>onProgress(event.lengthComputable?Math.round(event.loaded/event.total*100):0);xhr.onload=()=>{let data;try{data=JSON.parse(xhr.responseText);}catch{reject(new Error('서버 응답을 확인할 수 없어요.'));return;}if(xhr.status>=200&&xhr.status<300)resolve(data);else reject(new Error(data.error||'업로드하지 못했어요.'));};xhr.onerror=()=>reject(new Error('연결이 끊겼어요. 업로드를 다시 시도해 주세요.'));xhr.send(file);});
}
async function uploadFiles(files) {
  if(!files.length)return;if(state.uploading){toast('진행 중인 업로드가 끝난 뒤 다시 선택해 주세요.');return;}state.uploading=true;$('#drop-zone').disabled=true;
  const queue=$('#upload-queue');queue.hidden=false;queue.replaceChildren();const destination=state.destination;let success=0;
  for(const file of files){const row=document.createElement('div');row.className='queue-item';row.innerHTML=`<div class="queue-name"><span title="${esc(file.name)}">${esc(file.name)}</span><span class="queue-status">대기 중</span></div><div class="progress-track"><div class="progress-bar"></div></div>`;queue.append(row);const status=row.querySelector('.queue-status');try{if(state.info&&file.size>state.info.maxUploadBytes)throw new Error('용량 제한 초과');await upload(file,destination,percent=>{status.textContent=`${percent}%`;row.querySelector('.progress-bar').style.width=`${percent}%`;});status.textContent='완료';row.querySelector('.progress-bar').style.width='100%';success++;}catch(error){row.classList.add('failed');status.textContent='실패';status.title=error.message;toast(`${file.name}: ${error.message}`,true);}}
  state.uploading=false;$('#drop-zone').disabled=false;$('#file-input').value='';state.cache.clear();await refresh();if(success)toast(`${success}개의 파일을 공유했어요.`);
}
$('#drop-zone').addEventListener('click',()=>$('#file-input').click());
$('#file-input').addEventListener('change',event=>uploadFiles([...event.target.files]));
['dragenter','dragover'].forEach(name=>$('#drop-zone').addEventListener(name,event=>{event.preventDefault();$('#drop-zone').classList.add('drag-over');}));
['dragleave','drop'].forEach(name=>$('#drop-zone').addEventListener(name,event=>{event.preventDefault();$('#drop-zone').classList.remove('drag-over');if(name==='drop')uploadFiles([...event.dataTransfer.files]);}));
window.addEventListener('dragover',event=>event.preventDefault());window.addEventListener('drop',event=>event.preventDefault());

// Explorer and folder navigation use the same on-disk shared space.
function savePreferences(){try{localStorage.setItem('profiler-preferences',JSON.stringify({mode:state.mode,sortKey:state.sortKey,direction:state.direction}));}catch{}}
function sortEntries(entries){return sortFiles(entries,state.sortKey,state.direction);}
async function getFolder(rel){if(!state.cache.has(rel))state.cache.set(rel,(await api(`/api/list?path=${encodeURIComponent(rel)}`)).entries);return state.cache.get(rel);}
function crumbs(rel,attribute){const parts=rel.split('/').filter(Boolean);let html=`<button ${attribute}="">${icon('folder')}공유 폴더</button>`;let joined='';for(const part of parts){joined=joined?`${joined}/${part}`:part;html+=`<span class="crumb-separator">/</span><button ${attribute}="${esc(joined)}">${esc(part)}</button>`;}return html;}
function rowOf(entry,depth=0){const style=fileStyle(entry.name,entry.type);const tree=state.mode==='tree';const isFolder=entry.type==='folder';const expanded=state.expanded.has(entry.path);
  return `<div class="file-row ${tree?'tree-row':''} ${isFolder&&state.selectedFolder===entry.path?'selected-folder':''}" style="--depth:${Math.min(depth,14)}"><div class="file-name-cell">${tree?(isFolder?`<button class="tree-toggle" data-expand="${esc(entry.path)}" aria-label="${esc(entry.name)} ${expanded?'접기':'펼치기'}" aria-expanded="${expanded}">${icon(expanded?'triangleDown':'triangleRight')}</button>`:'<span class="tree-placeholder"></span>'):''}<span class="entry-icon ${style}">${icon(style==='pdf'?'file':style)}</span><div class="entry-label"><button class="entry-name" ${isFolder?`data-folder="${esc(entry.path)}"`:`data-entry="${esc(entry.path)}"`} title="${esc(entry.name)}">${esc(entry.name)}</button><time class="file-date-mobile" datetime="${esc(entry.createdAt)}">${esc(formatDate(entry.createdAt))}</time></div></div><span>${badge(entry.device)}</span><time class="file-date" datetime="${esc(entry.createdAt)}" title="${esc(formatDate(entry.createdAt))}">${esc(formatDate(entry.createdAt))}</time><span class="file-size" title="${isFolder?'폴더 전체 크기':'파일 크기'}">${bytes(entry.size)}</span>${!isFolder?`<a class="icon-button" href="${downloadUrl(entry.path)}" aria-label="${esc(entry.name)} 다운로드" title="다운로드">${icon('download')}</a>`:'<span></span>'}</div>`;
}
let explorerRevision=0;
async function treeRows(rel,depth=0){const entries=sortEntries(await getFolder(rel));let html='';for(const entry of entries){html+=rowOf(entry,depth);if(entry.type==='folder'&&state.expanded.has(entry.path)){const children=await getFolder(entry.path);html+=children.length?await treeRows(entry.path,depth+1):`<div class="tree-empty" style="--depth:${Math.min(depth+1,14)}">빈 폴더</div>`;}}return html;}
async function renderExplorer(){
  const revision=++explorerRevision;const mode=state.mode;$('#path-toolbar').hidden=mode==='tree';$('#tree-heading').hidden=mode!=='tree';$$('[data-mode]').forEach(el=>{el.classList.toggle('selected',el.dataset.mode===mode);el.setAttribute('aria-pressed',String(el.dataset.mode===mode));});$('#sort-key').value=state.sortKey;$('#sort-direction-label').textContent=state.direction==='asc'?'오름차순':'내림차순';$('#sort-direction').setAttribute('aria-label',`${state.direction==='asc'?'내림':'오름'}차순으로 변경`);$('#sort-direction').querySelector('[data-icon]').innerHTML=icon(state.direction==='asc'?'sortAsc':'sortDesc');$('#breadcrumbs').innerHTML=crumbs(state.path,'data-navigate');$('#go-up').disabled=!state.path;
  try{const entries=await getFolder(mode==='tree'?'':state.path);const html=mode==='tree'?await treeRows(''):sortEntries(entries).map(entry=>rowOf(entry)).join('');if(revision!==explorerRevision)return;$('#explorer-list').innerHTML=entries.length?html:`<div class="empty-state"><span class="empty-icon">${icon('folder')}</span><strong>아직 비어 있는 폴더예요</strong><p>새 폴더를 만들거나 공유 탭에서 파일을 보내보세요.</p></div>`;$('#explorer-count').textContent=`${entries.length}개 항목`;$('#explorer-location').textContent=mode==='tree'?(state.selectedFolder?`공유 폴더 / ${state.selectedFolder}`:'공유 폴더'):state.path?`공유 폴더 / ${state.path}`:'공유 폴더';$('#folder-size').textContent=`${bytes(entries.reduce((sum,x)=>sum+x.size,0))}`;}
  catch(error){if(revision!==explorerRevision)return;$('#explorer-list').innerHTML=`<div class="error-state">${esc(error.message)}</div>`;toast(error.message,true);}
}
async function navigate(rel){state.path=rel;state.selectedFolder=rel;await renderExplorer();}
$('#breadcrumbs').addEventListener('click',event=>{const button=event.target.closest('[data-navigate]');if(button)navigate(button.dataset.navigate);});
$('#go-up').addEventListener('click',()=>navigate(state.path.split('/').slice(0,-1).join('/')));
$('#explorer-list').addEventListener('click',async event=>{const folder=event.target.closest('[data-folder]');const expand=event.target.closest('[data-expand]');const entry=event.target.closest('[data-entry]');if(folder||expand){const rel=(folder||expand).dataset.folder??expand.dataset.expand;if(state.mode==='window'){await navigate(rel);}else{state.selectedFolder=rel;if(state.expanded.has(rel))state.expanded.delete(rel);else state.expanded.add(rel);await renderExplorer();}}if(entry){const share=state.shares.find(x=>x.path===entry.dataset.entry);if(share)openDetail(share);else{const a=document.createElement('a');a.href=downloadUrl(entry.dataset.entry);a.click();}}});
$$('[data-mode]').forEach(button=>button.addEventListener('click',()=>{state.mode=button.dataset.mode;savePreferences();renderExplorer();}));
$('#sort-key').addEventListener('change',event=>{state.sortKey=event.target.value;savePreferences();renderExplorer();});
$('#sort-direction').addEventListener('click',()=>{state.direction=state.direction==='asc'?'desc':'asc';savePreferences();renderExplorer();});
$('#refresh-explorer').addEventListener('click',()=>{state.cache.clear();renderExplorer();refresh(true);});
function newFolder(context){state.folderContext=context;$('#folder-name').value='';$('#new-folder-location').textContent=`저장 위치: 공유 폴더${context?' / '+context:''}`;openDialog('folder-dialog');setTimeout(()=>$('#folder-name').focus(),0);}
$('#new-folder').addEventListener('click',()=>newFolder(state.mode==='tree'?state.selectedFolder:state.path));
$('#folder-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button[type=submit]');button.disabled=true;try{await post('/api/folders',{name:$('#folder-name').value.trim(),path:state.folderContext});$('#folder-dialog').close();state.cache.clear();toast('새 폴더를 만들었어요.');if($('#destination-dialog').open)await renderPicker();if(state.tab==='explorer')await renderExplorer();}catch(error){toast(error.message,true);}finally{button.disabled=false;}});
async function renderPicker(){$('#picker-path').innerHTML=crumbs(state.pickerPath,'data-pick-path');try{const entries=(await getFolder(state.pickerPath)).filter(x=>x.type==='folder').sort((a,b)=>collator.compare(a.name,b.name));$('#picker-folders').innerHTML=entries.length?entries.map(entry=>`<button class="picker-folder" data-pick-path="${esc(entry.path)}"><span>${icon('folder')}</span>${esc(entry.name)}<span>${icon('chevronRight')}</span></button>`).join(''):'<div class="empty-state"><p>하위 폴더가 없어요.<br>이 폴더를 선택하거나 새 폴더를 만들어 주세요.</p></div>';}catch(error){toast(error.message,true);$('#picker-folders').innerHTML='<p class="error-state">폴더를 불러오지 못했어요.</p>';}}
$('#destination-button').addEventListener('click',()=>{state.pickerPath=state.destination;state.cache.clear();openDialog('destination-dialog');renderPicker();});
for(const selector of ['#picker-path','#picker-folders'])$(selector).addEventListener('click',event=>{const button=event.target.closest('[data-pick-path]');if(button){state.pickerPath=button.dataset.pickPath;renderPicker();}});
$('#choose-destination').addEventListener('click',()=>{state.destination=state.pickerPath;$('#destination-name').textContent=state.destination||'공유 폴더';$('#destination-button').title=state.destination||'공유 폴더';$('#destination-dialog').close();});
$('#picker-new-folder').addEventListener('click',()=>newFolder(state.pickerPath));
$$('[data-tab]').forEach(button=>button.addEventListener('click',()=>{state.tab=button.dataset.tab;$$('[data-tab]').forEach(el=>{el.classList.toggle('active',el===button);if(el===button)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});$('#share-view').hidden=state.tab!=='share';$('#explorer-view').hidden=state.tab!=='explorer';if(state.tab==='explorer')renderExplorer();}));
await refresh();
setInterval(()=>{if(!document.hidden&&!state.uploading)refresh(true);},5000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true);});
