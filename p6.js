/* ===== Accounts, sessions and audit trail ===== */
const IDLE_MS=30*60*1000;
let memSess=null,SESS=null,CU=null;
const isAdmin=()=>!!CU&&CU.role==='admin';
const isSup=()=>!!CU&&CU.role==='sup';
const PERMDEF=[
 {k:'v_charts',g:'View',l:'Charts',tech:1,sup:1,cons:1},{k:'v_alerts',g:'View',l:'QC alerts',tech:1,sup:1,cons:1},{k:'v_limits',g:'View',l:'Establish limits',tech:1,sup:1,cons:1},{k:'v_rules',g:'View',l:'Westgard rules',tech:1,sup:1,cons:1},
 {k:'v_setup',g:'View',l:'Setup (their departments only)',tech:0,sup:1,cons:0},{k:'v_audit',g:'View',l:'Audit log (their departments only)',tech:0,sup:1,cons:1},
 {k:'e_qc',g:'Edit',l:'Enter and edit QC values, mark QC not performed',tech:1,sup:1,cons:0},{k:'e_override',g:'Edit',l:'Resolve violations with a comment, add notes, reopen violations',tech:1,sup:1,cons:1},
 {k:'e_lot',g:'Edit',l:'Lot change and adjust mean and SD',tech:1,sup:1,cons:0},{k:'e_limits',g:'Edit',l:'Insert established limits into an analyte',tech:1,sup:1,cons:0},
 {k:'e_setup',g:'Edit',l:'Change Setup: analysers, analytes, panels, schedules',tech:0,sup:1,cons:0},{k:'e_export',g:'Edit',l:'Export charts to Excel',tech:1,sup:1,cons:1}];
