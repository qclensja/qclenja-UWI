/* ===== Setup summary, main render, events ===== */
function setupView(){return (isAdmin()||perm('e_setup'))?renderSetupHome():'<div class="alert warn" style="margin:0"><b>View only.</b> Your access level can see Setup but not change it.</div><div inert>'+renderSetupHome()+'</div>'}
function renderSetupHome(){
  if(!canSeeD(S.setup.cur)){const f=visDepts()[0];if(f){syncCtx();loadCtx(f.id)}}
  const st=S.setup,recs=isAdmin()?deptList():visDepts(),mine=DA(),ans=st.analysers||[],d=CAT[st.dept]||{analysers:[]};
  return `<div class="stack"><div class="panel stack"><div class="row" style="justify-content:space-between;align-items:flex-end"><h2>Setup</h2>
    <div class="row">${recs.length>1?`<label class="f">Department<select id="deptsw" style="width:auto;min-width:200px">${recs.map(r=>`<option value="${r.id}"${r.id===st.cur?' selected':''}>${esc(r.dept)}</option>`).join('')}</select></label>`:''}${isAdmin()?'<button class="btn" data-act="adddept">Add department</button>':''}${isAdmin()&&!isBuiltin(st.dept)?(UI.drn?`<label class="f" style="flex:1 1 200px">Department name<input type="text" id="drn-name" maxlength="40" value="${esc(st.dept==='Other / Custom'?'':st.dept)}"></label><button class="btn primary" data-act="drnsave">Save name</button><button class="btn" data-act="drncancel">Cancel</button>`:'<button class="btn" data-act="drnstart">Rename department</button>'):''}${isAdmin()&&recs.length>1?(UI.delDept?`<span class="small">Delete ${esc(st.dept)} with ${DA().length} analytes and ${DA().reduce((n,a)=>n+nRes(a.id),0)} results?</span><button class="btn danger" data-act="deldeptok">Yes, delete department</button><button class="btn" data-act="deldeptno">Cancel</button>`:'<button class="btn danger" data-act="deldept">Delete department</button>'):''}</div></div>
   ${recs.length>1?`<div class="small muted">${recs.map(r=>esc(r.dept)+': '+S.analytes.filter(a=>a.dept===r.id).length+' analytes on '+(r.id===st.cur?ans:r.analysers||[]).length+' analyser'+((r.id===st.cur?ans:r.analysers||[]).length===1?'':'s')).join(' · ')}</div>`:''}
   <div class="panelcard"><div class="grid2"><div><div class="small muted">Department</div><b>${esc(st.dept)}</b>${esc(dsub(st.sub))}</div>
   <div><div class="small muted">Analytes</div><b>${mine.length}</b> in ${new Set(mine.map(a=>a.panel)).size} panels · 1 to 6 control levels each, set per analyte</div></div>
   <div class="small muted" style="margin-top:12px">Analysers and modules in ${esc(st.dept)}</div>${analyserEditor()}
   <div class="row" style="align-items:flex-end;margin-top:8px"><label class="f" style="flex:1 1 220px">New analyser<select data-path="analyser" data-r>${anOptions(st.dept,st.sub,st.analyser)}</select></label>
    ${st.analyser==='Other'?`<label class="f" style="flex:1 1 220px">Analyser name<input type="text" data-path="analyserOther" value="${esc(st.analyserOther)}" placeholder="Make and model"></label>`:''}
    <label class="f" style="flex:1 1 160px">Label (optional)<input type="text" id="an-suffix" placeholder="e.g. Main lab" maxlength="24"></label>
    <button class="btn primary" data-act="ainstadd"${pickedName()?'':' disabled'}>Add analyser</button></div>
   <p class="small muted" style="margin:6px 0 0">A new analyser starts with no analytes. Use <b>Change schedules and analyser assignment</b> to assign analytes to an analyser and module. Adding the same model again names it "(2)" automatically.</p>
   <div class="row" style="margin-top:10px"><button class="btn" data-act="edit" data-n="1">Change analysers or analytes</button><button class="btn" data-act="edit" data-n="3">Change schedules and analyser assignment</button><button class="btn" data-act="edit" data-n="4">Edit starting targets</button></div></div>
   <p class="small muted" style="margin:0">To change a mean or SD for a new lot, use <b>Lot change</b> on the Charts screen. It needs a comment and keeps the history.</p></div>
   ${renderAssign()}${renderManager()}${isAdmin()?renderGithub()+renderBackups():''}${isAdmin()?'<div class="panel stack"><h3>Data</h3>':'<div hidden>'}<div class="row"><button class="btn primary" data-act="xlall">Export all analytes to Excel</button><button class="btn" data-act="backup">Save backup file</button>
    <label class="btn" for="restore" style="cursor:pointer">Restore from backup</label><input type="file" id="restore" accept=".json,application/json" hidden></div>
   <p class="small muted" style="margin:0">${ghOn()?'All data is stored in GitHub, not on this device. This browser only keeps changes that have not uploaded yet. A backup file is still a good extra copy.':'Results are stored in this browser on this device. Save a backup file regularly, and before clearing browser data or switching device. Connect cloud storage above to keep everything on GitHub instead.'}</p>
   <div class="row">${UI.confirmReset?'<span class="small">This deletes all setup and QC results.</span><button class="btn danger" data-act="reset2">Yes, delete everything</button><button class="btn" data-act="reset0">Keep my data</button>':'<button class="btn danger" data-act="reset1"'+(ghOn()?' disabled':'')+'>Start over</button>'}${ghOn()?'<span class="small muted">Disconnect GitHub storage first, otherwise the saved copy would restore your data.</span>':''}</div></div></div>`;
}
const app=document.getElementById('app');
function stashDrafts(){UI.draft=UI.draft||{};document.querySelectorAll('[data-in]').forEach(i=>{const k=UI.date+':'+i.dataset.in;if(i.value!=='')UI.draft[k]=i.value;else delete UI.draft[k]})}
const FOOT='<footer class="sitefoot">&copy; 2026 QCLens. All rights reserved.</footer>';
function render(){
  const y=window.scrollY;stashDrafts();
  const gate=authGate();if(gate){app.innerHTML=gate+FOOT;window.scrollTo(0,0);return}
  if(CU&&S.setup.done&&!UI.expAsked&&!UI.modal&&perm('e_lot')){UI.expAsked=true;if(expiredGroups().length)UI.modal={exp:true}}
  let h='';
  const setupOn=!S.setup.done||UI.editing;
  const un=S.setup.done?unresolved(allFlags()).length:0;
  h+=`<header class="top"><div class="brand"><h1 class="sr">QCLens</h1><img class="logo" src="${LOGO}" alt="QCLens logo"><span>${S.setup.done?esc((S.setup.lab?S.setup.lab+' · ':'')+(visDepts().length>1?visDepts().map(d=>d.dept).join(', '):visDepts().length===1?visDepts()[0].dept+' · '+analyserNameV():(S.setup.sub?S.setup.sub+' · ':'')+analyserName())):'Levey-Jennings charts and Westgard rules for the clinical laboratory'}</span></div>${userBar()}</header>`;
  if(S.setup.done&&!UI.editing){
    const T=[['today','Today'],...(perm('e_other')?[['other','Other QC']]:[]),['charts','Charts'],['alerts','Alerts'],['materials','QC materials'],['limits','Establish limits'],['rules','Westgard rules'],['sigma','Sigma metrics']].filter(x=>perm('v_'+x[0])||x[0]==='today'||x[0]==='other');if(canSetup())T.push(['setup','Setup']);if(isAdmin())T.push(['users','Users']);if(canAudit())T.push(['audit','Audit log']);
    if(!T.some(x=>x[0]===S.tab))S.tab='today';
    h+=`<nav class="tabs" role="tablist">${T.map(([k,n])=>`<button role="tab" aria-selected="${S.tab===k}" data-act="tab" data-t="${k}">${n}${k==='alerts'&&un?`<span class="badge">${un}</span>`:''}</button>`).join('')}</nav>`;
    h+=S.tab==='today'?renderToday():S.tab==='charts'?renderCharts():S.tab==='alerts'?renderAlerts():S.tab==='limits'?renderLimits():S.tab==='users'?renderUsers():S.tab==='audit'?renderAudit():S.tab==='rules'?renderRules():S.tab==='other'?renderOther():S.tab==='materials'?renderMaterials():S.tab==='sigma'?renderSigma():setupView();
  }else h+=renderSetup();
  h+=renderModal();
  app.innerHTML=h+FOOT;
  if(UI.draft)document.querySelectorAll('[data-in]').forEach(i=>{const v=UI.draft[UI.date+':'+i.dataset.in];if(v!==undefined)i.value=v});
  window.scrollTo(0,y);
}
function refreshNext(){
  if(S.setup.step!==4)return;
  const bad=DA().some(tgBad);
  const b=document.querySelector('[data-act="next"]');if(b)b.disabled=bad;const nt=document.getElementById('tgnote');if(nt)nt.hidden=!bad;
}
function setTab(t){S.tab=t;UI.report=[];UI.skipOpen=null;save();render();window.scrollTo(0,0)}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  const act=el.dataset.act,id=el.dataset.id,st=S.setup;
  if(act==='mclose'&&el.classList.contains('modalbg')&&e.target!==el)return;
  const PUBLIC=new Set(['newlab','forgot','backlogin','copyrec','recdone','ghopen','svcopen','reqopen']);
  if(!CU&&!PUBLIC.has(act))return;
  const ADMIN=new Set(['csubadd','csubno','cdeptadd','cdeptno','drnstart','drncancel','drnsave','rcustom','rreset','nlev','back','next','panelall','cpnew','cpadd','cpall','cprem','cpdel','edit','closesetup','papply','addopen','sugg','addsave','aedit','aeditsave','arem','arcancel','mnp','pdel','backup','reset1','reset0','reset2','delres','genpw','utoggle','ureset','ucancel','xaudit','auditmore','newrec','deldept','deldeptno','deldeptok','matpanel','ainstadd','anren','anrencancel','anrensave','ainstdel','adddept','asgall','asgmove','asgcopy','ghsync','ghoff','rulet','rqapprove','rqreject','rqconfirm','rqcancel','credok','copycred','svcdisc','svccopy','udel','udelno','udelok','uedit','ueditno','uemailpw']);
  const ADMONLY=new Set(['rcustom','rreset','deldept','deldeptno','deldeptok','uemailpw','uedit','ueditno','udel','udelno','udelok','rqapprove','rqreject','rqconfirm','rqcancel','credok','copycred','svcdisc','svccopy','backup','reset1','reset0','reset2','delres','genpw','utoggle','ureset','ucancel','newrec','adddept','ghsync','ghoff','rulet']);
  if(ADMIN.has(act)&&!(isAdmin()||(perm('e_setup')&&!ADMONLY.has(act)&&(act!=='closesetup'||!S.setup.adding))))return;
  const NEED={expopen:'e_lot',expapply:'e_lot',expdis:'e_lot',matnew:'e_materials',matedit:'e_materials',matcancel:'e_materials',matsave:'e_materials',matdel:'e_materials',matdelno:'e_materials',matdelok:'e_materials',matapply:'e_materials',matapplycancel:'e_materials',matselall:'e_materials',matselnone:'e_materials',matrun:'e_materials',povr:'e_override',punover:'e_override',tedit:'e_lot',teditsave:'e_lot',tdel:'e_lot',tdelno:'e_lot',tdelok:'e_lot',obsave:'e_other',obsaveone:'e_other',obmode:'e_other',saveqc:'e_qc',saveone:'e_qc',skip:'e_qc',skipok:'e_qc',unskip:'e_qc',override:'e_override',unoverride:'e_override',lot:'e_lot',msave:'e_lot',estapply:'e_limits',xl:'e_export'};
  if(NEED[act]&&!perm(NEED[act])){toast('Your access level does not include this. Ask an administrator.');return}
  if(act==='permreset'){if(!isAdmin())return;S.perms={};S.permsAt=nowIso();audit('Permissions restored to defaults','',null,[]);save();render();return}
  if(act.startsWith('est')&&estAct(act,el))return;
  if(act.startsWith('sg')&&sgAct(act,el))return;if(act.startsWith('bkp')&&bkpAct(act,el))return;
  switch(act){
   case 'tab':if(el.dataset.aid)UI.cid=el.dataset.aid;return setTab(el.dataset.t);
   case 'signout':return signOut(false);
   case 'acct':UI.acctMsg='';UI.modal={acct:true};break;
   case 'forgot':UI.auth='forgot';UI.authMsg='';break;
   case 'backlogin':UI.setupNew=false;UI.auth='';UI.authMsg='';UI.ghMsg='';break;
   case 'recdone':UI.recCode=null;break;
   case 'copyrec':{const sel=()=>{const n=document.getElementById('reccode'),r=document.createRange();r.selectNodeContents(n);const s=getSelection();s.removeAllRanges();s.addRange(r);toast('Select and copy the code.')};
     try{navigator.clipboard.writeText(UI.recCode).then(()=>toast('Code copied.'),sel)}catch(x){sel()}return}
   case 'newrec':{(async()=>{const c=genCode();CU.rec=await hashPw(c.replace(/-/g,''));audit('Recovery code regenerated','');save();UI.modal=null;UI.recCode=c;render()})();return}
   case 'genpw':{const i=document.getElementById(el.dataset.t);if(i)i.value=genPw();return}
   case 'utoggle':{const u=S.users.find(x=>x.id===id);if(!u||u.id===CU.id)return;
     if(u.role==='admin'&&u.active!==false&&nAdmins()<=1)return toast('There must be at least one active administrator.');
     u.active=u.active===false;u.mod=nowIso();audit(u.active?'User enabled':'User disabled',u.name+' ('+u.username+')');break}
   case 'uedit':UI.uedit=id;UI.udel=null;UI.resetFor=null;break;
   case 'ueditno':UI.uedit=null;break;
   case 'uemailpw':doEmailPw(id).then(()=>render());return;
   case 'udel':UI.udel=id;break;
   case 'udelno':UI.udel=null;break;
   case 'udelok':{const u=S.users.find(x=>x.id===id);UI.udel=null;if(!u||u.id===CU.id)return;
     if(u.role==='admin'&&u.active!==false&&nAdmins()<=1)return toast('There must be at least one active administrator.');
     tomb(id);S.users=S.users.filter(x=>x.id!==id);if(GH.pwq)GH.pwq=GH.pwq.filter(x=>x.id!==id);
     audit('User deleted',u.name+' ('+u.username+(u.email?', '+u.email:'')+')');toast('User deleted. Their past QC entries stay on record.');break}
   case 'ureset':UI.resetFor=id;break;
   case 'ucancel':UI.resetFor=null;break;
   case 'auditmore':AF.limit+=100;break;
   case 'xaudit':return exportAudit();
   case 'nlev':st.nlev=+el.dataset.n;break;
   case 'ainstadd':{let n=pickedName();if(!n)return;st.analysers=st.analysers||[];const base=n;
     const sf=((document.getElementById('an-suffix')||{value:''}).value||'').trim().replace(/[()]/g,'');
     if(sf)n=base+' ('+sf+')';
     let k=2;const root=n;while(st.analysers.some(x=>x.toLowerCase()===n.toLowerCase()))n=sf?root+' '+(k++):base+' ('+(k++)+')';
     st.analysers.push(n);st.amods=st.amods||{};st.amods[n]=(AMODS[baseName(base)]||[]).slice();st.analyser='';st.analyserOther='';if(n!==base&&!sf)toast('Added as "'+n+'" so the two units can be told apart. Use Rename to give it a label.');break}
   case 'anren':UI.renI=+el.dataset.i;break;
   case 'anrencancel':UI.renI=null;break;
   case 'anrensave':{const i=+el.dataset.i,old=st.analysers[i],nw=((document.querySelector('[data-anrenv]')||{value:''}).value||'').trim().replace(/\s+/g,' ');
     if(!nw)return toast('Enter a name.');if(nw===old){UI.renI=null;break}
     if(st.analysers.some((x,j)=>j!==i&&x.toLowerCase()===nw.toLowerCase()))return toast('Another analyser in this department already has that name.');
     st.analysers[i]=nw;if(st.amods&&st.amods[old]!==undefined){st.amods[nw]=st.amods[old];delete st.amods[old]}
     DA().forEach(a=>{if(a.inst===old)a.inst=nw});if(UI.inst===old)UI.inst=nw;if(UI.cinst===old)UI.cinst=nw;
     audit('Analyser renamed',old+' to '+nw);UI.renI=null;toast('Renamed to "'+nw+'".');break}
   case 'ainstdel':{const i=+el.dataset.i,n=st.analysers[i];if(n==null)break;st.analysers.splice(i,1);
     const moved=DA().filter(a=>a.inst===n);delete st.amods[n];moved.forEach(a=>{a.inst=st.analysers[0]||'';a.mod=defMod(a.name,a.inst)});
     if(moved.length)toast(moved.length+' analyte'+(moved.length>1?'s':'')+' moved to '+(st.analysers[0]||'no analyser')+'. Check step 3.');break}
   case 'back':st.step--;break;
   case 'next':
     if(st.step===1&&st.adding&&(S.depts||[]).some(d=>d.id!==st.cur&&d.dept===st.dept&&d.sub===st.sub))return toast(st.dept+dsub(st.sub)+' is already set up. Choose another department or sub-department.');
     if(st.step===2){
       const keep=new Set(chosenList().map(c=>c.name)),drop=DA().filter(a=>!keep.has(a.name)&&S.results.some(r=>r.aid===a.id));
       if(drop.length){const key=drop.map(a=>a.id).join();if(UI.dropOK!==key){UI.dropOK=key;return toast('Removing '+drop.map(a=>a.name).join(', ')+' deletes its saved QC results. Press Next again to confirm.')}}
       UI.dropOK=null;buildAnalytes();
     }
     if(st.step===4){st.done=true;if(st.adding){st.adding=false;audit('Department added',st.dept+dsub(st.sub)+' · '+analyserName()+' · '+DA().length+' analytes');UI.editing=false;S.tab='setup';save();render();window.scrollTo(0,0);return toast(st.dept+' added.')}audit('Setup saved',st.dept+' · '+st.sub+' · '+analyserName()+' · '+DA().length+' analytes');UI.editing=false;S.tab=S.tab==='setup'?'setup':'today';save();render();window.scrollTo(0,0);return toast('Setup saved.')}
     st.step++;break;
   case 'panelall':{const p=panelsNow().find(x=>x.name===el.dataset.p),s=st.sel[p.name]||(st.sel[p.name]={}),all=p.items.every(i=>s[i.name]||isAdded(i.name));p.items.forEach(i=>s[i.name]=(all&&!isAdded(i.name))?0:1);break}
   case 'cpnew':{const n=document.getElementById('newpanel').value.trim();if(!n)return toast('Give the panel a name.');
     if(st.cpanels.some(c=>c.name.toLowerCase()===n.toLowerCase())||panelsNow().some(p=>p.name.toLowerCase()===n.toLowerCase()))return toast('A panel with that name already exists.');
     st.cpanels.push({id:uid(),name:n,items:[]});break}
   case 'cpadd':{const ci=+el.dataset.ci,n=document.getElementById('cpn-'+ci).value.trim();if(!n)return toast('Enter the analyte name.');
     const low=n.toLowerCase();
     if(st.cpanels.some(c=>c.items.some(x=>x.name.toLowerCase()===low))||panelsNow().some(p=>p.items.some(x=>x.name.toLowerCase()===low)))return toast(n+' is already in a panel. Each analyte can sit in one panel.');
     st.cpanels[ci].items.push({name:n,unit:document.getElementById('cpu-'+ci).value.trim(),on:true});break}
   case 'cpall':{const cp=st.cpanels[+el.dataset.ci],all=cp.items.every(x=>x.on!==false);cp.items.forEach(x=>x.on=isAdded(x.name)?true:!all);break}
   case 'cprem':{const it=st.cpanels[+el.dataset.ci].items[+el.dataset.ii];if(it&&isAdded(it.name))break;st.cpanels[+el.dataset.ci].items.splice(+el.dataset.ii,1);break}
   case 'cpdel':{if(st.cpanels[+el.dataset.ci].items.some(x=>isAdded(x.name)))break;st.cpanels.splice(+el.dataset.ci,1);break}
   case 'edit':UI.editing=true;st.step=+el.dataset.n;if(st.step>=3)buildAnalytes();break;
   case 'papply':{const card=el.closest('.panelcard');let any=false;
     DA().filter(a=>a.panel===el.dataset.p&&(card.dataset.g==null||(instOf(a)||'No analyser')===card.dataset.g)).forEach(a=>a.targets[0].levels.slice(0,a.nlev).forEach((l,i)=>{const m=card.querySelector(`[data-pm="${i}"]`),lo=card.querySelector(`[data-pl="${i}"]`);const pe=card.querySelector(`[data-pe="${i}"]`);if(m&&m.value.trim()){l.material=m.value.trim();l.lot=lo?lo.value.trim():'';if(pe&&pe.value)l.exp=pe.value;any=true}}));
     if(!any){toast('Enter at least one QC material first.');return}break}
   case 'closesetup':{if(st.adding){const id=st.cur;tomb(id,...S.analytes.filter(a=>a.dept===id).map(a=>a.id));S.analytes=S.analytes.filter(a=>a.dept!==id);S.depts=S.depts.filter(d=>d.id!==id);if(S.drules)delete S.drules[id];const pv=st.prevCur;st.adding=false;st.cur='';if(pv)loadCtx(pv);toast('Department not added.')}UI.editing=false;break}
   case 'newlab':UI.setupNew=true;break;
   case 'svcopen':e.preventDefault();UI.auth='conn';UI.ghMsg='';UI.ghDraft=null;break;
   case 'reqopen':e.preventDefault();UI.auth='request';UI.authMsg='';UI.reqDone=false;break;
   case 'rqapprove':UI.appr=id;break;
   case 'rqcancel':UI.appr=null;break;
   case 'rqreject':{const r=S.requests.find(x=>x.id===id);if(r){r.status='declined';r.by=CU.name;r.decidedAt=nowIso();audit('Access request declined',r.name+' <'+r.email+'>');}break}
   case 'rqconfirm':approveReq(id).then(()=>render());return;
   case 'credok':UI.lastCred=null;break;
   case 'copycred':{const c=UI.lastCred;if(c){try{navigator.clipboard.writeText(mailBody(c)).then(()=>toast('Message copied.'),()=>toast('Copy failed.'))}catch(x){toast('Copy failed.')}}return}
   case 'svcdisc':{GH={};ghSaveCfg();setCred(null);GHS.lastHash=null;GHS.sha=null;GHS.st='idle';GHS.msg='';audit('Sync service disconnected on this device','');break}
   case 'svccopy':{const l=location.href.split('#')[0]+'#svc='+encodeURIComponent(GH.svc||'');try{navigator.clipboard.writeText(l).then(()=>toast('Link copied.'),()=>toast('Copy failed.'))}catch(x){toast('Copy failed.')}return}
   case 'ghopen':e.preventDefault();UI.auth='gh';UI.ghMsg='';break;
   case 'ghsync':ghSync();return;
   case 'ghoff':{GH={};ghSaveCfg();GHS.lastHash=null;GHS.sha=null;GHS.st='idle';GHS.msg='';audit('GitHub storage disconnected on this device','');break}
   case 'asgall':{const l=DA().filter(a=>(instOf(a)||'No analyser')===el.dataset.g&&(!el.dataset.hasm||(a.mod||'')===el.dataset.m)),on=l.every(a=>UI.asg[a.id]);l.forEach(a=>{if(on)delete UI.asg[a.id];else UI.asg[a.id]=1});break}
   case 'asgmove':if(asgMove())return;break;
   case 'asgcopy':if(asgMove(true))return;break;
   case 'adddept':{syncCtx();const used=new Set((S.depts||[]).map(d=>d.dept)),d0=DEPTS.find(x=>!used.has(x))||DEPTS[0];
     st.prevCur=st.cur;st.cur=uid();S.depts.push({id:st.cur});st.dept=d0;st.sub=Object.keys(CAT[d0].subs)[0];st.analyser='';st.analyserOther='';st.analysers=[];st.amods={};st.sel={};st.selFor='';st.cpanels=[];st.adding=true;st.step=1;UI.editing=true;syncCtx();break}
   case 'today':UI.date=todayStr();UI.report=[];break;
   case 'gotodate':UI.date=el.dataset.d;UI.report=[];UI.skipOpen=null;window.scrollTo(0,0);break;
   case 'missmore':UI.missDays=(UI.missDays||14)+30;break;
   case 'dayprev':case 'daynext':{const [y,m,d]=UI.date.split('-').map(Number),dt=new Date(y,m-1,d+(act==='dayprev'?-1:1),12),ns=dstr(dt);if(ns>todayStr())return;UI.date=ns;UI.report=[];UI.skipOpen=null;break}
   case 'saveqc':saveQC();break;
   case 'deldept':UI.delDept=true;break;
   case 'deldeptno':UI.delDept=false;break;
   case 'deldeptok':{UI.delDept=false;if(!isAdmin())return;if(deptList().length<2)return toast('There must be at least one department.');
     const id=st.cur,nm=st.dept,ids=S.analytes.filter(a=>a.dept===id).map(a=>a.id),nr=S.results.filter(r=>ids.includes(r.aid)).length;
     tomb(id,...ids);S.analytes=S.analytes.filter(a=>a.dept!==id);S.results=S.results.filter(r=>!ids.includes(r.aid));S.skips=S.skips.filter(s=>!ids.includes(s.aid));S.est=(S.est||[]).filter(e=>!ids.includes(e.aid));
     S.depts=S.depts.filter(d=>d.id!==id);S.users.forEach(u=>{if(Array.isArray(u.depts)&&u.depts.includes(id)){u.depts=u.depts.filter(x=>x!==id);u.mod=nowIso()}});
     const nx=S.depts.find(d=>d.dept);if(nx){st.cur='';loadCtx(nx.id)}UI.dept='';UI.inst='';UI.mod='';
     audit('Department deleted',nm+' ('+ids.length+' analytes, '+nr+' results)',null,[]);toast(nm+' deleted.');break}
   case 'matnew':UI.mdr={id:'',name:'',depts:[],levels:[blankMatLv(),blankMatLv()]};UI.mAp=null;break;
   case 'matedit':{const m=matList().find(x=>x.id===id);if(m){UI.mdr={id:m.id,name:m.name,depts:(m.depts||[]).slice(),levels:m.levels.map(l=>({...l}))};UI.mAp=null}break}
   case 'matcancel':UI.mdr=null;break;
   case 'matsave':{const d=UI.mdr;if(!d)break;const nm=(d.name||'').trim();if(!nm)return toast('Give this QC product a name.');
     if((S.materials||[]).some(x=>x.id!==d.id&&x.name.toLowerCase()===nm.toLowerCase()))return toast('A QC material with that name already exists.');
     if(d.levels.some(l=>!(l.material||'').trim()))return toast('Every level needs a material name.');
     const rec={id:d.id||uid(),name:nm,levels:d.levels.map(l=>({material:l.material.trim(),lot:(l.lot||'').trim(),exp:l.exp||''}))};
     S.materials=S.materials||[];const i=S.materials.findIndex(x=>x.id===rec.id);
     if(isAdmin())rec.depts=(d.depts||[]).slice();else if(i>=0)rec.depts=(S.materials[i].depts||[]).slice();else rec.depts=Array.isArray(CU.depts)?CU.depts.slice():[];
     if(i>=0)Object.assign(S.materials[i],rec);else S.materials.push(rec);
     audit(i>=0?'QC material edited':'QC material added',nm+' ('+matDeptTxt(rec)+')',null,rec.depts);UI.mdr=null;toast('QC material saved.');break}
   case 'matdel':UI.mdel=id;break;
   case 'matdelno':UI.mdel=null;break;
   case 'matdelok':{const m=matList().find(x=>x.id===id);UI.mdel=null;if(m){tomb(id);S.materials=S.materials.filter(x=>x.id!==id);audit('QC material deleted',m.name,null,[]);toast('Deleted. Tests that already use it keep their values.')}break}
   case 'matapply':UI.mAp={id,sel:{}};UI.mdr=null;break;
   case 'matapplycancel':UI.mAp=null;break;
   case 'matselall':if(UI.mAp){VA().forEach(a=>UI.mAp.sel[a.id]=1)}break;
   case 'matselnone':if(UI.mAp)UI.mAp.sel={};break;
   case 'matrun':{const m=matList().find(x=>x.id===id),ap=UI.mAp;if(!m||!ap)break;const list=VA().filter(a=>ap.sel[a.id]);if(!list.length)return toast('Tick at least one test.');
     const n=applyMat(m,list,'cur');audit('QC material applied',m.name+' to '+n+' test'+(n===1?'':'s')+': '+list.slice(0,8).map(a=>a.name).join(', ')+(list.length>8?' and more':''));UI.mAp=null;toast(m.name+' applied to '+n+' test'+(n===1?'':'s')+'.');break}
   case 'matpanel':{const m=matList().find(x=>x.id===(document.querySelector('[data-matsel="'+el.dataset.p+'"]')||{}).value),p=el.dataset.p;if(!m)return toast('Choose a saved QC material first.');
     const list=DA().filter(a=>a.panel===p);const n=applyMat(m,list,'first');audit('QC material applied',m.name+' to panel '+p+' ('+n+' tests)');toast(m.name+' applied to '+n+' tests.');break}
   case 'resmore':UI.resLimit=(UI.resLimit||15)+30;break;
   case 'rcustom':{const D=rdeptSel();if(!D||!isAdmin())break;S.drules=S.drules||{};S.drulesAt=S.drulesAt||{};S.drules[D]=JSON.parse(JSON.stringify(S.rules||{}));S.drulesAt[D]=nowIso();audit('Department rules set',rdeptName(D)+' now has its own Westgard rules, copied from the laboratory rules',null,[D]);toast(rdeptName(D)+' now has its own rules.');break}
   case 'rreset':{const D=rdeptSel();if(!D||!isAdmin())break;S.drules=S.drules||{};S.drulesAt=S.drulesAt||{};S.drules[D]=null;S.drulesAt[D]=nowIso();audit('Department rules removed',rdeptName(D)+' follows the laboratory Westgard rules again',null,[D]);toast(rdeptName(D)+' follows the laboratory rules again.');break}
   case 'csubadd':{const nm=((document.getElementById('csub-name')||{}).value||'').trim().replace(/\s+/g,' '),er=document.getElementById('csub-err');
     const bad=m=>{if(er){er.textContent=m;er.hidden=false}return true};
     if(!nm){bad('Enter a name for the sub-department.');return}
     if(subList(st.dept).some(x=>x.toLowerCase()===nm.toLowerCase())){st.sub=subList(st.dept).find(x=>x.toLowerCase()===nm.toLowerCase());st.selFor='';UI.csub=false;toast(nm+' already exists. It is selected.');break}
     st.sub=nm;st.selFor='';UI.csub=false;toast('Sub-department "'+nm+'" added. Create its panels in the next step.');break}
   case 'csubno':UI.csub=false;break;
   case 'cdeptadd':{const nm=((document.getElementById('cdept-name')||{}).value||'').trim().replace(/\s+/g,' '),er=document.getElementById('cdept-err');
     if(!nm){if(er){er.textContent='Enter a name for the department.';er.hidden=false}return}
     const have=deptChoices().find(x=>x.toLowerCase()===nm.toLowerCase());
     st.dept=have||nm;st.sub=defSub(st.dept);st.analyser='';st.analysers=[];st.amods={};st.selFor='';UI.cdept=false;toast('Department "'+st.dept+'" selected.');break}
   case 'cdeptno':UI.cdept=false;break;
   case 'drnstart':UI.drn=true;break;
   case 'drncancel':UI.drn=false;break;
   case 'drnsave':{if(!isAdmin())return;const nm=((document.getElementById('drn-name')||{}).value||'').trim().replace(/\s+/g,' ');
     if(!nm)return toast('Enter a name for the department.');
     if(deptList().some(d=>d.id!==st.cur&&d.dept.toLowerCase()===nm.toLowerCase()&&(d.sub||'')===(st.sub||'')))return toast('Another department already has that name.');
     const old=st.dept;st.dept=nm;syncCtx();audit('Department renamed',old+' to '+nm,null,[st.cur]);UI.drn=false;toast('Department renamed to '+nm+'.');break}
   case 'donetoggle':UI.doneOpen=!UI.doneOpen;break;
   case 'obsave':saveOther();break;
   case 'obsaveone':saveOther(id);break;
   case 'obmode':obState().mode=el.dataset.m;break;
   case 'saveone':saveQC(id);break;
   case 'skip':stashDrafts();UI.skipOpen=id;break;
   case 'skipcancel':UI.skipOpen=null;break;
   case 'skipok':{const a=anOf(id);S.skips=S.skips.filter(s=>!(s.aid===id&&s.date===UI.date));const rsn=document.getElementById('skr-'+id).value.trim();S.skips.push({aid:id,date:UI.date,reason:rsn,...stampNow()});audit('Marked not performed',a.name+' on '+fmtDate(UI.date)+(rsn?': '+rsn:''));UI.skipOpen=null;save();toast(a.name+' marked as not performed on '+fmtDate(UI.date)+'.');break}
   case 'unskip':audit('Not performed undone',(anOf(id)||{}).name+' on '+fmtDate(UI.date));S.skips=S.skips.filter(s=>!(s.aid===id&&s.date===UI.date));break;
   case 'override':{const c=document.getElementById('ov-'+id).value.trim();if(!c){toast('Write a comment before overriding.');return}
     const r=S.results.find(x=>x.id===id),st0=stampNow();r.ov={comment:c,...st0};
     // a trend or shift covers a whole run of points: dismissing one dismisses the rest of that run
     const an=anOf(r.aid),fl0=allFlags();let extra=0;
     if(an)patternsFor(an,r.lv,S.results).forEach(p=>{if(!patFlagged(p).includes(r.id))return;r.ov.pattern=p.kind;patFlagged(p).forEach(pid=>{const q=S.results.find(x=>x.id===pid);if(q&&!q.ov&&(fl0[q.id]||[]).every(x=>x.sev!=='reject')){q.ov={comment:c,pattern:p.kind,...st0};extra++}})});
     audit('Override',(anOf(r.aid)||{}).name+' '+levelName(r.lv)+' '+fmtDate(r.date)+' value '+r.value+(extra?' (and '+extra+' more point'+(extra>1?'s':'')+' in the same trend or shift)':'')+': '+c);save();toast('Override recorded with your comment.');break}
   case 'povr':{const k=el.dataset.k,box=[...document.querySelectorAll('[data-pk]')].find(x=>x.getAttribute('data-pk')===k),c=(box&&box.value||'').trim();
     if(!c){toast('Write a comment before overriding.');return}
     const {a,lv,p}=patternFind(k);if(!p)break;const fl=allFlags();let n=0;
     patFlagged(p).forEach(id=>{const r=S.results.find(x=>x.id===id);if(r&&!r.ov&&statusOf(fl,r)==='warn'){r.ov={comment:c,pattern:p.kind,...stampNow()};n++}});
     audit('Override',a.name+' '+levelName(lv)+' '+(p.kind==='trend'?'trend':'shift')+' '+fmtDate(p.from)+' to '+fmtDate(p.to)+': '+c,null,[a.dept]);UI.pOpen=k;save();toast((p.kind==='trend'?'Trend':'Shift')+' overridden with your comment.');break}
   case 'punover':{const k=el.dataset.k,{a,lv,p}=patternFind(k);if(!p)break;
     patFlagged(p).forEach(id=>{const r=S.results.find(x=>x.id===id);if(r&&r.ov&&r.ov.pattern===p.kind)r.ov=null});
     audit('Override removed',a.name+' '+levelName(lv)+' '+(p.kind==='trend'?'trend':'shift')+' '+fmtDate(p.from),null,[a.dept]);break}
   case 'unoverride':{const r=S.results.find(x=>x.id===id);r.ov=null;audit('Override removed',(anOf(r.aid)||{}).name+' '+levelName(r.lv)+' '+fmtDate(r.date));break}
   case 'delres':{tomb(id);const r=S.results.find(x=>x.id===id);if(r)audit('QC result deleted',(anOf(r.aid)||{}).name+' '+levelName(r.lv)+' '+fmtDate(r.date)+' value '+r.value+(r.byName?' (entered by '+r.byName+')':''))}UI.draft={};S.results=S.results.filter(x=>x.id!==id);UI.report=UI.report.filter(x=>x!==id);break;
   case 'lot':UI.modal={aid:id};break;
   case 'expopen':UI.modal={exp:true};break;
   case 'expapply':if(expApply(+el.dataset.g))return;break;
   case 'expdis':if(expDismiss(+el.dataset.g))return;break;
   case 'tedit':UI.modal={aid:id,tedit:+el.dataset.i};UI.thOpen=id;break;
   case 'teditsave':if(saveTargetEdit())return;break;
   case 'tdel':UI.tdel={aid:id,i:+el.dataset.i};UI.thOpen=id;break;
   case 'tdelno':UI.tdel=null;break;
   case 'tdelok':{const a=anOf(id),i=+el.dataset.i,t=a&&a.targets[i];UI.tdel=null;if(!a||!t||i===0)break;
     a.targets.splice(i,1);audit('Target change deleted',a.name+': '+(t.type||'Target change')+' effective '+fmtDate(t.from)+' ('+t.levels.slice(0,a.nlev).map(l=>[l.material,l.lot,l.mean,l.sd].join('/')).join(' | ')+')',null,[a.dept]);UI.thOpen=id;toast('Lot change deleted. Earlier targets now apply from that date.');break}
   case 'addopen':{const f=DA().find(x=>x.panel===el.dataset.p);UI.modal={add:true,panel:el.dataset.p,n:f?f.nlev:st.nlev};break}
   case 'sugg':{const rp=panelsNow().find(p=>p.name===el.dataset.p),it=rp.items.find(i=>i.name===el.dataset.n),f=DA().find(x=>x.panel===el.dataset.p);
     UI.modal={add:true,panel:el.dataset.p,n:f?f.nlev:st.nlev,name:it.name,unit:st.units[it.name]!=null?st.units[it.name]:it.unit};break}
   case 'addsave':if(saveAdd())return;break;
   case 'aedit':UI.modal={edit:id};break;
   case 'aeditsave':if(saveEdit())return;break;
   case 'arem':if(nRes(id)&&UI.confirmDel!==id){UI.confirmDel=id;break}{const an=anOf(id);audit('Analyte removed',an?an.name+' ('+an.panel+')'+(nRes(id)?' with '+nRes(id)+' results':''):'');}removeAnalyte(id);UI.confirmDel=null;toast('Analyte removed.');break;
   case 'arcancel':UI.confirmDel=null;break;
   case 'mnp':{const n=document.getElementById('mnewpanel').value.trim();if(!n)return toast('Give the panel a name.');
     if(panelNames().concat(panelsNow().map(p=>p.name)).some(x=>x.toLowerCase()===n.toLowerCase()))return toast('A panel with that name already exists.');
     st.cpanels.push({id:uid(),name:n,items:[]});toast('Panel created. Use Add analyte to put tests in it.');break}
   case 'pdel':{const pn=el.dataset.p,ids=DA().filter(a=>a.panel===pn).map(a=>a.id);
     if(UI.confirmDel!=='p:'+pn){UI.confirmDel='p:'+pn;break}
     const nr=ids.reduce((n,i)=>n+nRes(i),0);audit('Panel deleted',pn+' ('+ids.length+' analytes, '+nr+' results)');
     ids.forEach(removeAnalyte);st.cpanels=st.cpanels.filter(c=>c.name!==pn);if(st.sel)delete st.sel[pn];UI.confirmDel=null;toast('Panel deleted.');break}
   case 'mclose':UI.modal=null;UI.lateReason=null;break;
   case 'lateok':{const v=(document.getElementById('late-note')||{value:''}).value.trim();if(!v){const e=document.getElementById('late-err');e.textContent='Write a reason before saving.';e.hidden=false;return}UI.lateReason=v;UI.modal=null;saveQC(UI.saveScope);render();return}
   case 'msave':return saveLot()||render();
   case 'xl':{const a=anOf(id);return exportXlsx([a],'QCLens-'+a.name.replace(/[^\w-]+/g,'_')+'-'+todayStr()+'.xlsx')}
   case 'xlall':return exportXlsx(VA(),'QCLens-all-analytes-'+todayStr()+'.xlsx');
   case 'backup':return backupJson();
   case 'reset1':UI.confirmReset=true;break;
   case 'reset0':UI.confirmReset=false;break;
   case 'reset2':{const keep={u:S.users,a:S.audit};S=blank();S.users=keep.u;S.audit=keep.a;audit('Data reset','All setup and QC data deleted');}UI.confirmReset=false;UI.editing=false;UI.draft={};break;
  }
  save();render();
});
document.addEventListener('change',e=>{
  if(CU&&sgChange(e))return;
  if(estChange(e))return;
  const t=e.target,st=S.setup,d=t.dataset;
  if(!CU)return;
  if(d.mf!==undefined||d.mn!==undefined||d.ml!==undefined||d.masel!==undefined||d.mdept!==undefined){if(!perm('e_materials'))return;
    if(d.mdept!==undefined&&UI.mdr&&isAdmin()){const a=UI.mdr.depts||(UI.mdr.depts=[]);UI.mdr.depts=t.checked?[...new Set([...a,d.mdept])]:a.filter(x=>x!==d.mdept);return}
    if(d.mf!==undefined&&UI.mdr)UI.mdr[d.mf]=t.value;
    else if(d.mn!==undefined&&UI.mdr){const n=+t.value;while(UI.mdr.levels.length<n)UI.mdr.levels.push(blankMatLv());UI.mdr.levels.length=n;return render()}
    else if(d.ml!==undefined&&UI.mdr){const [i,f]=d.ml.split(':');UI.mdr.levels[+i][f]=t.value}
    else if(d.masel!==undefined&&UI.mAp){UI.mAp.sel[d.masel]=t.checked?1:0;return render()}
    return}
  if(d.ob!==undefined){if(!perm('e_other'))return;UI.obd=UI.obd||{};UI.obd[d.ob]=t.value;return}
  if(/^ob-/.test(t.id)){if(!perm('e_other'))return;const o=obState();
    if(t.id==='ob-aid')o.aid=t.value;else if(t.id==='ob-from')o.from=t.value||o.from;else if(t.id==='ob-to')o.to=t.value||o.to;else if(t.id==='ob-sched')o.sched=t.checked;else if(t.id==='ob-day')o.day=t.value||o.day;else if(t.id==='ob-all')o.all=t.checked;
    else if(t.id==='ob-inst'){o.inst=t.value;o.mod=''}else if(t.id==='ob-mod')o.mod=t.value;
    return render()}
  if(d.perm){if(!isAdmin())return;const [r,k]=d.perm.split(':'),def=PERMDEF.find(x=>x.k===k);if(!def||!(r==='tech'||r==='sup'||r==='cons'))return;S.perms=S.perms||{};S.perms[r]=S.perms[r]||{};S.perms[r][k]=t.checked;S.permsAt=nowIso();audit('Permissions changed',(r==='sup'?'Supervisory technologist':r==='cons'?'Consultant / Resident':'Technologist')+': '+def.l+' '+(t.checked?'allowed':'not allowed'),null,[]);save();return render()}
  if(!perm('e_setup')&&!(t.id==='qcdate'||/^(instf|deptf|modf|cinst|cmod)$/.test(t.id)||t.id==='cid'||t.id==='win'||/^(m-|ac-)/.test(t.id)))return;
  if(t.id==='af-user'){AF.user=t.value;AF.limit=100;return render()}
  if(t.id==='af-act'){AF.act=t.value;AF.limit=100;return render()}
  if(t.id==='af-from'){AF.from=t.value;AF.limit=100;return render()}
  if(t.id==='af-to'){AF.to=t.value;AF.limit=100;return render()}
  if(d.rscope){if(!isAdmin())return;const tg=rdTarget();if(!tg)return render();const v=t.value;if(v==='within'||v==='across')tg.obj[d.rscope+'@']=v;else delete tg.obj[d.rscope+'@'];tg.stamp();audit('Westgard rule scope changed',RULES[d.rscope].name+': '+SCOPE_TXT[v==='within'||v==='across'?v:'both']+' ('+tg.label+')',null,tg.depts);save();return render()}
  if(d.rulet){if(!isAdmin())return;const tg=rdTarget();if(!tg)return render();const on=t.checked;if(on)delete tg.obj[d.rulet];else tg.obj[d.rulet]=false;tg.stamp();audit('Westgard rule '+(on?'switched on':'switched off'),RULES[d.rulet].name+' ('+tg.label+')',null,tg.depts);save();return render()}
  if(t.id==='rdept'){UI.rdept=t.value;return render()}
  if((d.udept||d.urole)&&!isAdmin())return;
  if(d.path==='dept'&&!isAdmin())return;
  if(d.udept){const [uid_,did]=d.udept.split(':'),u=S.users.find(x=>x.id===uid_);if(!u)return;
    const cur=Array.isArray(u.depts)?u.depts.slice():deptList().map(x=>x.id);
    u.depts=t.checked?[...new Set([...cur,did])]:cur.filter(x=>x!==did);u.mod=nowIso();
    const nm=(deptList().find(x=>x.id===did)||{}).dept;audit('User departments changed',u.name+': '+(t.checked?'added ':'removed ')+nm+' ('+(u.depts.map(i=>(deptList().find(x=>x.id===i)||{}).dept).join(', ')||'none')+')');save();return render()}
  if(d.urole){const u=S.users.find(x=>x.id===d.urole);if(!u)return;
    if(u.role==='admin'&&t.value!=='admin'&&nAdmins()<=1){toast('There must be at least one active administrator.');return render()}
    audit('Role changed',u.name+': '+roleName(u.role).toLowerCase()+' to '+roleName(t.value).toLowerCase());u.role=t.value;u.mod=nowIso();save();return render()}
  if(t.id==='e-matlib'||t.id==='m-matlib'||t.id==='t-matlib'){const pf=t.id[0],ml=matList().find(x=>x.id===t.value),a=UI.modal&&(pf==='e'?UI.modal.edit:UI.modal.aid)?anOf(pf==='e'?UI.modal.edit:UI.modal.aid):null;
    if(ml&&a){const k=Math.min(a.nlev,ml.levels.length),set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v};
      for(let i=0;i<k;i++){set(pf+'-mat-'+i,ml.levels[i].material||'');set(pf+'-lot-'+i,ml.levels[i].lot||'');set(pf+'-exp-'+i,ml.levels[i].exp||'')}
      toast(ml.name+' filled in for '+k+' level'+(k===1?'':'s')+(ml.levels.length<a.nlev?'. This analyte has more levels, fill in the rest by hand.':'.'))}
    t.value='';return}
  if(d.mre!==undefined&&UI.modal&&UI.modal.add){const dr=readAdd();UI.modal.d=dr;if(t.id==='a-n')UI.modal.n=+t.value;
    if(t.id==='a-matlib'&&t.value){const ml=matList().find(x=>x.id===t.value);if(ml){UI.modal.n=ml.levels.length;ml.levels.forEach((l,i)=>{dr.mats[i]=l.material||'';dr.lots[i]=l.lot||'';dr.exps[i]=l.exp||''});toast(ml.name+' filled in. Enter the mean and SD for each level.')}}
    if(t.id==='a-pick'&&t.value){const [pp,nn]=t.value.split('|'),it=panelsNow().find(p=>p.name===pp).items.find(i=>i.name===nn);dr.name=it.name;dr.unit=st.units[it.name]!=null?st.units[it.name]:it.unit}
    return render()}
  if(d.aunit){setUnit(anOf(d.aunit),t.value.trim());save();return}
  if(d.rnp){const oldN=d.rnp,v=t.value.trim(),cp=st.cpanels.find(c=>c.name===d.rnp);
    if(!v||(v!==d.rnp&&panelNames().concat(panelsNow().map(p=>p.name)).some(x=>x.toLowerCase()===v.toLowerCase()))){toast(v?'A panel with that name already exists.':'Panel name cannot be empty.');return render()}
    DA().forEach(a=>{if(a.panel===d.rnp)a.panel=v});cp.name=v;save();document.querySelectorAll('[data-rnp]').forEach(x=>{if(x.getAttribute('data-rnp')===oldN){x.setAttribute('data-rnp',v);x.value=v}});document.querySelectorAll('[data-p]').forEach(x=>{if(x.getAttribute('data-p')===oldN)x.setAttribute('data-p',v)});return}
  if(d.path==='sub'&&t.value==='__new'){UI.csub=true;return render()}
  if(d.path==='sub'&&t.value==='__none'){UI.csub=false;st.sub='';st.selFor='';save();return render()}
  if(d.path==='dept'&&t.value==='__newdept'){UI.cdept=true;return render()}
  if(d.path){UI.csub=false;st[d.path]=t.value;
    if(d.path==='dept'){UI.cdept=false;st.sub=defSub(t.value);st.analyser='';st.analysers=[];st.amods={};st.selFor=''}
    if(d.path==='sub')st.selFor='';
    save();return render()}
  if(d.an){const [p,n]=d.an.split('|');(st.sel[p]||(st.sel[p]={}))[n]=t.checked?1:0;save();return render()}
  if(d.cu!==undefined){const [ci,ii]=d.cu.split(':');st.cpanels[+ci].items[+ii].on=t.checked;save();return render()}
  if(d.unit!==undefined){const def=panelsNow().flatMap(p=>p.items).find(i=>i.name===d.unit),v=t.value.trim();
    if(def&&v===def.unit)delete st.units[d.unit];else st.units[d.unit]=v;save();return}
  if(d.cunit!==undefined){const [ci,ii]=d.cunit.split(':');st.cpanels[+ci].items[+ii].unit=t.value.trim();save();return}
  if(d.sched){const a=anOf(d.sched);a.schedule={type:t.value,days:t.value==='weekdays'?[1]:undefined,every:2,start:todayStr()};save();return render()}
  if(d.psched){if(!t.value)return;const g0=(t.closest('.panelcard')||{dataset:{}}).dataset.g;DA().filter(a=>a.panel===d.psched&&(g0==null||(instOf(a)||'No analyser')===g0)).forEach(a=>a.schedule={type:t.value,days:t.value==='weekdays'?[1,4]:undefined,every:2,start:todayStr()});save();return render()}
  if(d.dow){const [id,dw]=d.dow.split(':'),a=anOf(id),s=a.schedule;s.days=s.days||[];const n=+dw;s.days=t.checked?[...new Set([...s.days,n])]:s.days.filter(x=>x!==n);save();return}
  if(d.every){anOf(d.every).schedule.every=Math.max(2,+t.value||2);save();return}
  if(d.start){anOf(d.start).schedule.start=t.value;save();return}
  if(d.inst){const a=anOf(d.inst);if(a){const v=splitInst(t.value);a.inst=v.inst;a.mod=v.mod;save();if(!UI.editing)render()}return}
  if(d.pinst){if(!t.value)return;const g=(t.closest('.panelcard')||{dataset:{}}).dataset.g,v=splitInst(t.value);DA().filter(a=>a.panel===d.pinst&&(g==null||(instOf(a)||'No analyser')===g)).forEach(a=>{a.inst=v.inst;a.mod=v.mod});save();return render()}
  if(d.amod){const k=d.amod.indexOf(':'),i=+d.amod.slice(0,k),m=d.amod.slice(k+1),n=st.analysers[i];if(n==null)return;const l=st.amods[n]||(st.amods[n]=[]);
    if(t.checked){if(!l.includes(m))l.push(m)}else{st.amods[n]=l.filter(x=>x!==m);DA().forEach(a=>{if(a.inst===n&&a.mod===m)a.mod=''})}save();return render()}
  if(d.amodnew!==undefined){const n=st.analysers[+d.amodnew],v=t.value.trim();if(n==null||!v)return;const l=st.amods[n]||(st.amods[n]=[]);if(!l.includes(v))l.push(v);save();return render()}
  if(d.lexp){const [id,lv]=d.lexp.split(':');anOf(id).targets[0].levels[+lv].exp=t.value;save();return refreshNext()}
  if(d.asg){if(t.checked)UI.asg[d.asg]=1;else delete UI.asg[d.asg];const n=Object.keys(UI.asg).length,b=document.querySelector('[data-act="asgmove"]');if(b)b.disabled=!n;return}
  if(t.id==='as-target'){UI.asgT=t.value;return render()}
  if(t.id==='as-new'){UI.asgNew=t.value;UI.asgName='';UI.asgMod='';return render()}
  if(t.id==='as-newmod'){UI.asgMod=t.value;return}
  if(t.id==='as-newname'){UI.asgName=t.value;return}
  if(t.id==='instf'){UI.inst=t.value;UI.mod='';return render()}
  if(t.id==='modf'){UI.mod=t.value;return render()}
  if(t.id==='cinst'){UI.cinst=t.value;UI.cmod='';return render()}
  if(t.id==='cmod'){UI.cmod=t.value;return render()}
  if(t.id==='deptf'){UI.dept=t.value;UI.inst='';UI.mod='';return render()}
  if(t.id==='deptsw'){if(!canSeeD(t.value))return;syncCtx();loadCtx(t.value);save();return render()}
  if(d.llot){const [id,lv]=d.llot.split(':');anOf(id).targets[0].levels[+lv].lot=t.value.trim();save();return}
  if(d.lmat){const [id,lv]=d.lmat.split(':');anOf(id).targets[0].levels[+lv].material=t.value.trim();save();return refreshNext()}
  if(d.nlev){const a=anOf(d.nlev);a.nlevCustom=true;setLevels(a,+t.value);save();return render()}
  if(d.tg){const [id,lv,f]=d.tg.split(':');anOf(id).targets[0].levels[+lv][f]=num(t.value);save();return refreshNext()}
  if(t.id==='qcdate'){UI.date=t.value||todayStr();UI.report=[];UI.skipOpen=null;return render()}
  if(t.id==='cid'){UI.cid=t.value;return render()}
  if(t.id==='win'){UI.win=+t.value;return render()}
  if(t.id==='restore'&&t.files[0]){const fr=new FileReader();fr.onload=()=>{try{restoreData(JSON.parse(fr.result),'a backup file')}catch(x){toast('That file is not a valid QC backup.')}};fr.readAsText(t.files[0])}
});
document.addEventListener('toggle',e=>{if(e.target.hasAttribute&&e.target.hasAttribute('data-more'))UI.moreOpen=e.target.open;if(e.target.hasAttribute&&e.target.hasAttribute('data-thopen')){const id=e.target.getAttribute('data-thopen');if(e.target.open)UI.thOpen=id;else if(UI.thOpen===id)UI.thOpen=null}},true);
/* chart tooltips */
document.addEventListener('pointerover',e=>{
  const h=e.target.closest&&e.target.closest('.hit');if(!h)return;
  const box=h.closest('.chartbox');let tip=box.querySelector('.tip');
  if(!tip){tip=document.createElement('div');tip.className='tip';box.appendChild(tip)}
  tip.innerHTML=h.dataset.tip;tip.hidden=false;
  const b=box.getBoundingClientRect(),c=h.getBoundingClientRect();
  tip.style.left=Math.min(Math.max(0,c.left-b.left+c.width/2-60),Math.max(0,b.width-190))+'px';
  tip.style.top=(c.top-b.top-tip.offsetHeight-8)+'px';
});
document.addEventListener('pointerout',e=>{const h=e.target.closest&&e.target.closest('.hit');if(h){const t=h.closest('.chartbox').querySelector('.tip');if(t)t.hidden=true}});
if(ghOn()&&(!GH.svc||CRED)){UI.cfgWait=true;render();ghSync().catch(()=>{}).finally(()=>{UI.cfgWait=false;restoreSess();render()})}else{restoreSess();render()}

document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('[data-amodnew]')){e.preventDefault();e.target.dispatchEvent(new Event('change',{bubbles:true}))}});
ghBoot();
