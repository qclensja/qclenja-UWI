/* ===== GitHub storage: keeps all QCLens data in a PRIVATE GitHub repository ===== */
let ghMem=null;
const GHK='ljqc.gh';
function ghLoad(){try{const s=localStorage.getItem(GHK);if(s)return JSON.parse(s)}catch(e){}return ghMem||{}}
let GH=ghLoad();
function ghSaveCfg(){ghMem=GH;try{localStorage.setItem(GHK,JSON.stringify(GH))}catch(e){}}
const ghOn=()=>!!(GH.on&&GH.token&&GH.owner&&GH.repo);
const GHS={st:'idle',msg:'',sha:null,last:'',busy:false,pending:false,timer:null,lastHash:null,defer:false};
const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.keys(v).sort().reduce((o,k)=>(o[k]=canon(v[k]),o),{}):v;
const ghStrip=o=>{const c={...o};delete c.tab;return c};
const ghHash=o=>JSON.stringify(canon(ghStrip(o)));
function b64enc(t){const b=new TextEncoder().encode(t);let s='';for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s)}
function b64dec(t){const s=atob(t.replace(/\s/g,'')),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return new TextDecoder().decode(b)}
async function ghApi(path,opt){
  opt=opt||{};
  return fetch('https://api.github.com/repos/'+encodeURIComponent(GH.owner)+'/'+encodeURIComponent(GH.repo)+path,{method:opt.method||'GET',cache:'no-store',
    headers:{Authorization:'Bearer '+GH.token,Accept:opt.accept||'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(opt.body?{'Content-Type':'application/json'}:{})},body:opt.body?JSON.stringify(opt.body):undefined});
}
const ghFile=()=>'/contents/'+GH.path.split('/').map(encodeURIComponent).join('/');
/* checks the token, that it can write, and that the repository is private */
async function ghCheck(){
  let r;try{r=await ghApi('')}catch(e){throw new Error('Could not reach GitHub. Check your connection. (If you opened QCLens inside claude.ai, run it from your GitHub Pages address instead.)')}
  if(r.status===401)throw new Error('GitHub rejected the token. Check that it was copied in full and has not expired.');
  if(r.status===404||r.status===403)throw new Error('Repository not found, or the token has no access to it. The token must be limited to this repository with Contents: Read and write.');
  if(!r.ok)throw new Error('GitHub returned '+r.status+'.');
  const j=await r.json();
  if(!j.private)throw new Error('This repository is public. QCLens stores lab results and password hashes, so it will only sync to a PRIVATE repository. Create a private repository (for example qclens-data) and use that one.');
  if(j.permissions&&!j.permissions.push)throw new Error('The token can read this repository but not write to it. Give it Contents: Read and write.');
  if(!GH.branch)GH.branch=j.default_branch||'main';
  return j;
}
async function ghPull(){
  const q='?ref='+encodeURIComponent(GH.branch||'main');
  const r=await ghApi(ghFile()+q);
  if(r.status===404)return {exists:false};
  if(!r.ok)throw new Error('GitHub returned '+r.status+' while reading the data file.');
  const j=await r.json();let text;
  if(j.content&&j.encoding==='base64')text=b64dec(j.content);
  else{const r2=await ghApi(ghFile()+q,{accept:'application/vnd.github.raw+json'});if(!r2.ok)throw new Error('GitHub returned '+r2.status+' while reading the data file.');text=await r2.text()}
  return {exists:true,sha:j.sha,data:JSON.parse(text)};
}
async function ghPush(){
  const body={message:'QCLens data '+new Date().toISOString(),content:b64enc(JSON.stringify(ghStrip(S))),branch:GH.branch||'main'};
  if(GHS.sha)body.sha=GHS.sha;
  const r=await ghApi(ghFile(),{method:'PUT',body});
  if(r.status===409||r.status===422)return 'conflict';
  if(!r.ok)throw new Error('GitHub returned '+r.status+' while saving. Check that the token can write to the repository.');
  const j=await r.json();GHS.sha=j.content&&j.content.sha||GHS.sha;return 'ok';
}
/* union of local and remote records; local wins on ties, deleted records stay deleted */
function mergeStates(L,R){
  const tomb=new Set([...(L.tomb||[]),...(R.tomb||[])]),out=JSON.parse(JSON.stringify(L));
  const by=(a,b,pick)=>{const m=new Map();(b||[]).forEach(x=>m.set(x.id,x));(a||[]).forEach(x=>m.set(x.id,m.has(x.id)&&pick?pick(x,m.get(x.id)):x));return [...m.values()].filter(x=>!tomb.has(x.id))};
  const newer=(a,b)=>((a.upd||a).at||'')>=((b.upd||b).at||'')?a:b;
  out.users=by(L.users,R.users);out.depts=by(L.depts,R.depts);out.audit=by(L.audit,R.audit).sort((x,y)=>x.at<y.at?-1:x.at>y.at?1:0);
  out.est=by(L.est,R.est,(a,b)=>b.runs&&a.runs&&b.runs.length>a.runs.length?b:a);
  out.analytes=by(L.analytes,R.analytes,(a,b)=>b.targets.length>a.targets.length?b:a);
  const ok=new Set(out.analytes.map(a=>a.id));
  out.results=by(L.results,R.results,newer).filter(r=>ok.has(r.aid));
  const sk=new Map();(R.skips||[]).concat(L.skips||[]).forEach(s=>sk.set(s.aid+'|'+s.date,s));out.skips=[...sk.values()].filter(s=>ok.has(s.aid));
  out.setup=(L.setup&&L.setup.done)||!(R.setup&&R.setup.done)?L.setup:JSON.parse(JSON.stringify(R.setup));
  out.tomb=[...tomb];
  return out;
}
const tomb=(...ids)=>{S.tomb=S.tomb||[];ids.forEach(i=>{if(i&&!S.tomb.includes(i))S.tomb.push(i)})};
function ghAdopt(M){
  M.tab=S.tab;S=M;if(CU)CU=S.users.find(u=>u.id===CU.id&&u.active!==false)||null;
  try{mem=JSON.stringify(S);localStorage.setItem(KEY,mem)}catch(e){}
  const a=document.activeElement,typing=a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
  if(typing||UI.modal){GHS.defer=true}else render();
}
async function ghSync(){
  if(!ghOn())return;
  if(GHS.busy){GHS.pending=true;return}
  GHS.busy=true;GHS.st='syncing';ghPaint();
  try{
    for(let i=0;i<3;i++){
      const rem=await ghPull();let remoteH=null;
      if(rem.exists){
        GHS.sha=rem.sha;const R=norm(rem.data);remoteH=ghHash(R);
        const M=norm(mergeStates(S,R));
        if(ghHash(M)!==ghHash(S))ghAdopt(M);
      }else GHS.sha=null;
      if(remoteH!==null&&ghHash(S)===remoteH){break}
      const res=await ghPush();if(res==='ok')break;
    }
    GHS.lastHash=ghHash(S);GHS.st='ok';GHS.msg='';GHS.last=new Date().toISOString();
  }catch(e){GHS.st='err';GHS.msg=(e&&e.message)||'Sync failed.'}
  finally{GHS.busy=false;ghPaint();if(GHS.pending){GHS.pending=false;ghQueue()}}
}
function ghQueue(){
  if(!ghOn())return;
  if(GHS.lastHash!==null&&ghHash(S)===GHS.lastHash)return;
  clearTimeout(GHS.timer);GHS.timer=setTimeout(ghSync,2500);GHS.st=GHS.st==='err'?'err':'pending';ghPaint();
}
function ghPaint(){const e=document.getElementById('ghstatus');if(e)e.innerHTML=ghStatusHtml()}
function ghStatusHtml(){
  if(!ghOn())return '<span class="chip">Not connected</span>';
  const t=GHS.last?' · last saved '+fmtTs(GHS.last):'';
  const c=GHS.st==='err'?'<span class="chip bad">Not saved</span>':GHS.st==='syncing'?'<span class="chip warn">Saving…</span>':GHS.st==='pending'?'<span class="chip warn">Changes waiting</span>':'<span class="chip good">Saved to GitHub</span>';
  return c+' <span class="small muted">'+esc(GH.owner+'/'+GH.repo)+t+'</span>'+(GHS.msg?'<div class="small" style="color:var(--bad);margin-top:4px">'+esc(GHS.msg)+'</div>':'');
}
function ghBoot(){
  if(!ghOn())return;
  ghSync();
  setInterval(()=>{if(ghOn()&&!GHS.busy&&document.visibilityState==='visible')ghSync()},60000);
  document.addEventListener('focusout',()=>{if(GHS.defer){setTimeout(()=>{const a=document.activeElement;if(GHS.defer&&!UI.modal&&!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))){GHS.defer=false;render()}},50)}});
}
/* ----- connect form (sign-in screen and Setup) ----- */
function ghForm(){
  const D=UI.ghDraft||GH;
  return `<form data-form="ghconn" class="stack" autocomplete="off">
   <div class="grid2"><label class="f">GitHub user or organisation<input type="text" id="gh-owner" value="${esc(D.owner||'')}" autocapitalize="none" placeholder="qclensja"></label>
   <label class="f">Private data repository<input type="text" id="gh-repo" value="${esc(D.repo||'')}" autocapitalize="none" placeholder="qclens-data"></label>
   <label class="f">Branch<input type="text" id="gh-branch" value="${esc(D.branch||'')}" placeholder="main (default)"></label>
   <label class="f">Data file<input type="text" id="gh-path" value="${esc(D.path||'qclens-data.json')}"></label></div>
   <label class="f">Access token<input type="password" id="gh-token" autocomplete="off" placeholder="${GH.token?'Saved on this device. Paste a new one to replace it.':'github_pat_…'}"></label>
   ${UI.ghMsg?`<p class="amsg" role="alert">${esc(UI.ghMsg)}</p>`:''}
   <button class="btn primary" type="submit">${ghOn()?'Save and sync':'Connect and test'}</button></form>`;
}
async function doGhConnect(){
  const g=id=>(document.getElementById(id)||{value:''}).value.trim();
  const n={owner:g('gh-owner'),repo:g('gh-repo').replace(/\.git$/,''),branch:g('gh-branch'),path:g('gh-path')||'qclens-data.json',token:g('gh-token')||GH.token||''};
  if(!n.owner||!n.repo||!n.token){UI.ghMsg='Enter the owner, repository and access token.';UI.ghDraft={...n,token:''};return}
  const old=GH;GH={...n,on:false};
  try{await ghCheck()}catch(e){GH=old;UI.ghMsg=e.message;UI.ghDraft={...n,token:''};return}
  GH.on=true;ghSaveCfg();UI.ghMsg='';UI.ghDraft=null;GHS.sha=null;GHS.lastHash=null;GHS.st='idle';
  if(S.users.length||S.analytes.length)audit('GitHub storage connected',GH.owner+'/'+GH.repo+' ('+GH.path+')');
  await ghSync();
  if(GHS.st==='err'){UI.ghMsg=GHS.msg;return}
  ghBoot2();toast('Connected. Your data is saved to '+GH.owner+'/'+GH.repo+'.');
  if(UI.auth==='gh')UI.auth='';
}
let ghPoll=null;
function ghBoot2(){if(ghPoll)return;ghPoll=setInterval(()=>{if(ghOn()&&!GHS.busy&&document.visibilityState==='visible')ghSync()},60000)}
function renderGithub(){
  return `<div class="panel stack"><div><h3>GitHub storage</h3><p class="small muted" style="margin:4px 0 0;max-width:80ch">Saves all QCLens data (setup, QC results, users, audit log) to a <b>private</b> GitHub repository, so it is shared by every device and survives clearing the browser. Changes are saved a few seconds after you make them, and other devices pick them up within a minute.</p></div>
   <div id="ghstatus">${ghStatusHtml()}</div>
   ${ghOn()?`<div class="row"><button class="btn" data-act="ghsync">Sync now</button><button class="btn danger" data-act="ghoff">Disconnect this device</button></div>`:''}
   <details${ghOn()?'':' open'}><summary style="cursor:pointer"><b>${ghOn()?'Change connection settings':'Connect to GitHub'}</b></summary><div style="margin-top:10px">${ghForm()}
   <div class="small muted" style="margin-top:10px;max-width:80ch"><b>Set up once:</b> 1) On GitHub create a new <b>private</b> repository (for example <code>qclens-data</code>, add a README so it is not empty). 2) Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate. Repository access: <i>Only select repositories</i> and pick that one. Permissions: <i>Contents → Read and write</i>. 3) Paste the token above. Each device (and each person who signs in on it) needs the same token once, on the sign-in screen. Anyone holding the token can read and change the stored data directly, so share it only with people you trust with the lab's records.</div></div></details></div>`;
}
