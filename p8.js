/* ===== GitHub storage: keeps all QCLens data in a PRIVATE GitHub repository ===== */
let ghMem=null;
const GHK='ljqc.gh';
function ghLoad(){try{const s=localStorage.getItem(GHK);if(s)return JSON.parse(s)}catch(e){}return ghMem||{}}
let GH=ghLoad();
function ghSaveCfg(){ghMem=GH;try{localStorage.setItem(GHK,JSON.stringify(GH))}catch(e){}}
let credMem=null,CRED=null;
try{const s=sessionStorage.getItem('ljqc.cred');CRED=s?JSON.parse(s):null}catch(e){}
function setCred(c){CRED=c;credMem=c;try{c?sessionStorage.setItem('ljqc.cred',JSON.stringify(c)):sessionStorage.removeItem('ljqc.cred')}catch(e){}}
const svcOn=()=>!!(GH.on&&GH.svc);
const ghOn=()=>!!(GH.on&&(GH.svc||(GH.token&&GH.owner&&GH.repo)));
const ghReady=()=>ghOn()&&(!GH.svc||!!CRED);
try{const m=/[#&]svc=([^&]+)/.exec(location.hash||'');if(m&&!GH.svc){GH={svc:decodeURIComponent(m[1]),on:true};ghSaveCfg();history.replaceState(null,'',location.pathname+location.search)}}catch(e){}
try{if(location.hash==='#first-setup'){UI.setupNew=true;history.replaceState(null,'',location.pathname+location.search)}}catch(e){}
/* shared default: config.json next to the page ({"svc":"https://..."}) connects every new device automatically */
if(!GH.svc&&!(GH.token&&GH.repo)&&/^https?:/.test(location.protocol)){
  UI.cfgWait=true;
  const ac=typeof AbortController!=='undefined'?new AbortController():null,tm=setTimeout(()=>ac&&ac.abort(),4000);
  fetch('config.json',{cache:'no-store',signal:ac?ac.signal:undefined}).then(r=>r.ok?r.json():null).then(j=>{
    if(j&&typeof j.svc==='string'&&/^(https:\/\/|http:\/\/localhost)[^\s/]+/.test(j.svc)&&!GH.svc){GH={svc:j.svc.replace(/\/+$/,''),on:true};ghSaveCfg()}
  }).catch(()=>{}).finally(()=>{clearTimeout(tm);UI.cfgWait=false;try{render()}catch(e){}});
}
function pwQueue(id,rec){if(!svcOn())return;GH.pwq=(GH.pwq||[]).filter(x=>x.id!==id);GH.pwq.push({id,pw:rec});ghSaveCfg()}
async function svcCall(path,body,auth){
  const b={...(body||{})};if(auth!==false&&CRED){b.u=CRED.u;b.hash=CRED.hash}
  let r;try{r=await fetch(GH.svc.replace(/\/+$/,'')+path,{method:'POST',cache:'no-store',headers:{'Content-Type':'text/plain'},body:JSON.stringify(b)})}catch(e){throw new Error('Could not reach the QCLens sync service. Check your connection and the service address.')}
  let j={};try{j=await r.json()}catch(e){}
  if(r.status===409)return {conflict:true};
  if(r.status===401){const e=new Error(j.error||'Sign-in required.');e.code=401;throw e}
  if(!r.ok)throw new Error(j.error||('The sync service returned '+r.status+'.'));
  return j;
}
const GHS={st:'idle',msg:'',sha:null,last:'',busy:false,pending:false,timer:null,lastHash:null,defer:false};
const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.keys(v).sort().reduce((o,k)=>(o[k]=canon(v[k]),o),{}):v;
const ghStrip=o=>{const c={...o};delete c.tab;if(svcOn())c.users=(c.users||[]).map(u=>{const x={...u};delete x.pw;delete x.rec;delete x.fails;delete x.lockUntil;return x});return c};
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
  if(GH.svc){const j=await svcCall('/pull');return j.empty?{exists:!!j.data,empty:true,sha:j.sha,data:j.data}:{exists:true,sha:j.sha,data:j.data,me:j.me}}
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
  if(GH.svc){
    const j=await svcCall('/push',{data:GHS.boot?(()=>{const c={...S};delete c.tab;return c})():ghStrip(S),sha:GHS.sha,pwset:GH.pwq||[],boot:!!GHS.boot});
    if(j.conflict)return 'conflict';
    GHS.sha=j.sha||GHS.sha;GHS.boot=false;GH.pwq=[];ghSaveCfg();if(GHS.newCred){setCred(GHS.newCred);GHS.newCred=null}return 'ok';
  }
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
  const keepPw=(a,b)=>{const w=(b.mod||'')>(a.mod||'')?b:a,o=w===a?b:a,x={...w};if(!x.pw&&o.pw)x.pw=o.pw;if(!x.rec&&o.rec)x.rec=o.rec;return x};
  out.users=by(L.users,R.users,keepPw);out.requests=by(L.requests,R.requests,(a,b)=>(b.status&&b.status!=='pending'&&(!a.status||a.status==='pending'))?b:a);out.depts=by(L.depts,R.depts,(a,b)=>((b.modAt||'')>(a.modAt||'')?b:a));out.audit=by(L.audit,R.audit).sort((x,y)=>x.at<y.at?-1:x.at>y.at?1:0);
  const newerMod=(a,b)=>{const am=a.modAt||'',bm=b.modAt||'';return bm>am?b:am>bm?a:null};
  out.est=by(L.est,R.est,(a,b)=>newerMod(a,b)||(b.runs&&a.runs&&b.runs.length>a.runs.length?b:a));
  out.materials=by(L.materials,R.materials,(a,b)=>newerMod(a,b)||a);
  out.analytes=by(L.analytes,R.analytes,(a,b)=>newerMod(a,b)||(b.targets.length>a.targets.length?b:a));
  const ok=new Set(out.analytes.map(a=>a.id));
  const rst=r=>[r.at,(r.upd||{}).at,r.ov&&r.ov.at,r.ovAt].filter(Boolean).sort().pop()||'';
  out.results=by(L.results,R.results,(a,b)=>rst(b)>rst(a)?b:a).filter(r=>ok.has(r.aid));
  const sk=new Map();(R.skips||[]).concat(L.skips||[]).forEach(s=>sk.set(s.aid+'|'+s.date,s));out.skips=[...sk.values()].filter(s=>ok.has(s.aid));
  out.setup=(L.setup&&L.setup.done)||!(R.setup&&R.setup.done)?L.setup:JSON.parse(JSON.stringify(R.setup));
  if((R.rulesAt||'')>(L.rulesAt||'')){out.rules=R.rules||{};out.rulesAt=R.rulesAt}
  if((R.permsAt||'')>(L.permsAt||'')){out.perms=R.perms||{};out.permsAt=R.permsAt}
  out.drules={};out.drulesAt={};{const ids=new Set([...Object.keys(L.drulesAt||{}),...Object.keys(R.drulesAt||{}),...Object.keys(L.drules||{}),...Object.keys(R.drules||{})]);
   ids.forEach(id=>{const lr=(L.drulesAt||{})[id]||'',rr=(R.drulesAt||{})[id]||'',useR=rr>lr;const src=useR?R:L;if((src.drules||{})[id]!==undefined)out.drules[id]=src.drules[id];if(useR?rr:lr)out.drulesAt[id]=useR?rr:lr})}
  out.trash=by(L.trash,R.trash);out.tomb=[...tomb];
  if((R.rulesAt||'')>(L.rulesAt||'')){out.rules=R.rules||{};out.rulesAt=R.rulesAt}
  return out;
}
const tomb=(...ids)=>{S.tomb=S.tomb||[];ids.forEach(i=>{if(i&&!S.tomb.includes(i))S.tomb.push(i)})};
function ghAdopt(M){
  M.tab=S.tab;S=M;try{const id=S.setup.cur;if(id&&S.depts.some(d=>d.id===id))loadCtx(id)}catch(e){}if(CU)CU=S.users.find(u=>u.id===CU.id&&u.active!==false)||null;
  try{mem=JSON.stringify(S)}catch(e){}
  const a=document.activeElement,typing=a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
  if(typing||UI.modal){GHS.defer=true}else render();
}
async function ghSync(){
  if(!ghReady())return;
  if(GHS.busy){GHS.pending=true;return}
  GHS.busy=true;GHS.timer=null;GHS.st='syncing';ghPaint();
  try{
    for(let i=0;i<3;i++){
      const rem=await ghPull();let remoteH=null;
      if(rem.exists){
        GHS.sha=rem.sha;GHS.boot=!!rem.empty;if(rem.data){const R=norm(rem.data);remoteH=rem.empty?null:ghHash(R);
        const M=norm(mergeStates(S,R));
        if(ghHash(M)!==ghHash(S))ghAdopt(M)}
      }else{GHS.sha=null;GHS.boot=true}
      if(remoteH!==null&&ghHash(S)===remoteH){break}
      const res=await ghPush();if(res==='ok')break;
    }
    GHS.lastHash=ghHash(S);GHS.st='ok';GHS.msg='';GHS.last=new Date().toISOString();
    /* the data now lives on GitHub: drop the browser copy (it only holds changes not yet uploaded) */
    if(!GHS.pending&&!GHS.timer){try{localStorage.removeItem(KEY)}catch(e){}}
  }catch(e){GHS.st='err';GHS.msg=(e&&e.message)||'Sync failed.'}
  finally{GHS.busy=false;ghPaint();if(GHS.pending){GHS.pending=false;ghQueue()}}
}
function ghQueue(){
  if(!ghReady())return;
  if(GHS.lastHash!==null&&ghHash(S)===GHS.lastHash)return;
  clearTimeout(GHS.timer);GHS.timer=setTimeout(ghSync,2500);GHS.st=GHS.st==='err'?'err':'pending';ghPaint();
}
function ghPaint(){const e=document.getElementById('ghstatus');if(e)e.innerHTML=ghStatusHtml()}
function ghStatusHtml(){
  if(!ghOn())return '<span class="chip">Not connected</span>';
  const t=GHS.last?' · last saved '+fmtTs(GHS.last):'';
  const c=GHS.st==='err'?'<span class="chip bad">Not saved</span>':GHS.st==='syncing'?'<span class="chip warn">Saving…</span>':GHS.st==='pending'?'<span class="chip warn">Changes waiting</span>':'<span class="chip good">Saved to GitHub</span>';
  return c+' <span class="small muted">'+esc(GH.svc?GH.svc.replace(/^https:\/\//,''):GH.owner+'/'+GH.repo)+t+'</span>'+(GHS.msg?'<div class="small" style="color:var(--bad);margin-top:4px">'+esc(GHS.msg)+'</div>':'');
}
function ghBoot(){
  if(!ghOn())return;
  setInterval(()=>{if(ghReady()&&!GHS.busy&&document.visibilityState==='visible')ghSync()},60000);
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
  if(UI.auth==='gh'||UI.auth==='conn')UI.auth='';
}
let ghPoll=null;
function ghBoot2(){if(ghPoll)return;ghPoll=setInterval(()=>{if(ghReady()&&!GHS.busy&&document.visibilityState==='visible')ghSync()},60000)}
async function doSvcAdmin(){
  const url=(document.getElementById('sv-url')||{value:''}).value.trim().replace(/\/+$/,'');
  if(!/^(https:\/\/|http:\/\/localhost)[^\s/]+/.test(url)){UI.ghMsg='Enter the service address, starting with https://';return}
  if(!CU||!CU.pw){UI.ghMsg='Sign in again with your password on this device, then connect.';return}
  const old=GH;GH={svc:url,on:true,pwq:[]};
  try{await svcCall('/ping',{},false)}catch(e){GH=old;UI.ghMsg=e.message;return}
  setCred({u:CU.username,hash:CU.pw.hash,salt:CU.pw.salt});ghSaveCfg();GHS.sha=null;GHS.lastHash=null;GHS.st='idle';
  await ghSync();
  if(GHS.st==='err'){const m=GHS.msg;GH=old;ghSaveCfg();setCred(null);UI.ghMsg=m;return}
  ghBoot2();UI.ghMsg='';audit('Sync service connected',url,null,[]);save();toast('Connected. Your data is saved to the sync service.');
}
function renderGithub(){
  if(svcOn())return `<div class="panel stack"><div><h3>Cloud storage</h3><p class="small muted" style="margin:4px 0 0;max-width:80ch">All QCLens data is saved through the lab's sync service. Workers sign in with their own username and password from any device. They never need a GitHub token.</p></div>
   <div id="ghstatus">${ghStatusHtml()}</div>
   <div class="panelcard small"><div class="muted">Service</div><div class="mono" style="word-break:break-all">${esc(GH.svc)}</div></div>
   <div class="row"><button class="btn" data-act="ghsync">Sync now</button><button class="btn" data-act="svccopy">Copy link for new devices</button><button class="btn danger" data-act="svcdisc">Disconnect this device</button></div>
   <p class="small muted" style="margin:0;max-width:80ch">Send workers the link above. Opening it connects their device to the service; they then use Request access or sign in.</p>
   <div class="panelcard small"><b>Sign in with no connection step.</b> Add a file named <code>config.json</code> next to the page in the GitHub code repository (the same folder as <code>index.html</code>) containing:<div class="mono" style="margin:6px 0;word-break:break-all">{"svc":"${esc(GH.svc)}"}</div>Every new device that opens the page then connects by itself and shows the normal sign-in screen.</div></div>`;
  return `<div class="panel stack"><div><h3>Cloud storage</h3><p class="small muted" style="margin:4px 0 0;max-width:80ch">Saves all QCLens data (setup, QC results, users, audit log) to a <b>private</b> GitHub repository, so it is shared by every device and survives clearing the browser. </p></div>
   <div id="ghstatus">${ghStatusHtml()}</div>
   <details${ghOn()?'':' open'}><summary style="cursor:pointer"><b>Connect the sync service</b></summary><div style="margin-top:10px" class="stack">
    <p class="small muted" style="margin:0;max-width:80ch">A small free service (a Cloudflare Worker, in the <code>worker</code> folder of the code repository, with setup steps in its README) holds the GitHub token for you. Workers sign in with their own username and password on any device. Deploy it once, then paste its address here.</p>
    <form data-form="svcadmin" class="stack" autocomplete="off">${fld('sv-url','Sync service address','url','autocapitalize="none" placeholder="https://qclens-sync.your-name.workers.dev"')}${UI.ghMsg&&!UI.ghDraft?`<p class="amsg" role="alert">${esc(UI.ghMsg)}</p>`:''}<button class="btn primary" type="submit">Connect and upload data</button></form></div></details>
</div>`;
}
