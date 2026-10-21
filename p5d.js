/* ===== Setup summary, main render, events ===== */
function renderSetupHome(){
  if(!canSeeD(S.setup.cur)){const f=visDepts()[0];if(f){syncCtx();loadCtx(f.id)}}
  const st=S.setup,recs=isAdmin()?deptList():visDepts(),mine=DA(),ans=st.analysers||[],d=CAT[st.dept]||{analysers:[]};
  return `<div class="stack"><div class="panel stack"><div class="row" style="justify-content:space-between;align-items:flex-end"><h2>Setup</h2>
    <div class="row">${recs.length>1?`<label class="f">Department<select id="deptsw" style="width:auto;min-width:200px">${recs.map(r=>`<option value="${r.id}"${r.id===st.cur?' selected':''}>${esc(r.dept)}</option>`).join('')}</select></label>`:''}${isAdmin()?'<button class="btn" data-act="adddept">Add department</button>':''}</div></div>
   ${recs.length>1?`<div class="small muted">${recs.map(r=>esc(r.dept)+': '+S.analytes.filter(a=>a.dept===r.id).length+' analytes on '+(r.id===st.cur?ans:r.analysers||[]).length+' analyser'+((r.id===st.cur?ans:r.analysers||[]).length===1?'':'s')).join(' · ')}</div>`:''}
   <div class="panelcard"><div class="grid2"><div><div class="small muted">Department</div><b>${esc(st.dept)}</b> · ${esc(st.sub)}</div>
   <div><div class="small muted">Analytes</div><b>${mine.length}</b> in ${new Set(mine.map(a=>a.panel)).size} panels · 1 to 6 control levels each, set per analyte</div></div>
   <div class="small muted" style="margin-top:12px">Analysers and modules in ${esc(st.dept)}</div>${analyserEditor()}
   <div class="row" style="align-items:flex-end;margin-top:8px"><label class="f" style="flex:1 1 220px">New analyser<select data-path="analyser" data-r>${anOptions(st.dept,st.sub,st.analyser)}</select></label>
    ${st.analyser==='Other'?`<label class="f" style="flex:1 1 220px">Analyser name<input type="text" data-path="analyserOther" value="${esc(st.analyserOther)}" placeholder="Make and model"></label>`:''}
    <button class="btn primary" data-act="ainstadd"${pickedName()?'':' disabled'}>Add analyser</button></div>
   <p class="small muted" style="margin:6px 0 0">A new analyser starts with no analytes. Use <b>Change schedules and analyser assignment</b> to assign analytes to an analyser and module. Adding the same model again names it "(2)" automatically.</p>
   <div class="row" style="margin-top:10px"><button class="btn" data-act="edit" data-n="1">Change analysers or analytes</button><button class="btn" data-act="edit" data-n="3">Change schedules and analyser assignment</button><button class="btn" data-act="edit" data-n="4">Edit starting targets</button></div></div>
   <p class="small muted" style="margin:0">To change a mean or SD for a new lot, use <b>Lot change</b> on the Charts screen. It needs a comment and keeps the history.</p></div>
   ${renderAssign()}${renderManager()}${isAdmin()?renderGithub():''}${isAdmin()?'<div class="panel stack"><h3>Data</h3>':'<div hidden>'}<div class="row"><button class="btn primary" data-act="xlall">Export all analytes to Excel</button><button class="btn" data-act="backup">Save backup file</button>
    <label class="btn" for="restore" style="cursor:pointer">Restore from backup</label><input type="file" id="restore" accept=".json,application/json" hidden></div>
   <p class="small muted" style="margin:0">${ghOn()?'All data is stored in GitHub, not on this device. This browser only keeps changes that have not uploaded yet. A backup file is still a good extra copy.':'Results are stored in this browser on this device. Save a backup file regularly, and before clearing browser data or switching device. Connect cloud storage above to keep everything on GitHub instead.'}</p>
   <div class="row">${UI.confirmReset?'<span class="small">This deletes all setup and QC results.</span><button class="btn danger" data-act="reset2">Yes, delete everything</button><button class="btn" data-act="reset0">Keep my data</button>':'<button class="btn danger" data-act="reset1"'+(ghOn()?' disabled':'')+'>Start over</button>'}${ghOn()?'<span class="small muted">Disconnect GitHub storage first, otherwise the saved copy would restore your data.</span>':''}</div></div></div>`;
}
const app=document.getElementById('app');
function stashDrafts(){UI.draft=UI.draft||{};document.querySelectorAll('[data-in]').forEach(i=>{const k=UI.date+':'+i.dataset.in;if(i.value!=='')UI.draft[k]=i.value;else delete UI.draft[k]})}
function render(){
  const y=window.scrollY;stashDrafts();
  const gate=authGate();if(gate){app.innerHTML=gate;window.scrollTo(0,0);return}
  let h='';
  const setupOn=!S.setup.done||UI.editing;
  const un=S.setup.done?unresolved(allFlags()).length:0;
  h+=`<header class="top"><div class="brand"><h1 class="sr">QCLens</h1><img class="logo" src="${LOGO}" alt="QCLens logo"><span>${S.setup.done?esc((S.setup.lab?S.setup.lab+' · ':'')+(visDepts().length>1?visDepts().map(d=>d.dept).join(', '):visDepts().length===1?visDepts()[0].dept+' · '+analyserNameV():S.setup.sub+' · '+analyserName())):'Levey-Jennings charts and Westgard rules for the clinical laboratory'}</span></div>${userBar()}</header>`;
  if(S.setup.done&&!UI.editing){
    const T=[['today','Today'],['charts','Charts'],['alerts','Alerts'],['limits','Establish limits'],['rules','Westgard rules']];if(canSetup())T.push(['setup','Setup']);if(isAdmin())T.push(['users','Users']);if(canSetup())T.push(['audit','Audit log']);
    if(!T.some(x=>x[0]===S.tab))S.tab='today';
    h+=`<nav class="tabs" role="tablist">${T.map(([k,n])=>`<button role="tab" aria-selected="${S.tab===k}" data-act="tab" data-t="${k}">${n}${k==='alerts'&&un?`<span class="badge">${un}</span>`:''}</button>`).join('')}</nav>`;
    h+=S.tab==='today'?renderToday():S.tab==='charts'?renderCharts():S.tab==='alerts'?renderAlerts():S.tab==='limits'?renderLimits():S.tab==='users'?renderUsers():S.tab==='audit'?renderAudit():S.tab==='rules'?renderRules():renderSetupHome();
  }else h+=renderSetup();
  h+=renderModal();
  app.innerHTML=h;
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
  const ADMIN=new Set(['nlev','back','next','panelall','cpnew','cpadd','cpall','cprem','cpdel','edit','closesetup','papply','addopen','sugg','addsave','arem','arcancel','mnp','pdel','backup','reset1','reset0','reset2','delres','genpw','utoggle','ureset','ucancel','xaudit','auditmore','newrec','ainstadd','ainstdel','adddept','asgall','asgmove','asgcopy','ghsync','ghoff','rulet','rqapprove','rqreject','rqconfirm','rqcancel','credok','copycred','svcdisc','svccopy','udel','udelno','udelok','uedit','ueditno']);
  const ADMONLY=new Set(['uedit','ueditno','udel','udelno','udelok','rqapprove','rqreject','rqconfirm','rqcancel','credok','copycred','svcdisc','svccopy','backup','reset1','reset0','reset2','delres','genpw','utoggle','ureset','ucancel','newrec','adddept','ghsync','ghoff','rulet']);
  if(ADMIN.has(act)&&!(isAdmin()||(isSup()&&!ADMONLY.has(act)&&(act!=='closesetup'||!S.setup.adding))))return;
  if(act.startsWith('est')&&estAct(act,el))return;
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
   case 'ainstadd':{let n=pickedName();if(!n)return;st.analysers=st.analysers||[];const base=n;let k=2;
     while(st.analysers.some(x=>x.toLowerCase()===n.toLowerCase()))n=base+' ('+(k++)+')';
     st.analysers.push(n);st.amods=st.amods||{};st.amods[n]=(AMODS[baseName(base)]||[]).slice();st.analyser='';st.analyserOther='';if(n!==base)toast('Added as "'+n+'" so the two units can be told apart.');break}
   case 'ainstdel':{const i=+el.dataset.i,n=st.analysers[i];if(n==null)break;st.analysers.splice(i,1);
     const moved=DA().filter(a=>a.inst===n);delete st.amods[n];moved.forEach(a=>{a.inst=st.analysers[0]||'';a.mod=defMod(a.name,a.inst)});
     if(moved.length)toast(moved.length+' analyte'+(moved.length>1?'s':'')+' moved to '+(st.analysers[0]||'no analyser')+'. Check step 3.');break}
   case 'back':st.step--;break;
   case 'next':
     if(st.step===1&&st.adding&&(S.depts||[]).some(d=>d.id!==st.cur&&d.dept===st.dept&&d.sub===st.sub))return toast(st.dept+' · '+st.sub+' is already set up. Choose another department or sub-department.');
     if(st.step===2){
       const keep=new Set(chosenList().map(c=>c.name)),drop=DA().filter(a=>!keep.has(a.name)&&S.results.some(r=>r.aid===a.id));
       if(drop.length){const key=drop.map(a=>a.id).join();if(UI.dropOK!==key){UI.dropOK=key;return toast('Removing '+drop.map(a=>a.name).join(', ')+' deletes its saved QC results. Press Next again to confirm.')}}
       UI.dropOK=null;buildAnalytes();
     }
     if(st.step===4){st.done=true;if(st.adding){st.adding=false;audit('Department added',st.dept+' · '+st.sub+' · '+analyserName()+' · '+DA().length+' analytes');UI.editing=false;S.tab='setup';save();render();window.scrollTo(0,0);return toast(st.dept+' added.')}audit('Setup saved',st.dept+' · '+st.sub+' · '+analyserName()+' · '+DA().length+' analytes');UI.editing=false;S.tab=S.tab==='setup'?'setup':'today';save();render();window.scrollTo(0,0);return toast('Setup saved.')}
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
   case 'closesetup':{if(st.adding){const id=st.cur;tomb(id,...S.analytes.filter(a=>a.dept===id).map(a=>a.id));S.analytes=S.analytes.filter(a=>a.dept!==id);S.depts=S.depts.filter(d=>d.id!==id);const pv=st.prevCur;st.adding=false;st.cur='';if(pv)loadCtx(pv);toast('Department not added.')}UI.editing=false;break}
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
   case 'saveqc':saveQC();break;
   case 'skip':stashDrafts();UI.skipOpen=id;break;
   case 'skipcancel':UI.skipOpen=null;break;
   case 'skipok':{const a=anOf(id);S.skips=S.skips.filter(s=>!(s.aid===id&&s.date===UI.date));const rsn=document.getElementById('skr-'+id).value.trim();S.skips.push({aid:id,date:UI.date,reason:rsn,...stampNow()});audit('Marked not performed',a.name+' on '+fmtDate(UI.date)+(rsn?': '+rsn:''));UI.skipOpen=null;save();toast(a.name+' marked as not performed on '+fmtDate(UI.date)+'.');break}
   case 'unskip':audit('Not performed undone',(anOf(id)||{}).name+' on '+fmtDate(UI.date));S.skips=S.skips.filter(s=>!(s.aid===id&&s.date===UI.date));break;
   case 'override':{const c=document.getElementById('ov-'+id).value.trim();if(!c){toast('Write a comment before overriding.');return}
     const r=S.results.find(x=>x.id===id);r.ov={comment:c,...stampNow()};audit('Override',(anOf(r.aid)||{}).name+' '+levelName(r.lv)+' '+fmtDate(r.date)+' value '+r.value+': '+c);save();toast('Override recorded with your comment.');break}
   case 'unoverride':{const r=S.results.find(x=>x.id===id);r.ov=null;audit('Override removed',(anOf(r.aid)||{}).name+' '+levelName(r.lv)+' '+fmtDate(r.date));break}
   case 'delres':{tomb(id);const r=S.results.find(x=>x.id===id);if(r)audit('QC result deleted',(anOf(r.aid)||{}).name+' '+levelName(r.lv)+' '+fmtDate(r.date)+' value '+r.value+(r.byName?' (entered by '+r.byName+')':''))}UI.draft={};S.results=S.results.filter(x=>x.id!==id);UI.report=UI.report.filter(x=>x!==id);break;
   case 'lot':UI.modal={aid:id};break;
   case 'addopen':{const f=DA().find(x=>x.panel===el.dataset.p);UI.modal={add:true,panel:el.dataset.p,n:f?f.nlev:st.nlev};break}
   case 'sugg':{const rp=panelsNow().find(p=>p.name===el.dataset.p),it=rp.items.find(i=>i.name===el.dataset.n),f=DA().find(x=>x.panel===el.dataset.p);
     UI.modal={add:true,panel:el.dataset.p,n:f?f.nlev:st.nlev,name:it.name,unit:st.units[it.name]!=null?st.units[it.name]:it.unit};break}
   case 'addsave':if(saveAdd())return;break;
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
   case 'lateok':{const v=(document.getElementById('late-note')||{value:''}).value.trim();if(!v){const e=document.getElementById('late-err');e.textContent='Write a reason before saving.';e.hidden=false;return}UI.lateReason=v;UI.modal=null;saveQC();render();return}
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
  if(estChange(e))return;
  const t=e.target,st=S.setup,d=t.dataset;
  if(!CU)return;
  if(!canSetup()&&!(t.id==='qcdate'||t.id==='cid'||t.id==='win'||/^(m-|ac-)/.test(t.id)))return;
  if(t.id==='af-user'){AF.user=t.value;AF.limit=100;return render()}
  if(t.id==='af-act'){AF.act=t.value;AF.limit=100;return render()}
  if(t.id==='af-from'){AF.from=t.value;AF.limit=100;return render()}
  if(t.id==='af-to'){AF.to=t.value;AF.limit=100;return render()}
  if(d.rulet){if(!isAdmin())return;S.rules=S.rules||{};const on=t.checked;if(on)delete S.rules[d.rulet];else S.rules[d.rulet]=false;S.rulesAt=nowIso();audit('Westgard rule '+(on?'switched on':'switched off'),RULES[d.rulet].name,null,[]);save();return render()}
  if((d.udept||d.urole)&&!isAdmin())return;
  if(d.path==='dept'&&!isAdmin())return;
  if(d.udept){const [uid_,did]=d.udept.split(':'),u=S.users.find(x=>x.id===uid_);if(!u)return;
    const cur=Array.isArray(u.depts)?u.depts.slice():deptList().map(x=>x.id);
    u.depts=t.checked?[...new Set([...cur,did])]:cur.filter(x=>x!==did);u.mod=nowIso();
    const nm=(deptList().find(x=>x.id===did)||{}).dept;audit('User departments changed',u.name+': '+(t.checked?'added ':'removed ')+nm+' ('+(u.depts.map(i=>(deptList().find(x=>x.id===i)||{}).dept).join(', ')||'none')+')');save();return render()}
  if(d.urole){const u=S.users.find(x=>x.id===d.urole);if(!u)return;
    if(u.role==='admin'&&t.value!=='admin'&&nAdmins()<=1){toast('There must be at least one active administrator.');return render()}
    audit('Role changed',u.name+': '+roleName(u.role).toLowerCase()+' to '+roleName(t.value).toLowerCase());u.role=t.value;u.mod=nowIso();save();return render()}
  if(d.mre!==undefined&&UI.modal&&UI.modal.add){const dr=readAdd();UI.modal.d=dr;if(t.id==='a-n')UI.modal.n=+t.value;
    if(t.id==='a-pick'&&t.value){const [pp,nn]=t.value.split('|'),it=panelsNow().find(p=>p.name===pp).items.find(i=>i.name===nn);dr.name=it.name;dr.unit=st.units[it.name]!=null?st.units[it.name]:it.unit}
    return render()}
  if(d.aunit){setUnit(anOf(d.aunit),t.value.trim());save();return}
  if(d.rnp){const oldN=d.rnp,v=t.value.trim(),cp=st.cpanels.find(c=>c.name===d.rnp);
    if(!v||(v!==d.rnp&&panelNames().concat(panelsNow().map(p=>p.name)).some(x=>x.toLowerCase()===v.toLowerCase()))){toast(v?'A panel with that name already exists.':'Panel name cannot be empty.');return render()}
    DA().forEach(a=>{if(a.panel===d.rnp)a.panel=v});cp.name=v;save();document.querySelectorAll('[data-rnp]').forEach(x=>{if(x.getAttribute('data-rnp')===oldN){x.setAttribute('data-rnp',v);x.value=v}});document.querySelectorAll('[data-p]').forEach(x=>{if(x.getAttribute('data-p')===oldN)x.setAttribute('data-p',v)});return}
  if(d.path){st[d.path]=t.value;
    if(d.path==='dept'){st.sub=Object.keys(CAT[t.value].subs)[0];st.analyser='';st.analysers=[];st.amods={};st.selFor=''}
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
  if(t.id==='instf'){UI.inst=t.value;return render()}
  if(t.id==='deptf'){UI.dept=t.value;UI.inst='';return render()}
  if(t.id==='deptsw'){if(!canSeeD(t.value))return;syncCtx();loadCtx(t.value);save();return render()}
  if(d.llot){const [id,lv]=d.llot.split(':');anOf(id).targets[0].levels[+lv].lot=t.value.trim();save();return}
  if(d.lmat){const [id,lv]=d.lmat.split(':');anOf(id).targets[0].levels[+lv].material=t.value.trim();save();return refreshNext()}
  if(d.nlev){const a=anOf(d.nlev);a.nlevCustom=true;setLevels(a,+t.value);save();return render()}
  if(d.tg){const [id,lv,f]=d.tg.split(':');anOf(id).targets[0].levels[+lv][f]=num(t.value);save();return refreshNext()}
  if(t.id==='qcdate'){UI.date=t.value||todayStr();UI.report=[];UI.skipOpen=null;return render()}
  if(t.id==='cid'){UI.cid=t.value;return render()}
  if(t.id==='win'){UI.win=+t.value;return render()}
  if(t.id==='restore'&&t.files[0]){const fr=new FileReader();fr.onload=()=>{try{const o=JSON.parse(fr.result);if(!o||!Array.isArray(o.analytes)||!o.setup)throw 0;const kU=S.users,kA=S.audit;S=norm(o);if(!S.users.length)S.users=kU;if(!S.audit.length)S.audit=kA;UI.editing=false;CU=S.users.find(u=>u.id===(SESS&&SESS.uid)&&u.active!==false)||null;if(!CU){SESS=null;writeSess()}else audit('Backup restored','Data restored from a backup file');save();render();toast('Backup restored.')}catch(x){toast('That file is not a valid QC backup.')}};fr.readAsText(t.files[0])}
});
document.addEventListener('toggle',e=>{if(e.target.hasAttribute&&e.target.hasAttribute('data-more'))UI.moreOpen=e.target.open},true);
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
