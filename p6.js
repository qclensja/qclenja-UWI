/* ===== Accounts, sessions and audit trail ===== */
const IDLE_MS=30*60*1000;
let memSess=null,SESS=null,CU=null;
const isAdmin=()=>!!CU&&CU.role==='admin';
const nowIso=()=>new Date().toISOString();
const fmtTs=iso=>{if(!iso)return '';const d=new Date(iso);return isNaN(d)?'':pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes())};
const byLine=r=>(r.byName?'Entered by '+esc(r.byName)+' · '+fmtTs(r.at):'Entered before sign-in was added')+(r.upd?' · edited by '+esc(r.upd.byName)+' · '+fmtTs(r.upd.at):'');
const byShort=r=>r.byName?esc(r.byName)+' · '+fmtTs(r.upd?r.upd.at:r.at):'';
function stampNow(){return {by:CU?CU.id:null,byName:CU?CU.name:'',at:nowIso()}}
function audit(action,detail,actor){
  const u=actor||CU||{};
  S.audit.push({id:uid(),at:nowIso(),by:u.id||null,byName:u.name||'',action,detail:String(detail||'').slice(0,600)});
  if(S.audit.length>8000)S.audit.splice(0,S.audit.length-8000);
}
/* session */
function readSess(){try{const s=sessionStorage.getItem('ljqc.sess');if(s)return JSON.parse(s)}catch(e){}return memSess}
function writeSess(){memSess=SESS;try{if(SESS)sessionStorage.setItem('ljqc.sess',JSON.stringify(SESS));else sessionStorage.removeItem('ljqc.sess')}catch(e){}}
function restoreSess(){
  SESS=readSess();CU=null;
  if(SESS&&Date.now()-SESS.last<IDLE_MS)CU=S.users.find(u=>u.id===SESS.uid&&u.active!==false)||null;
  if(!CU){SESS=null;writeSess()}
}
function signIn(u){SESS={uid:u.id,last:Date.now()};writeSess();CU=u;u.lastLogin=nowIso();UI.authMsg='';UI.auth='';S.tab='today'}
function signOut(auto){
  if(CU){audit(auto?'Auto sign-out':'Sign out',auto?'Signed out after 30 minutes of inactivity':'');save()}
  SESS=null;CU=null;writeSess();UI.modal=null;UI.editing=false;UI.authMsg=auto?'You were signed out after 30 minutes of inactivity.':'';render();
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
function authGate(){
  if(UI.recCode)return shell(`<div><h2>Save your recovery code</h2><p class="muted" style="margin:6px 0 0">If you forget your password, this code lets an administrator reset it. It is shown once. Keep it somewhere safe, away from this computer.</p></div>
    <div class="reccode" id="reccode">${esc(UI.recCode)}</div>
    <div class="row"><button class="btn" type="button" data-act="copyrec">Copy code</button><button class="btn primary" type="button" data-act="recdone">I have saved it</button></div>`);
  if(!S.users.length)return shell(`<div><h2>Create the administrator account</h2><p class="muted" style="margin:6px 0 0">This is the first sign-in. The administrator sets up the lab, adds colleagues and can review the audit log.</p></div>
    <form data-form="admin" class="stack" autocomplete="off">${fld('ca-name','Full name','text','autocomplete="name" value="'+esc(UI.authName||'')+'"')}${fld('ca-user','Username','text','autocapitalize="none" autocomplete="username" value="'+esc(UI.authUser||'')+'"')}${fld('ca-pass','Password (8 or more characters)','password','autocomplete="new-password"')}${fld('ca-pass2','Confirm password','password','autocomplete="new-password"')}${amsg()}
    <button class="btn primary" type="submit">Create account and sign in</button></form>`);
  if(!CU){
    if(UI.auth==='forgot')return shell(`<div><h2>Reset password</h2><p class="muted" style="margin:6px 0 0">Administrators can reset their own password with the recovery code from when the account was created. Other users should ask an administrator.</p></div>
      <form data-form="forgot" class="stack">${fld('fg-user','Username','text','autocapitalize="none" value="'+esc(UI.authUser||'')+'"')}${fld('fg-code','Recovery code','text','autocapitalize="characters" placeholder="XXXX-XXXX-XXXX" value="'+esc(UI.authCode||'')+'"')}${fld('fg-pass','New password (8 or more characters)','password','autocomplete="new-password"')}${fld('fg-pass2','Confirm new password','password','autocomplete="new-password"')}${amsg()}
      <button class="btn primary" type="submit">Reset password</button><button class="btn" type="button" data-act="backlogin">Back to sign in</button></form>`);
    return shell(`<div><h2>Sign in</h2><p class="muted" style="margin:6px 0 0">Levey-Jennings QC for the clinical laboratory</p></div>
      <form data-form="login" class="stack">${fld('li-user','Username','text','autocapitalize="none" autocomplete="username" value="'+esc(UI.authUser||'')+'"')}${fld('li-pass','Password','password','autocomplete="current-password"')}${amsg()}
      <button class="btn primary" type="submit">Sign in</button><button class="btn" type="button" data-act="forgot">Forgot password?</button></form>`);
  }
  if(CU.mustChange)return shell(`<div><h2>Choose a new password</h2><p class="muted" style="margin:6px 0 0">Hello ${esc(CU.name)}. Your password was set by an administrator. Choose your own before you continue.</p></div>
    <form data-form="forcepw" class="stack">${fld('cp-pass','New password (8 or more characters)','password','autocomplete="new-password"')}${fld('cp-pass2','Confirm new password','password','autocomplete="new-password"')}${amsg()}
    <button class="btn primary" type="submit">Save password</button><button class="btn" type="button" data-act="signout">Sign out</button></form>`);
  if(!isAdmin()&&!S.setup.done)return shell(`<div><h2>Setup is not finished</h2><p class="muted" style="margin:6px 0 0">Hello ${esc(CU.name)}. An administrator needs to finish setting up the lab before QC can be entered. Please ask them to sign in.</p></div><button class="btn" type="button" data-act="signout">Sign out</button>`);
  return '';
}
function userBar(){
  return `<div class="userbar"><span class="who"><b>${esc(CU.name)}</b> <span class="chip${CU.role==='admin'?' acc':''}">${CU.role==='admin'?'Administrator':'Technologist'}</span></span>
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
async function doLogin(){
  const un=gv('li-user').trim().toLowerCase(),pw=gv('li-pass');UI.authUser=un;
  const u=S.users.find(x=>x.username===un),bad='Username or password is incorrect.';
  if(!u||u.active===false){audit('Failed sign-in','Unknown or disabled username "'+un+'"',{id:null,name:un});save();return UI.authMsg=bad}
  if(u.lockUntil&&Date.now()<u.lockUntil)return UI.authMsg='Too many attempts. Wait a minute and try again.';
  if(!await checkPw(pw,u.pw)){u.fails=(u.fails||0)+1;if(u.fails>=5){u.lockUntil=Date.now()+60000;u.fails=0}audit('Failed sign-in','Wrong password',u);save();return UI.authMsg=bad}
  u.fails=0;u.lockUntil=0;signIn(u);audit('Sign in','',u);save();
}
async function doForgot(){
  const un=gv('fg-user').trim().toLowerCase(),code=gv('fg-code').toUpperCase().replace(/[^A-Z0-9]/g,''),p=gv('fg-pass'),p2=gv('fg-pass2');UI.authUser=un;UI.authCode=gv('fg-code');
  const pr=pwProblem(p,p2);if(pr)return UI.authMsg=pr;
  const u=S.users.find(x=>x.username===un&&x.role==='admin'&&x.rec&&x.active!==false);
  if(!u||!await checkPw(code,u.rec)){audit('Failed password reset','Wrong username or recovery code "'+un+'"',{id:null,name:un});save();return UI.authMsg='The username and recovery code do not match.'}
  const nc=genCode();u.pw=await hashPw(p);u.rec=await hashPw(nc.replace(/-/g,''));u.mustChange=false;u.fails=0;u.lockUntil=0;
  signIn(u);audit('Password reset','Reset with recovery code',u);save();UI.recCode=nc;
}
async function doForce(){
  const p=gv('cp-pass'),pr=pwProblem(p,gv('cp-pass2'));if(pr)return UI.authMsg=pr;
  CU.pw=await hashPw(p);CU.mustChange=false;audit('Password changed','Chose a new password after reset');save();UI.authMsg='';
}
async function doAcct(){
  const p=gv('ac-new'),pr=pwProblem(p,gv('ac-new2'));
  if(!await checkPw(gv('ac-cur'),CU.pw)){UI.acctMsg='Your current password is not correct.';return}
  if(pr){UI.acctMsg=pr;return}
  CU.pw=await hashPw(p);audit('Password changed','');save();UI.acctMsg='';UI.modal=null;toast('Password changed.');
}
async function doUserAdd(){
  const name=gv('nu-name').trim(),un=gv('nu-user').trim().toLowerCase(),role=gv('nu-role')||'tech',p=gv('nu-pass');
  if(!name||!/^[a-z0-9._-]{3,}$/.test(un))return toast('Enter a full name and a username of at least 3 letters or numbers.');
  if(S.users.some(x=>x.username===un))return toast('That username is already taken.');
  if(p.length<8)return toast('The temporary password needs at least 8 characters.');
  const u={id:uid(),username:un,name,role,active:true,mustChange:true,created:nowIso(),pw:await hashPw(p)};
  if(role==='tech'&&deptList().length){const ds=deptList().filter(d=>{const e=document.getElementById('nu-d-'+d.id);return e&&e.checked}).map(d=>d.id);if(!ds.length)return toast('Choose at least one department for this technologist.');u.depts=ds}
  S.users.push(u);audit('User created',name+' ('+un+', '+(role==='admin'?'administrator':'technologist')+')');save();toast('User created. They choose their own password at first sign-in.');
}
async function doUserReset(){
  const id=UI.resetFor,u=S.users.find(x=>x.id===id),p=gv('rs-pass');
  if(!u)return;if(p.length<8)return toast('The temporary password needs at least 8 characters.');
  u.pw=await hashPw(p);u.mustChange=true;u.fails=0;u.lockUntil=0;UI.resetFor=null;audit('Password reset by administrator',u.name+' ('+u.username+')');save();toast('Temporary password set for '+u.name+'.');
}
document.addEventListener('submit',async e=>{
  e.preventDefault();const f=e.target.dataset.form;if(!f)return;
  UI.authMsg='';
  try{
    if(!(window.crypto&&crypto.subtle))throw new Error('nosubtle');
    if(f==='admin')await doAdmin();else if(f==='login')await doLogin();else if(f==='forgot')await doForgot();else if(f==='forcepw')await doForce();
    else if(f==='acct'){await doAcct();if(UI.acctMsg){const m=document.getElementById('ac-err');m.textContent=UI.acctMsg;m.hidden=false;return}}
    else if(f==='uadd'){if(!isAdmin())return;await doUserAdd()}
    else if(f==='ureset'){if(!isAdmin())return;await doUserReset()}
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
function renderUsers(){
  const rows=S.users.map(u=>{const me=u.id===CU.id,n=S.results.filter(r=>r.by===u.id).length,last=nAdmins()===1&&u.role==='admin'&&u.active!==false;
    return `<tr><td><b>${esc(u.name)}</b>${me?' <span class="chip">You</span>':''}<div class="small muted">${esc(u.username)}</div></td>
     <td>${me||last?`<span class="chip${u.role==='admin'?' acc':''}">${u.role==='admin'?'Administrator':'Technologist'}</span>`:`<select data-urole="${u.id}" style="width:auto" aria-label="Role for ${esc(u.name)}"><option value="tech"${u.role==='tech'?' selected':''}>Technologist</option><option value="admin"${u.role==='admin'?' selected':''}>Administrator</option></select>`}</td>
     <td>${deptCell(u)}</td>
     <td>${u.active===false?'<span class="chip">Disabled</span>':u.mustChange?'<span class="chip warn">Must choose password</span>':'<span class="chip good">Active</span>'}</td>
     <td class="small">${u.lastLogin?fmtTs(u.lastLogin):'Never'}</td><td class="mono">${n}</td>
     <td style="text-align:right;white-space:nowrap">${UI.resetFor===u.id?`<form data-form="ureset" class="row" style="gap:6px;flex-wrap:nowrap;justify-content:flex-end"><input type="text" id="rs-pass" placeholder="Temporary password" style="width:160px" aria-label="Temporary password"><button class="btn sm" type="button" data-act="genpw" data-t="rs-pass">Generate</button><button class="btn sm primary" type="submit">Set</button><button class="btn sm" type="button" data-act="ucancel">Cancel</button></form>`
       :`<button class="btn sm" data-act="ureset" data-id="${u.id}">Reset password</button>${me||last?'':` <button class="btn sm${u.active===false?'':' danger'}" data-act="utoggle" data-id="${u.id}">${u.active===false?'Enable':'Disable'}</button>`}`}</td></tr>`}).join('');
  return `<div class="stack"><div class="panel"><h2>Users</h2><p class="muted small" style="margin:4px 0 10px">Technologists enter QC, review charts and alerts, and record overrides, only for the departments they are given. New departments are not shared with existing technologists until you tick them here. Administrators also manage setup, users and the audit log. Disabled users cannot sign in, and their past entries stay on record.</p>
   <div class="scroll"><table class="t"><thead><tr><th>Name</th><th>Role</th><th>Departments</th><th>Status</th><th>Last sign-in</th><th>QC entries</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>
   <div class="panel"><h3>Add a user</h3><form data-form="uadd" class="stack" style="margin-top:10px" autocomplete="off"><div class="grid2">
    <label class="f">Full name<input type="text" id="nu-name"></label><label class="f">Username<input type="text" id="nu-user" autocapitalize="none"></label>
    <label class="f">Role<select id="nu-role"><option value="tech">Technologist</option><option value="admin">Administrator</option></select></label>
    ${deptList().length?`<div class="f" style="grid-column:1/-1">Departments this technologist can see<span class="row" style="gap:14px;flex-wrap:wrap">${deptList().map(d=>`<label class="small" style="display:flex;gap:5px;align-items:center;font-weight:400"><input type="checkbox" id="nu-d-${d.id}" checked>${esc(d.dept)}</label>`).join('')}</span><span class="small muted" style="font-weight:400">Ignored for administrators, who see every department.</span></div>`:''}
    <label class="f">Temporary password<span class="row" style="gap:6px;flex-wrap:nowrap"><input type="text" id="nu-pass" autocomplete="off"><button class="btn sm" type="button" data-act="genpw" data-t="nu-pass">Generate</button></span></label></div>
    <div><button class="btn primary" type="submit">Create user</button></div></form>
   <p class="small muted" style="margin:10px 0 0">Give the person their username and temporary password. They choose their own password the first time they sign in.</p></div></div>`;
}
const AF={user:'',act:'',from:'',to:'',limit:100};
function auditRows(){
  return S.audit.filter(x=>(!AF.user||x.by===AF.user||x.byName===AF.user)&&(!AF.act||x.action===AF.act)&&(!AF.from||x.at.slice(0,10)>=AF.from)&&(!AF.to||dstr(new Date(x.at))<=AF.to)).slice().reverse();
}
function renderAudit(){
  const rows=auditRows(),acts=[...new Set(S.audit.map(x=>x.action))].sort();
  const names=[...new Map(S.audit.filter(x=>x.byName).map(x=>[x.by||x.byName,x.byName])).entries()];
  return `<div class="stack"><div class="panel"><div class="row" style="justify-content:space-between"><div><h2>Audit log</h2><p class="muted small" style="margin:4px 0 0">Every sign-in, QC entry, edit, override, setup change and user change, with who did it and when. Times are in this computer's time zone.</p></div><button class="btn primary" data-act="xaudit">Export to Excel</button></div>
   <div class="row" style="margin-top:12px"><label class="f">User<select id="af-user" style="width:auto"><option value="">Everyone</option>${names.map(([k,n])=>`<option value="${esc(k)}"${AF.user===k?' selected':''}>${esc(n)}</option>`).join('')}</select></label>
    <label class="f">Action<select id="af-act" style="width:auto"><option value="">All actions</option>${acts.map(a=>`<option${AF.act===a?' selected':''}>${esc(a)}</option>`).join('')}</select></label>
    <label class="f">From<input type="date" id="af-from" value="${AF.from}" style="width:auto"></label><label class="f">To<input type="date" id="af-to" value="${AF.to}" style="width:auto"></label></div></div>
   <div class="panel"><div class="scroll"><table class="t"><thead><tr><th>When</th><th>User</th><th>Action</th><th>Detail</th></tr></thead><tbody>
   ${rows.slice(0,AF.limit).map(x=>`<tr><td class="small" style="white-space:nowrap">${fmtTs(x.at)}</td><td>${esc(x.byName||'–')}</td><td><span class="chip${/Failed/.test(x.action)?' bad':''}">${esc(x.action)}</span></td><td class="small">${esc(x.detail)}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">No entries match.</td></tr>'}</tbody></table></div>
   ${rows.length>AF.limit?`<div style="margin-top:10px"><button class="btn sm" data-act="auditmore">Show more (${rows.length-AF.limit} left)</button></div>`:''}</div></div>`;
}
async function exportAudit(){
  const dl=await claude.use('downloads');if(!dl){toast('Saving files is not available in this view.');return}
  if(!window.ExcelJS){toast('The Excel library did not load. Check your connection and try again.');return}
  try{
    const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Audit log');
    const h=ws.addRow(['When','User','Action','Detail']);h.font={bold:true,color:{argb:'FFFFFFFF'}};h.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0B6E78'}};
    auditRows().slice().reverse().forEach(x=>ws.addRow([fmtTs(x.at),x.byName||'',x.action,x.detail]));
    ws.columns=[{width:18},{width:24},{width:26},{width:90}];
    await dl.save({filename:'QCLens-audit-log-'+todayStr()+'.xlsx',data:await wb.xlsx.writeBuffer()});toast('Audit log ready.');
  }catch(e){toast(e&&e.code==='declined'?'Save cancelled.':'Export failed.')}
}
restoreSess();