const perm=k=>{if(!CU)return false;if(CU.role==='admin')return true;const d=PERMDEF.find(x=>x.k===k);if(!d)return false;const r=CU.role==='sup'?'sup':CU.role==='cons'?'cons':'tech',o=S.perms&&S.perms[r];return o&&o[k]!==undefined?!!o[k]:!!d[r]};
const permFor=(r,k)=>{const d=PERMDEF.find(x=>x.k===k),o=S.perms&&S.perms[r];return o&&o[k]!==undefined?!!o[k]:!!d[r]};
const PROLES=[['tech','Technologist'],['sup','Supervisory technologist'],['cons','Consultant / Resident']];
const canSetup=()=>perm('v_setup');
const canAudit=()=>isAdmin()||perm('v_audit');
const roleName=r=>r==='admin'?'Administrator':r==='sup'?'Supervisory technologist':r==='cons'?'Consultant / Resident':'Technologist';
const scoped=r=>r!=='admin';
const nowIso=()=>new Date().toISOString();
const fmtTs=iso=>{if(!iso)return '';const d=new Date(iso);return isNaN(d)?'':pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes())};
const byLine=r=>(r.byName?'Entered by '+esc(r.byName)+' · '+fmtTs(r.at):'Entered before sign-in was added')+(r.upd?' · edited by '+esc(r.upd.byName)+' · '+fmtTs(r.upd.at):'');
const byShort=r=>r.byName?esc(r.byName)+' · '+fmtTs(r.upd?r.upd.at:r.at):'';
function stampNow(){return {by:CU?CU.id:null,byName:CU?CU.name:'',at:nowIso()}}
function audit(action,detail,actor,depts){
  const u=actor||CU||{};
  let dp=depts==null?(S.setup&&S.setup.cur?[S.setup.cur]:[]):[].concat(depts);
  S.audit.push({id:uid(),at:nowIso(),by:u.id||null,byName:u.name||'',action,detail:String(detail||'').slice(0,600),depts:dp});
  if(S.audit.length>8000)S.audit.splice(0,S.audit.length-8000);
}
/* session */
function readSess(){try{const s=sessionStorage.getItem('ljqc.sess');if(s)return JSON.parse(s)}catch(e){}return memSess}
function writeSess(){memSess=SESS;try{if(SESS)sessionStorage.setItem('ljqc.sess',JSON.stringify(SESS));else sessionStorage.removeItem('ljqc.sess')}catch(e){}}
function restoreSess(){
  SESS=readSess();CU=null;
  if(SESS&&Date.now()-SESS.last<IDLE_MS)CU=S.users.find(u=>u.id===SESS.uid&&u.active!==false)||null;
  if(CU&&svcOn()&&!CRED)CU=null;
  if(!CU){SESS=null;writeSess()}
}
function signIn(u){SESS={uid:u.id,last:Date.now()};writeSess();CU=u;u.lastLogin=nowIso();UI.authMsg='';UI.auth='';S.tab='today'}
function signOut(auto){
  if(CU){audit(auto?'Auto sign-out':'Sign out',auto?'Signed out after 30 minutes of inactivity':'');save()}
  SESS=null;CU=null;if(svcOn())setCred(null);writeSess();UI.modal=null;UI.editing=false;UI.authMsg=auto?'You were signed out after 30 minutes of inactivity.':'';render();
}
let lastTouch=0;
function touch(){if(!SESS)return;const n=Date.now();if(n-lastTouch>5000){lastTouch=n;SESS.last=n;writeSess()}}
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,touch,true));
setInterval(()=>{if(CU&&SESS&&Date.now()-SESS.last>IDLE_MS)signOut(true)},30000);
/* hashing */
const b64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function hashPw(pw,saltB64){
  const salt=saltB64?unb64(saltB64):crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:150000},key,256);
  return {salt:b64(salt),hash:b64(bits)};
}
const checkPw=async(pw,rec)=>rec&&(await hashPw(pw,rec.salt)).hash===rec.hash;
function genCode(){
  const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789',r=crypto.getRandomValues(new Uint8Array(12));
  const c=[...r].map(x=>A[x%A.length]).join('');return c.slice(0,4)+'-'+c.slice(4,8)+'-'+c.slice(8);
}
function genPw(){
  const A='abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789',r=crypto.getRandomValues(new Uint8Array(10));
  return [...r].map(x=>A[x%A.length]).join('');
}
const pwProblem=(p,p2)=>p.length<8?'Use at least 8 characters for the password.':(p2!==undefined&&p!==p2)?'The two passwords do not match.':'';
const gv=id=>{const e=document.getElementById(id);return e?e.value:''};
/* ===== screens ===== */
const shell=inner=>`<div class="auth"><div class="authcard"><img class="logo big" src="${LOGO}" alt="QCLens logo"><h1 class="sr">QCLens</h1>${inner}</div></div>`;
const amsg=()=>UI.authMsg?`<p class="amsg" role="alert">${esc(UI.authMsg)}</p>`:'';
const fld=(id,label,type,extra)=>`<label class="f">${label}<input id="${id}" type="${type}" ${extra||''}></label>`;
function connScreen(){
  const m=UI.ghMsg?`<p class="amsg" role="alert">${esc(UI.ghMsg)}</p>`:'';
  return `<div><h2>Connect this device</h2><p class="muted" style="margin:6px 0 0">Load your laboratory's data on this device. Enter the service address your administrator gave you, then sign in with your own username and password. No GitHub token is needed.</p></div>
   ${m}
   <div class="panelcard stack"><h3>Sync service address</h3><p class="small muted" style="margin:0">Recommended. The address your administrator gave you. No GitHub token needed.</p>
    <form data-form="svcconn" class="stack" autocomplete="off">${fld('sv-url','Service address','url','autocapitalize="none" placeholder="https://qclens-sync.example.workers.dev" value="'+esc(GH.svc||'')+'"')}<button class="btn primary" type="submit">Connect</button></form></div>
   <button class="btn" type="button" data-act="backlogin">Back</button>`;
}
function authGate(){
  if(UI.cfgWait&&!CU)return shell('<p class="muted" style="text-align:center">Loading…</p>');
  if(UI.recCode)return shell(`<div><h2>Save your recovery code</h2><p class="muted" style="margin:6px 0 0">If you forget your password, this code lets an administrator reset it. It is shown once. Keep it somewhere safe, away from this computer.</p></div>
    <div class="reccode" id="reccode">${esc(UI.recCode)}</div>
    <div class="row"><button class="btn" type="button" data-act="copyrec">Copy code</button><button class="btn primary" type="button" data-act="recdone">I have saved it</button></div>`);
  if((UI.auth==='gh'||UI.auth==='svc'||UI.auth==='conn')&&!CU)return shell(connScreen());
  if(UI.auth==='request'&&!CU){
    if(UI.reqDone)return shell(`<div><h2>Request sent</h2><p class="muted" style="margin:6px 0 0">Thank you. An administrator will review your request. Once approved, they will email a temporary password to ${esc(UI.rqEmail||'your email address')}. You can then sign in and choose your own password.</p></div><button class="btn primary" type="button" data-act="backlogin">Back to sign in</button>`);
    return shell(`<div><h2>Request access</h2><p class="muted" style="margin:6px 0 0">Enter your full name and work email address. When an administrator approves your request, a temporary password is sent to that email address.</p></div>
    <form data-form="reqform" class="stack">${fld('rq-name','Full name','text','autocomplete="name" value="'+esc(UI.rqName||'')+'"')}${fld('rq-email','Email address','email','autocapitalize="none" autocomplete="email" value="'+esc(UI.rqEmail||'')+'"')}${amsg()}<button class="btn primary" type="submit">Send request</button><button class="btn" type="button" data-act="backlogin">Back to sign in</button></form>`);
  }
  if(!S.users.length&&!svcOn()&&UI.setupNew)return shell(`<div><h2>Create the administrator account</h2><p class="muted" style="margin:6px 0 0">This is the first sign-in. The administrator sets up the lab, adds colleagues and can review the audit log.</p></div>
    <form data-form="admin" class="stack" autocomplete="off">${fld('ca-name','Full name','text','autocomplete="name" value="'+esc(UI.authName||'')+'"')}${fld('ca-user','Username','text','autocapitalize="none" autocomplete="username" value="'+esc(UI.authUser||'')+'"')}${fld('ca-pass','Password (8 or more characters)','password','autocomplete="new-password"')}${fld('ca-pass2','Confirm password','password','autocomplete="new-password"')}${amsg()}
    <button class="btn primary" type="submit">Create account and sign in</button></form>`);
  if(!CU){
    if(UI.auth==='forgot')return shell(`<div><h2>Reset password</h2><p class="muted" style="margin:6px 0 0">Administrators can reset their own password with the recovery code from when the account was created. Other users should ask an administrator.</p></div>
      <form data-form="forgot" class="stack">${fld('fg-user','Username','text','autocapitalize="none" value="'+esc(UI.authUser||'')+'"')}${fld('fg-code','Recovery code','text','autocapitalize="characters" placeholder="XXXX-XXXX-XXXX" value="'+esc(UI.authCode||'')+'"')}${fld('fg-pass','New password (8 or more characters)','password','autocomplete="new-password"')}${fld('fg-pass2','Confirm new password','password','autocomplete="new-password"')}${amsg()}
      <button class="btn primary" type="submit">Reset password</button><button class="btn" type="button" data-act="backlogin">Back to sign in</button></form>`);
    return shell(`<div><h2>Sign in</h2><p class="muted" style="margin:6px 0 0">Levey-Jennings QC for the clinical laboratory</p></div>
      <form data-form="login" class="stack">${fld('li-user','Username or email','text','autocapitalize="none" autocomplete="username" value="'+esc(UI.authUser||'')+'"')}${fld('li-pass','Password','password','autocomplete="current-password"')}${amsg()}
      <button class="btn primary" type="submit">Sign in</button><button class="btn" type="button" data-act="forgot">Forgot password?</button></form>
      ${S.users.length||svcOn()?'<div class="stack" style="gap:6px;margin-top:4px"><span class="small muted" style="text-align:center">New here?</span><button class="btn green" type="button" data-act="reqopen">Request access</button></div>':'<p class="small muted" style="margin:12px 0 0">This device is not connected to a laboratory yet. Open the QCLens link your administrator sent you, then sign in.</p>'}`);
  }
  if(CU.mustChange)return shell(`<div><h2>Choose a new password</h2><p class="muted" style="margin:6px 0 0">Hello ${esc(CU.name)}. Your password was set by an administrator. Choose your own before you continue.</p></div>
    <form data-form="forcepw" class="stack">${fld('cp-pass','New password (8 or more characters)','password','autocomplete="new-password"')}${fld('cp-pass2','Confirm new password','password','autocomplete="new-password"')}${amsg()}
    <button class="btn primary" type="submit">Save password</button><button class="btn" type="button" data-act="signout">Sign out</button></form>`);
  if(!isAdmin()&&!S.setup.done)return shell(`<div><h2>Setup is not finished</h2><p class="muted" style="margin:6px 0 0">Hello ${esc(CU.name)}. An administrator needs to finish setting up the lab before QC can be entered. Please ask them to sign in.</p></div><button class="btn" type="button" data-act="signout">Sign out</button>`);
  return '';
}
function userBar(){
  return `<div class="userbar"><span class="who"><b>${esc(CU.name)}</b> <span class="chip${CU.role==='admin'?' acc':''}">${roleName(CU.role)}</span></span>
   <button class="btn sm" data-act="acct">Account</button><button class="btn sm" data-act="signout">Sign out</button></div>`;
}
function renderAcctModal(){
  return `<div class="modalbg" data-act="mclose"><div class="modal" role="dialog" aria-modal="true" aria-label="Account" data-stop>
   <h2>Your account</h2><p class="muted" style="margin:4px 0 12px">${esc(CU.name)} · ${esc(CU.username)}</p>
   <form data-form="acct" class="stack">${fld('ac-cur','Current password','password','autocomplete="current-password"')}${fld('ac-new','New password (8 or more characters)','password','autocomplete="new-password"')}${fld('ac-new2','Confirm new password','password','autocomplete="new-password"')}
   <p id="ac-err" class="amsg" role="alert" ${UI.acctMsg?'':'hidden'}>${esc(UI.acctMsg||'')}</p>
   <div class="row" style="justify-content:space-between"><div class="row">${CU.role==='admin'?'<button class="btn sm" type="button" data-act="newrec">New recovery code</button>':''}</div><div class="row"><button class="btn" type="button" data-act="mclose">Close</button><button class="btn primary" type="submit">Change password</button></div></div></form></div></div>`;
}
/* ===== form handlers ===== */
async function doAdmin(){
  const name=gv('ca-name').trim(),un=gv('ca-user').trim().toLowerCase(),p=gv('ca-pass'),p2=gv('ca-pass2');
  UI.authUser=un;UI.authName=name;
  if(!name)return UI.authMsg='Enter your full name.';
  if(!/^[a-z0-9._-]{3,}$/.test(un))return UI.authMsg='Username: at least 3 letters, numbers, dots, dashes or underscores.';
  const pr=pwProblem(p,p2);if(pr)return UI.authMsg=pr;
  const code=genCode(),u={id:uid(),username:un,name,role:'admin',active:true,mustChange:false,created:nowIso(),pw:await hashPw(p),rec:await hashPw(code.replace(/-/g,''))};
  S.users.push(u);signIn(u);audit('Account created','Administrator account created',u);audit('Sign in','',u);save();UI.recCode=code;
}
async function doSvcLogin(un,pw){
  const bad='Username or password is incorrect.';
  let salt;try{salt=(await svcCall('/salt',{u:un},false)).salt}catch(e){return UI.authMsg=e.message}
  const hash=(await hashPw(pw,salt)).hash;setCred({u:un,hash,salt});
  let j;try{j=await svcCall('/pull')}catch(e){setCred(null);return UI.authMsg=e.code===401?bad:e.message}
  if(j.empty||!j.data){setCred(null);return UI.authMsg='This laboratory has no data on the sync service yet. The administrator needs to connect it first.'}
  S=norm(mergeStates(S,norm(j.data)));S.tab='today';
  const u=S.users.find(x=>x.id===j.me);if(!u){setCred(null);return UI.authMsg=bad}
  GHS.sha=j.sha;GHS.lastHash=null;GHS.boot=false;
  signIn(u);audit('Sign in','',u);save();
}
async function doLogin(){
  const un=gv('li-user').trim().toLowerCase(),pw=gv('li-pass');UI.authUser=un;
  if(svcOn())return doSvcLogin(un,pw);
  const u=S.users.find(x=>x.username===un||String(x.email||'').toLowerCase()===un),bad='Username or password is incorrect.';
  if(!u||u.active===false){audit('Failed sign-in','Unknown or disabled username "'+un+'"',{id:null,name:un});save();return UI.authMsg=bad}
  if(u.lockUntil&&Date.now()<u.lockUntil)return UI.authMsg='Too many attempts. Wait a minute and try again.';
  if(!await checkPw(pw,u.pw)){u.fails=(u.fails||0)+1;if(u.fails>=5){u.lockUntil=Date.now()+60000;u.fails=0}audit('Failed sign-in','Wrong password',u);save();return UI.authMsg=bad}
  u.fails=0;u.lockUntil=0;signIn(u);audit('Sign in','',u);save();
}
async function doForgot(){
  if(svcOn())return UI.authMsg='Password resets are done by an administrator. Ask them to set a temporary password for you.';
  const un=gv('fg-user').trim().toLowerCase(),code=gv('fg-code').toUpperCase().replace(/[^A-Z0-9]/g,''),p=gv('fg-pass'),p2=gv('fg-pass2');UI.authUser=un;UI.authCode=gv('fg-code');
  const pr=pwProblem(p,p2);if(pr)return UI.authMsg=pr;
  const u=S.users.find(x=>x.username===un&&x.role==='admin'&&x.rec&&x.active!==false);
  if(!u||!await checkPw(code,u.rec)){audit('Failed password reset','Wrong username or recovery code "'+un+'"',{id:null,name:un});save();return UI.authMsg='The username and recovery code do not match.'}
  const nc=genCode();u.pw=await hashPw(p);u.rec=await hashPw(nc.replace(/-/g,''));u.mustChange=false;u.fails=0;u.lockUntil=0;
  signIn(u);audit('Password reset','Reset with recovery code',u);save();UI.recCode=nc;
}
async function doForce(){
  const p=gv('cp-pass'),pr=pwProblem(p,gv('cp-pass2'));if(pr)return UI.authMsg=pr;
  const old=CU.pw,oldM=CU.mustChange;CU.pw=await hashPw(p);CU.mustChange=false;CU.mod=nowIso();
  if(svcOn()){pwQueue(CU.id,CU.pw);GHS.newCred={u:CRED.u,hash:CU.pw.hash,salt:CU.pw.salt};audit('Password changed','Chose a new password after reset');save();await ghSync();
    if(GHS.st==='err'){CU.pw=old;CU.mustChange=oldM;GH.pwq=(GH.pwq||[]).filter(x=>x.id!==CU.id);GHS.newCred=null;ghSaveCfg();return UI.authMsg='Could not save your new password to the sync service. '+GHS.msg}
    UI.authMsg='';return}
  audit('Password changed','Chose a new password after reset');save();UI.authMsg='';
}
async function doAcct(){
  const p=gv('ac-new'),pr=pwProblem(p,gv('ac-new2'));
  const curOk=svcOn()&&CRED?(await hashPw(gv('ac-cur'),CRED.salt)).hash===CRED.hash:await checkPw(gv('ac-cur'),CU.pw);
  if(!curOk){UI.acctMsg='Your current password is not correct.';return}
  if(pr){UI.acctMsg=pr;return}
  const old=CU.pw;CU.pw=await hashPw(p);CU.mod=nowIso();
  if(svcOn()){pwQueue(CU.id,CU.pw);GHS.newCred={u:CRED.u,hash:CU.pw.hash,salt:CU.pw.salt};audit('Password changed','');save();await ghSync();
    if(GHS.st==='err'){CU.pw=old;GH.pwq=(GH.pwq||[]).filter(x=>x.id!==CU.id);GHS.newCred=null;ghSaveCfg();UI.acctMsg='Could not save your new password to the sync service. '+GHS.msg;return}
    UI.acctMsg='';UI.modal=null;toast('Password changed.');return}
  audit('Password changed','');save();UI.acctMsg='';UI.modal=null;toast('Password changed.');
}
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
async function mkUser({name,un,email,role,depts,pw}){
  const u={id:uid(),username:un,name,role,active:true,mustChange:true,created:nowIso(),mod:nowIso(),pw:await hashPw(pw)};
  if(email)u.email=email;if(role!=='admin'&&depts)u.depts=depts;
  S.users.push(u);pwQueue(u.id,u.pw);audit('User created',name+' ('+un+', '+roleName(role).toLowerCase()+')');return u;
}
const uniqueUn=base=>{let b=(base||'user').toLowerCase().replace(/[^a-z0-9._-]/g,'');if(b.length<3)b=(b+'user').slice(0,8);let n=b,i=2;while(S.users.some(x=>x.username===n))n=b+(i++);return n};
async function doUserAdd(){
  const name=gv('nu-name').trim(),un=gv('nu-user').trim().toLowerCase(),role=gv('nu-role')||'tech',p=gv('nu-pass'),email=gv('nu-email').trim().toLowerCase();
  if(!name||!/^[a-z0-9._-]{3,}$/.test(un))return toast('Enter a full name and a username of at least 3 letters or numbers.');
  if(S.users.some(x=>x.username===un))return toast('That username is already taken.');
  if(email&&!EMAIL_RE.test(email))return toast('That email address does not look right.');
  if(email&&S.users.some(x=>String(x.email||'').toLowerCase()===email))return toast('That email address already has an account.');
  if(p.length<8)return toast('The temporary password needs at least 8 characters.');
  let ds;if(role!=='admin'&&deptList().length){ds=deptList().filter(d=>{const e=document.getElementById('nu-d-'+d.id);return e&&e.checked}).map(d=>d.id);if(!ds.length)return toast('Choose at least one department for this user.')}
  const u=await mkUser({name,un,email,role,depts:ds,pw:p});
  UI.lastCred=email?{name,email,username:un,pw:p}:null;save();toast('User created. They choose their own password at first sign-in.');
}
/* ----- access requests ----- */
async function doRequest(){
  const name=gv('rq-name').trim(),email=gv('rq-email').trim().toLowerCase();UI.rqName=name;UI.rqEmail=email;
  if(!name)return UI.authMsg='Enter your full name.';
  if(!EMAIL_RE.test(email))return UI.authMsg='Enter a valid email address. The administrator will send your temporary password there.';
  if(svcOn()){try{await svcCall('/request',{name,email},false)}catch(e){return UI.authMsg=e.message}}
  else{
    if(S.users.some(x=>String(x.email||'').toLowerCase()===email))return UI.authMsg='That email address already has an account. Try signing in, or ask an administrator to reset your password.';
    if(!S.requests.some(r=>r.email===email&&(!r.status||r.status==='pending'))){S.requests.push({id:uid(),name,email,at:nowIso(),status:'pending'});S.audit.push({id:uid(),at:nowIso(),by:null,byName:name,action:'Access requested',detail:name+' <'+email+'>',depts:[]});save()}
  }
  UI.reqDone=true;
}
async function doSvcConn(){
  const url=gv('sv-url').trim().replace(/\/+$/,'');
  if(!/^(https:\/\/|http:\/\/localhost)[^\s/]+/.test(url)){UI.ghMsg='Enter the service address, starting with https://';return}
  const old=GH;GH={...GH,svc:url,on:true};
  try{await svcCall('/ping',{},false)}catch(e){GH=old;UI.ghMsg=e.message;return}
  ghSaveCfg();UI.ghMsg='';UI.auth='';toast('Connected. Sign in with your QCLens username or email and password.');
}
const mailBody=c=>'Hello '+c.name+',\n\n'+(c.kind==='reset'?'An administrator has set a new temporary password for your QCLens account.':'Your QCLens access has been approved.')+'\n\nSign in at: '+location.href.split('#')[0]+'\nUsername: '+c.username+' (or your email address)\nTemporary password: '+c.pw+'\n\nYou will be asked to choose your own password the first time you sign in.\n';
function credBox(){
  const c=UI.lastCred;if(!c)return '';
  const href='mailto:'+encodeURIComponent(c.email||'')+'?subject='+encodeURIComponent(c.kind==='reset'?'Your new QCLens password':'Your QCLens access')+'&body='+encodeURIComponent(mailBody(c));
  return `<div class="panel stack" style="border-color:var(--accent)"><h3>${c.kind==='reset'?'Send the new password to':'Send these sign-in details to'} ${esc(c.name)}</h3>
   <div class="panelcard small"><div>Username: <b class="mono">${esc(c.username)}</b>${c.email?` (or ${esc(c.email)})`:''}</div><div>Temporary password: <b class="mono">${esc(c.pw)}</b></div></div>
   <p class="small muted" style="margin:0">QCLens cannot send email by itself. Press <b>Email these details</b> to open a ready-written message in your email app, addressed to ${esc(c.email||'the worker')}. This password is shown only now.</p>
   <div class="row">${c.email?`<a class="btn primary" href="${href}">Email these details</a>`:''}<button class="btn" data-act="copycred">Copy message</button><button class="btn" data-act="credok">Done</button></div></div>`;
}
function renderRequests(){
  const pend=S.requests.filter(r=>!r.status||r.status==='pending').sort((a,b)=>a.at<b.at?-1:1),done=S.requests.filter(r=>r.status&&r.status!=='pending').sort((a,b)=>(a.decidedAt||'')<(b.decidedAt||'')?1:-1).slice(0,8);
  const row=r=>{const open=UI.appr===r.id;
    return `<div class="panelcard"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b>${esc(r.name)}</b><div class="small muted">${esc(r.email)} · requested ${fmtTs(r.at)}</div></div>
     ${open?'':`<div class="row"><button class="btn sm primary" data-act="rqapprove" data-id="${r.id}">Approve…</button><button class="btn sm danger" data-act="rqreject" data-id="${r.id}">Decline</button></div>`}</div>
     ${open?`<div class="stack" style="margin-top:10px"><label class="f">Access level<select id="rq-role"><option value="tech">Technologist</option><option value="sup">Supervisory technologist</option><option value="cons">Consultant / Resident</option><option value="admin">Administrator</option></select></label>
      ${deptList().length?`<div class="f">Departments<span class="row" style="gap:14px;flex-wrap:wrap">${deptList().map(d=>`<label class="small" style="display:flex;gap:5px;align-items:center;font-weight:400"><input type="checkbox" id="rq-d-${d.id}" checked>${esc(d.dept)}</label>`).join('')}</span></div>`:''}
      <div class="row"><button class="btn primary" data-act="rqconfirm" data-id="${r.id}">Approve and create account</button><button class="btn" data-act="rqcancel">Cancel</button></div></div>`:''}</div>`};
  return `${credBox()}<div class="panel stack"><div><h2>Access requests</h2><p class="muted small" style="margin:4px 0 0;max-width:80ch">Workers ask for access from the sign-in screen with their name and email address. Approving creates their account with a temporary password for you to email to them.</p></div>
   ${pend.length?pend.map(row).join(''):'<p class="small muted" style="margin:0">No requests waiting.</p>'}
   ${done.length?`<details><summary class="small" style="cursor:pointer">Recent decisions</summary><div class="small" style="margin-top:6px">${done.map(r=>`<div>${esc(r.name)} · ${esc(r.email)} · <b>${r.status==='approved'?'approved':'declined'}</b>${r.by?' by '+esc(r.by):''}</div>`).join('')}</div></details>`:''}</div>`;
}
async function approveReq(id){
  const r=S.requests.find(x=>x.id===id);if(!r)return;
  const role=gv('rq-role')||'tech';let ds;
  if(role!=='admin'&&deptList().length){ds=deptList().filter(d=>{const e=document.getElementById('rq-d-'+d.id);return e&&e.checked}).map(d=>d.id);if(!ds.length)return toast('Choose at least one department.')}
  if(S.users.some(x=>String(x.email||'').toLowerCase()===r.email))return toast('That email address already has an account.');
  const un=uniqueUn(r.email.split('@')[0]),pw=genPw();
  await mkUser({name:r.name,un,email:r.email,role,depts:ds,pw});
  r.status='approved';r.by=CU.name;r.decidedAt=nowIso();audit('Access request approved',r.name+' <'+r.email+'> as '+roleName(role).toLowerCase());
  UI.lastCred={name:r.name,email:r.email,username:un,pw};UI.appr=null;save();
}
async function doUserEdit(){
  const u=S.users.find(x=>x.id===UI.uedit);if(!u)return;
  const name=gv('eu-name').trim(),un=gv('eu-user').trim().toLowerCase(),email=gv('eu-email').trim().toLowerCase();
  if(!name||!/^[a-z0-9._-]{3,}$/.test(un))return toast('Enter a full name and a username of at least 3 letters or numbers.');
  if(S.users.some(x=>x.id!==u.id&&x.username===un))return toast('That username is already taken.');
  if(email&&!EMAIL_RE.test(email))return toast('That email address does not look right.');
  if(email&&S.users.some(x=>x.id!==u.id&&String(x.email||'').toLowerCase()===email))return toast('That email address already has an account.');
  const ch=[];if(name!==u.name)ch.push('name '+u.name+' to '+name);if(un!==u.username)ch.push('username '+u.username+' to '+un);if(email!==String(u.email||'').toLowerCase())ch.push('email '+(u.email||'none')+' to '+(email||'none'));
  if(!ch.length){UI.uedit=null;return}
  if(un!==u.username&&u.id===CU.id&&svcOn()&&CRED)GHS.newCred={...CRED,u:un};
  u.name=name;u.username=un;if(email)u.email=email;else delete u.email;u.mod=nowIso();
  audit('User details changed',ch.join('; '));UI.uedit=null;save();toast('User details saved.');
}
async function doEmailPw(id){
  const u=S.users.find(x=>x.id===id);if(!u)return;
  if(!u.email){UI.uedit=u.id;return toast('This user has no email address. Add one in Edit first.')}
  const pw=genPw();u.pw=await hashPw(pw);u.mustChange=true;u.mod=nowIso();u.fails=0;u.lockUntil=0;pwQueue(u.id,u.pw);
  audit('Password reset by administrator',u.name+' ('+u.username+'), new password prepared for email');
  UI.lastCred={kind:'reset',name:u.name,email:u.email,username:u.username,pw};save();window.scrollTo(0,0);
}
async function doUserReset(){
  const id=UI.resetFor,u=S.users.find(x=>x.id===id),p=gv('rs-pass');
  if(!u)return;if(p.length<8)return toast('The temporary password needs at least 8 characters.');
  u.pw=await hashPw(p);u.mustChange=true;u.mod=nowIso();pwQueue(u.id,u.pw);u.fails=0;u.lockUntil=0;UI.resetFor=null;audit('Password reset by administrator',u.name+' ('+u.username+')');save();toast('Temporary password set for '+u.name+'.');
}
document.addEventListener('submit',async e=>{
  e.preventDefault();const f=e.target.dataset.form;if(!f)return;
  UI.authMsg='';
  try{
    if(!(window.crypto&&crypto.subtle))throw new Error('nosubtle');
    if(f==='admin')await doAdmin();else if(f==='login')await doLogin();else if(f==='forgot')await doForgot();else if(f==='forcepw')await doForce();
    else if(f==='acct'){await doAcct();if(UI.acctMsg){const m=document.getElementById('ac-err');m.textContent=UI.acctMsg;m.hidden=false;return}}
    else if(f==='uadd'){if(!isAdmin())return;await doUserAdd()}
    else if(f==='uedit'){if(!isAdmin())return;await doUserEdit()}
    else if(f==='ureset'){if(!isAdmin())return;await doUserReset()}
    else if(f==='svcadmin'){if(!isAdmin())return;await doSvcAdmin()}
    else if(f==='reqform')await doRequest();
    else if(f==='svcconn')await doSvcConn();
    else if(f==='ghconn'){if(CU&&!isAdmin())return;await doGhConnect()}
  }catch(err){UI.authMsg='Secure accounts are not available in this browser view.'}
  render();
});
/* ===== Users and audit tabs (administrator) ===== */
const nAdmins=()=>S.users.filter(u=>u.role==='admin'&&u.active!==false).length;
function deptCell(u){
  if(u.role==='admin')return '<span class="small muted">All departments</span>';
  const ds=deptList();if(!ds.length)return '<span class="small muted">–</span>';
  const all=!Array.isArray(u.depts),has=id=>all||u.depts.includes(id);
  return `<div class="stack" style="gap:2px">${ds.map(d=>`<label class="small" style="display:flex;gap:5px;align-items:center;font-weight:400;white-space:nowrap"><input type="checkbox" data-udept="${u.id}:${d.id}"${has(d.id)?' checked':''}>${esc(d.dept)}</label>`).join('')}${!all&&!u.depts.length?'<span class="small" style="color:var(--bad)">No access</span>':''}</div>`;
}
function renderPerms(){
  const row=d=>`<tr><td>${esc(d.l)}</td>${PROLES.map(([r,n])=>`<td style="text-align:center"><input type="checkbox" data-perm="${r}:${d.k}"${permFor(r,d.k)?' checked':''} aria-label="${esc(d.l)} for ${esc(n)}"></td>`).join('')}</tr>`;
  const grp=g=>`<tr><th colspan="4" style="text-align:left;padding-top:12px">${g==='View'?'Can view':'Can edit or do'}</th></tr>${PERMDEF.filter(d=>d.g===g).map(row).join('')}`;
  return `<div class="panel stack"><div><h3>What each user type can view and edit</h3><p class="muted small" style="margin:4px 0 0;max-width:80ch">Tick what technologists, supervisory technologists and consultants/residents may do. Administrators always have full access. Department limits still apply: everyone only sees the departments they are given. Changes apply the next time each person's screen refreshes.</p></div>
   <div class="scroll"><table class="t"><thead><tr><th>Permission</th><th style="text-align:center">Technologist</th><th style="text-align:center">Supervisory technologist</th><th style="text-align:center">Consultant / Resident</th></tr></thead><tbody>${grp('View')}${grp('Edit')}</tbody></table></div>
   <div class="row"><button class="btn" data-act="permreset">Restore defaults</button><span class="small muted">Today (entering and viewing daily QC) is always available. These settings control what the app shows and allows. For strict protection of the data itself, keep the number of administrators small.</span></div></div>`;
}
function renderUsers(){
  const rows=S.users.map(u=>{const me=u.id===CU.id,n=S.results.filter(r=>r.by===u.id).length,last=nAdmins()===1&&u.role==='admin'&&u.active!==false;
    return `<tr><td><b>${esc(u.name)}</b>${me?' <span class="chip">You</span>':''}<div class="small muted">${esc(u.username)}${u.email?' · '+esc(u.email):''}</div></td>
     <td>${me||last?`<span class="chip${u.role==='admin'?' acc':''}">${roleName(u.role)}</span>`:`<select data-urole="${u.id}" style="width:auto" aria-label="Role for ${esc(u.name)}"><option value="tech"${u.role==='tech'?' selected':''}>Technologist</option><option value="sup"${u.role==='sup'?' selected':''}>Supervisory technologist</option><option value="cons"${u.role==='cons'?' selected':''}>Consultant / Resident</option><option value="admin"${u.role==='admin'?' selected':''}>Administrator</option></select>`}</td>
     <td>${deptCell(u)}</td>
     <td>${u.active===false?'<span class="chip">Disabled</span>':u.mustChange?'<span class="chip warn">Must choose password</span>':'<span class="chip good">Active</span>'}</td>
     <td class="small">${u.lastLogin?fmtTs(u.lastLogin):'Never'}</td><td class="mono">${n}</td>
     <td style="text-align:right;white-space:nowrap">${UI.resetFor===u.id?`<form data-form="ureset" class="row" style="gap:6px;flex-wrap:nowrap;justify-content:flex-end"><input type="text" id="rs-pass" placeholder="Temporary password" style="width:160px" aria-label="Temporary password"><button class="btn sm" type="button" data-act="genpw" data-t="rs-pass">Generate</button><button class="btn sm primary" type="submit">Set</button><button class="btn sm" type="button" data-act="ucancel">Cancel</button></form>`
       :`<button class="btn sm" data-act="uedit" data-id="${u.id}">Edit</button> <button class="btn sm" data-act="ureset" data-id="${u.id}">Reset password</button> <button class="btn sm" data-act="uemailpw" data-id="${u.id}" title="Generate a new temporary password and prepare an email to this user">Email new password</button>${me||last?'':` <button class="btn sm${u.active===false?'':' danger'}" data-act="utoggle" data-id="${u.id}">${u.active===false?'Enable':'Disable'}</button>`}${me||last?'':UI.udel===u.id?` <span class="small">Delete ${esc(u.name)} for good?</span> <button class="btn sm danger" data-act="udelok" data-id="${u.id}">Yes, delete</button> <button class="btn sm" data-act="udelno">Cancel</button>`:` <button class="btn sm danger" data-act="udel" data-id="${u.id}">Delete</button>`}`}</td></tr>${UI.uedit===u.id?`<tr><td colspan="7" style="background:var(--surface2)"><form data-form="uedit" class="stack" autocomplete="off"><div class="grid2"><label class="f">Full name<input type="text" id="eu-name" value="${esc(u.name)}"></label><label class="f">Username<input type="text" id="eu-user" value="${esc(u.username)}" autocapitalize="none"></label><label class="f">Email address<input type="email" id="eu-email" value="${esc(u.email||'')}" autocapitalize="none"></label></div><p class="small muted" style="margin:0">Access level and departments are changed in the table above. The user keeps their password. If you change a username, tell the person.</p><div class="row"><button class="btn primary" type="submit">Save changes</button><button class="btn" type="button" data-act="ueditno">Cancel</button></div></form></td></tr>`:''}`}).join('');
  return `<div class="stack">${renderRequests()}${renderPerms()}<div class="panel"><h2>Users</h2><p class="muted small" style="margin:4px 0 10px">Technologists enter QC, review charts and alerts, and record overrides, only for the departments they are given. Supervisory technologists can also open Setup and the Audit log for those departments. Consultants and residents review QC and resolve violations; the permissions table below sets exactly what they can do. New departments are not shared with existing technologists until you tick them here. Administrators also manage setup, users and the audit log. Disabled users cannot sign in, and their past entries stay on record.</p>
   <div class="scroll"><table class="t"><thead><tr><th>Name</th><th>Role</th><th>Departments</th><th>Status</th><th>Last sign-in</th><th>QC entries</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>
   <div class="panel"><h3>Add a user</h3><form data-form="uadd" class="stack" style="margin-top:10px" autocomplete="off"><div class="grid2">
    <label class="f">Full name<input type="text" id="nu-name"></label><label class="f">Username<input type="text" id="nu-user" autocapitalize="none"></label>
    <label class="f">Email address (optional)<input type="email" id="nu-email" autocapitalize="none"></label>
    <label class="f">Role<select id="nu-role"><option value="tech">Technologist</option><option value="sup">Supervisory technologist</option><option value="cons">Consultant / Resident</option><option value="admin">Administrator</option></select></label>
    ${deptList().length?`<div class="f" style="grid-column:1/-1">Departments this user can see<span class="row" style="gap:14px;flex-wrap:wrap">${deptList().map(d=>`<label class="small" style="display:flex;gap:5px;align-items:center;font-weight:400"><input type="checkbox" id="nu-d-${d.id}" checked>${esc(d.dept)}</label>`).join('')}</span><span class="small muted" style="font-weight:400">Ignored for administrators, who see every department.</span></div>`:''}
    <label class="f">Temporary password<span class="row" style="gap:6px;flex-wrap:nowrap"><input type="text" id="nu-pass" autocomplete="off"><button class="btn sm" type="button" data-act="genpw" data-t="nu-pass">Generate</button></span></label></div>
    <div><button class="btn primary" type="submit">Create user</button></div></form>
   <p class="small muted" style="margin:10px 0 0">Give the person their username and temporary password. They choose their own password the first time they sign in.</p></div></div>`;
}
const AF={user:'',act:'',from:'',to:'',limit:100};
const auditOk=x=>!scoped(CU&&CU.role)||!Array.isArray(CU.depts)&&(x.depts||[]).length>0||Array.isArray(CU.depts)&&(x.depts||[]).some(d=>CU.depts.includes(d));
function auditRows(){
  return S.audit.filter(x=>auditOk(x)&&(!AF.user||x.by===AF.user||x.byName===AF.user)&&(!AF.act||x.action===AF.act)&&(!AF.from||x.at.slice(0,10)>=AF.from)&&(!AF.to||dstr(new Date(x.at))<=AF.to)).slice().reverse();
}
function renderAudit(){
  const rows=auditRows(),vis=S.audit.filter(auditOk),acts=[...new Set(vis.map(x=>x.action))].sort();
  const names=[...new Map(vis.filter(x=>x.byName).map(x=>[x.by||x.byName,x.byName])).entries()];
  return `<div class="stack"><div class="panel"><div class="row" style="justify-content:space-between"><div><h2>Audit log</h2><p class="muted small" style="margin:4px 0 0">Every sign-in, QC entry, edit, override, setup change and user change, with who did it and when. Times are in this computer's time zone.</p></div><button class="btn primary" data-act="xaudit">Export to Excel</button></div>
   <div class="row" style="margin-top:12px"><label class="f">User<select id="af-user" style="width:auto"><option value="">Everyone</option>${names.map(([k,n])=>`<option value="${esc(k)}"${AF.user===k?' selected':''}>${esc(n)}</option>`).join('')}</select></label>
    <label class="f">Action<select id="af-act" style="width:auto"><option value="">All actions</option>${acts.map(a=>`<option${AF.act===a?' selected':''}>${esc(a)}</option>`).join('')}</select></label>
    <label class="f">From<input type="date" id="af-from" value="${AF.from}" style="width:auto"></label><label class="f">To<input type="date" id="af-to" value="${AF.to}" style="width:auto"></label></div></div>
   <div class="panel"><div class="scroll"><table class="t"><thead><tr><th>When</th><th>User</th><th>Action</th><th>Detail</th></tr></thead><tbody>
   ${rows.slice(0,AF.limit).map(x=>`<tr><td class="small" style="white-space:nowrap">${fmtTs(x.at)}</td><td>${esc(x.byName||'–')}</td><td><span class="chip${/Failed/.test(x.action)?' bad':''}">${esc(x.action)}</span></td><td class="small">${esc(x.detail)}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">No entries match.</td></tr>'}</tbody></table></div>
   ${rows.length>AF.limit?`<div style="margin-top:10px"><button class="btn sm" data-act="auditmore">Show more (${rows.length-AF.limit} left)</button></div>`:''}</div></div>`;
}
async function exportAudit(){
  const dl=await getDl();if(!dl){toast('Saving files is not available in this view.');return}
  if(!window.ExcelJS){toast('The Excel library did not load. Check your connection and try again.');return}
  try{
    const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Audit log');
    const h=ws.addRow(['When','User','Action','Detail']);h.font={bold:true,color:{argb:'FFFFFFFF'}};h.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0B6E78'}};
    auditRows().slice().reverse().forEach(x=>ws.addRow([fmtTs(x.at),x.byName||'',x.action,x.detail]));
    ws.columns=[{width:18},{width:24},{width:26},{width:90}];
    await dl.save({filename:'QCLens-audit-log-'+todayStr()+'.xlsx',data:await wb.xlsx.writeBuffer()});toast('Audit log ready.');
  }catch(e){toast(e&&e.code==='declined'?'Save cancelled.':'Export failed.')}
}
