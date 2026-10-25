/* ===== Panels & analytes manager (after setup) ===== */
function syncSel(){
  const st=S.setup;if(st.selFor===subKey())return;
  st.selFor=subKey();st.sel={};
  DA().forEach(a=>{const p=panelsNow().find(p=>p.name===a.panel&&p.items.some(i=>i.name===a.name));if(p)(st.sel[p.name]||(st.sel[p.name]={}))[a.name]=1});
}
function srcOf(a){
  const st=S.setup,cp=st.cpanels.find(c=>c.name===a.panel);
  if(cp){const it=cp.items.find(x=>x.name===a.name);if(it)return {kind:'custom',cp,it}}
  const rp=panelsNow().find(p=>p.name===a.panel);
  if(rp){const it=rp.items.find(x=>x.name===a.name);if(it){const added=(st.padd[subKey()+'|'+rp.name]||[]).includes(it);return {kind:added?'padd':'routine',rp,it}}}
  return null;
}
function setUnit(a,v){
  a.unit=v;const s=srcOf(a);if(!s)return;
  if(s.kind==='routine'){if(v===s.it.unit)delete S.setup.units[a.name];else S.setup.units[a.name]=v}else s.it.unit=v;
}
function detachSrc(a){
  const st=S.setup;syncSel();const s=srcOf(a);
  if(!s)return;
  if(s.kind==='custom')s.cp.items.splice(s.cp.items.indexOf(s.it),1);
  else{if(s.kind==='padd'){const arr=st.padd[subKey()+'|'+s.rp.name];arr.splice(arr.indexOf(s.it),1)}
    if(st.sel[s.rp.name])st.sel[s.rp.name][a.name]=0}
}
function registerSrc(panel,name,unit){
  const st=S.setup;syncSel();
  const cp=st.cpanels.find(c=>c.name===panel),rp=panelsNow().find(p=>p.name===panel);
  if(cp){cp.items.push({name,unit,on:true});return name}
  if(rp){
    const base=rp.items.find(x=>x.name.toLowerCase()===name.toLowerCase());
    if(base){name=base.name;if(unit!==base.unit)st.units[base.name]=unit;else delete st.units[base.name]}
    else{const k=subKey()+'|'+rp.name;(st.padd[k]||(st.padd[k]=[])).push({name,unit})}
    (st.sel[rp.name]||(st.sel[rp.name]={}))[name]=1;return name;
  }
  st.cpanels.push({id:uid(),name:panel,items:DA().filter(x=>x.panel===panel&&x.name!==name).map(x=>({name:x.name,unit:x.unit,on:true})).concat([{name,unit,on:true}])});
  return name;
}
function moveAnalyte(id,panel){
  const a=anOf(id);if(!a||a.panel===panel)return;
  detachSrc(a);a.name=registerSrc(panel,a.name,a.unit);a.panel=panel;
}
function removeAnalyte(id){
  const a=anOf(id);if(!a)return;
  detachSrc(a);
  tomb(id);S.analytes=S.analytes.filter(x=>x.id!==id);S.results=S.results.filter(r=>r.aid!==id);S.skips=S.skips.filter(r=>r.aid!==id);
}
const nRes=id=>S.results.filter(r=>r.aid===id).length;
function panelNames(){
  const names=[];DA().forEach(a=>{if(!names.includes(a.panel))names.push(a.panel)});
  S.setup.cpanels.forEach(c=>{if(!names.includes(c.name))names.push(c.name)});
  return names;
}
function renderManager(){
  const st=S.setup,names=panelNames(),routine=panelsNow();
  const uIn=(a)=>`<input type="text" class="unitin" list="unitlist" data-aunit="${a.id}" value="${esc(a.unit)}" aria-label="Unit for ${esc(a.name)}">`;
  const seenP=new Set(),card=(pn,list)=>{
    const cp=st.cpanels.find(c=>c.name===pn),rp=routine.find(p=>p.name===pn);
    const sugg=rp?rp.items.filter(i=>!DA().some(a=>a.name.toLowerCase()===i.name.toLowerCase())):[];
    const allP=DA().filter(a=>a.panel===pn),nr=allP.reduce((s,a)=>s+nRes(a.id),0),pc=UI.confirmDel==='p:'+pn;
    return `<div class="panelcard"><div class="row" style="justify-content:space-between;align-items:center">
     <div class="row" style="align-items:center;gap:8px">${cp?`<input type="text" data-rnp="${esc(pn)}" value="${esc(pn)}" aria-label="Panel name" style="width:220px;font-weight:600">`:`<h3>${esc(pn)}</h3>`}<span class="chip${cp?'':' acc'}">${cp?'Custom':'Routine'}</span></div>
     <div class="row" style="gap:6px"><button class="btn sm" data-act="addopen" data-p="${esc(pn)}">Add or move analytes</button>
     ${pc?`<span class="small">Delete the panel "${esc(pn)}", its ${allP.length} analyte${allP.length===1?'':'s'} and ${nr} QC result${nr===1?'':'s'}? An administrator can restore it for 30 days from Setup, Recently deleted.</span><button class="btn sm danger" data-act="pdel" data-p="${esc(pn)}">Yes, delete panel</button><button class="btn sm" data-act="arcancel">Cancel</button>`:`<button class="btn sm danger" data-act="pdel" data-p="${esc(pn)}">Delete panel</button>`}</div></div>
     ${list.length?`<div class="scroll"><table class="t" style="margin-top:6px"><thead><tr><th>Analyte</th><th>Unit</th>${ctxMulti()?'<th>Analyser · module</th>':''}<th>Schedule</th><th>QC materials · lots</th><th></th></tr></thead><tbody>${list.map(a=>{const t=curTarget(a),c=UI.confirmDel===a.id,n=nRes(a.id);
       return `<tr><td><b>${esc(a.name)}</b></td><td>${uIn(a)}</td>${ctxMulti()?`<td><select data-inst="${a.id}" aria-label="Analyser for ${esc(a.name)}">${instOpts(instOf(a),a.mod||'')}</select></td>`:''}<td class="small">${esc(scheduleText(a))}</td><td class="small">${t.levels.slice(0,a.nlev).map((l,i)=>levelName(i)+': '+esc(l.material||'–')+(l.lot?' · '+esc(l.lot):'')).join('<br>')}</td>
       <td style="text-align:right;white-space:nowrap">${c?`<span class="small">Delete ${n} result${n===1?'':'s'}?</span> <button class="btn sm danger" data-act="arem" data-id="${a.id}">Confirm</button> <button class="btn sm" data-act="arcancel">Cancel</button>`:`<button class="btn sm" data-act="aedit" data-id="${a.id}" aria-label="Edit ${esc(a.name)}">Edit</button> <button class="btn sm" data-act="arem" data-id="${a.id}" aria-label="Remove ${esc(a.name)}">Remove</button>`}</td></tr>`}).join('')}</tbody></table></div>`:'<p class="small muted" style="margin:8px 0 0">No analytes in this panel yet.</p>'}
     ${sugg.length&&!seenP.has(pn)?`<div class="row" style="margin-top:8px;gap:6px;align-items:center"><span class="small muted">Routine tests not in use:</span>${sugg.map(i=>`<button class="btn sm" data-act="sugg" data-p="${esc(pn)}" data-n="${esc(i.name)}">+ ${esc(i.name)}</button>`).join('')}</div>`:''}</div>`};
  seenP.clear();
  const cards=byAnalyser(DA(),(pn,list)=>{const h=card(pn,list);seenP.add(pn);return h})+(()=>{const empty=names.filter(pn=>!DA().some(a=>a.panel===pn));return empty.length?`<div class="angrp"><div class="angh"><span>Panels with no analytes yet</span></div>${empty.map(pn=>card(pn,[])).join('')}</div>`:''})();
  const more=routine.filter(p=>!names.includes(p.name));
  return `<div class="panel stack"><div><h3>Panels and analytes</h3><p class="small muted" style="margin:4px 0 0">Add new analytes to a panel, move analytes in from other panels, change a unit, rename or delete a custom panel, or start a new panel. New analytes start QC from today and existing results are not changed.</p></div>
   <datalist id="unitlist">${UNITS.map(u=>`<option value="${esc(u)}">`).join('')}</datalist>
   <div class="stack">${cards}</div>
   ${more.length?`<details data-more${UI.moreOpen?' open':''}><summary style="cursor:pointer"><b>More routine panels for ${esc(st.sub||st.dept)} (${more.length})</b></summary><div class="stack" style="margin-top:10px">${more.map(p=>`<div class="panelcard"><h3>${esc(p.name)}</h3><div class="row" style="margin-top:8px;gap:6px">${p.items.map(i=>`<button class="btn sm" data-act="sugg" data-p="${esc(p.name)}" data-n="${esc(i.name)}">+ ${esc(i.name)}</button>`).join('')}</div></div>`).join('')}</div></details>`:''}
   <div class="row"><label class="f" style="flex:1 1 220px">New custom panel<input type="text" id="mnewpanel" placeholder="e.g. Special tests"></label><button class="btn" data-act="mnp">Create panel</button></div></div>`;
}
/* ----- add analyte modal ----- */
function unusedRoutine(){
  const out=[];
  panelsNow().forEach(p=>{const items=p.items.filter(i=>!DA().some(a=>a.name.toLowerCase()===i.name.toLowerCase()));if(items.length)out.push({panel:p.name,items})});
  return out;
}
function readAdd(){
  const g=id=>document.getElementById(id),v=id=>g(id)?g(id).value:'';
  const d={mode:v('a-mode')||'new',name:v('a-name'),unit:v('a-unit'),sched:v('a-sched')||'daily',every:v('a-every')||2,start:v('a-start')||todayStr(),
    days:[...document.querySelectorAll('[data-adow]:checked')].map(x=>+x.dataset.adow),mv:[...document.querySelectorAll('[data-mv]:checked')].map(x=>x.dataset.mv),mats:[],lots:[],exps:[],means:[],sds:[],inst:v('a-inst')};
  for(let i=0;i<6;i++){d.exps.push(v('a-exp-'+i));d.mats.push(v('a-mat-'+i));d.lots.push(v('a-lot-'+i));d.means.push(v('a-mean-'+i));d.sds.push(v('a-sd-'+i))}
  return d;
}
function renderAddModal(){
  const m=UI.modal,first=DA().find(x=>x.panel===m.panel),ft=first?curTarget(first):null,n=m.n;
  const d=m.d||{mode:'new',name:m.name||'',unit:m.unit||'',sched:first?'panel':'daily',every:2,start:todayStr(),days:[1],mv:[],
    mats:(ft?ft.levels.map(l=>l.material):[]),lots:(ft?ft.levels.map(l=>l.lot):[]),means:[],sds:[]};
  const dd=(d.days&&d.days.length)?d.days:[1],dowOn=x=>dd.includes(x),head=`<div class="modalbg" data-act="mclose"><div class="modal" style="max-width:760px" role="dialog" aria-modal="true" aria-label="Add or move analytes" data-stop>`;
  const others=DA().filter(a=>a.panel!==m.panel),gp=groupBy(others,a=>a.panel);
  const top=`<h2>${esc(m.panel)}: add or move analytes</h2><label class="f" style="margin:10px 0"><span>What do you want to do?</span><select id="a-mode" data-mre><option value="new"${d.mode==='new'?' selected':''}>Add a new analyte</option><option value="move"${d.mode==='move'?' selected':''}>Move analytes in from other panels</option></select></label>`;
  if(d.mode==='move'){
    return head+top+`<p class="muted small" style="margin:0 0 8px">Moving keeps each analyte's results, targets and schedule. An analyte sits in one panel, so it leaves its current panel.</p>
     <div class="stack">${others.length?`<div class="scroll" style="max-height:46vh;overflow:auto">${Object.entries(gp).map(([p,l])=>`<div class="panelcard" style="margin-bottom:8px"><b>${esc(p)}</b><div class="checks" style="margin-top:6px">${l.map(a=>`<label><input type="checkbox" data-mv="${a.id}"${(d.mv||[]).includes(a.id)?' checked':''}>${esc(a.name)} <span class="muted small">${esc(a.unit)}</span></label>`).join('')}</div></div>`).join('')}</div>`:'<p class="muted">There are no analytes in other panels yet.</p>'}
     <p id="a-err" class="small" style="color:var(--bad);margin:0" hidden></p>
     <div class="row" style="justify-content:flex-end"><button class="btn" data-act="mclose">Cancel</button><button class="btn primary" data-act="addsave">Move selected</button></div></div></div></div>`;
  }
  const un=unusedRoutine();
  return head+top+`<p class="muted small" style="margin:0 0 8px">QC for a new analyte starts today. Existing analytes and results are not changed.</p>
   <div class="stack">
   ${un.length?`<label class="f">Pick a routine test to fill in the name and unit (optional)<select id="a-pick" data-mre><option value="">Choose from routine tests not in use…</option>${un.map(g=>`<optgroup label="${esc(g.panel)}">${g.items.map(i=>`<option value="${esc(g.panel+'|'+i.name)}">${esc(i.name)}</option>`).join('')}</optgroup>`).join('')}</select></label>`:''}
   <div class="grid2">
    <label class="f">Analyte name<input type="text" id="a-name" value="${esc(d.name)}" placeholder="e.g. Ammonia"></label>
    <label class="f">Unit<input type="text" id="a-unit" list="unitlist" value="${esc(d.unit)}" placeholder="µmol/L"></label>
    ${ctxMulti()?`<label class="f">Analyser and module<select id="a-inst" data-mre>${(()=>{const dv=d.inst?splitInst(d.inst):(first?{inst:instOf(first),mod:first.mod||''}:{inst:S.setup.analysers[0],mod:''});return instOpts(dv.inst,dv.mod)})()}</select></label>`:''}
    <label class="f">Control levels<select id="a-n" data-mre>${[1,2,3,4,5,6].map(k=>`<option${k===n?' selected':''}>${k}</option>`).join('')}</select></label>
    <label class="f">Schedule<select id="a-sched" data-mre>${first?`<option value="panel"${d.sched==='panel'?' selected':''}>Same as rest of panel (${esc(scheduleText(first))})</option>`:''}<option value="daily"${d.sched==='daily'?' selected':''}>Every day</option><option value="weekdays"${d.sched==='weekdays'?' selected':''}>Specific days of the week</option><option value="interval"${d.sched==='interval'?' selected':''}>Every N days</option><option value="ondemand"${d.sched==='ondemand'?' selected':''}>On demand (no fixed schedule)</option></select></label></div>
   ${d.sched==='weekdays'?`<div class="days" role="group" aria-label="Days">${[1,2,3,4,5,6,0].map(x=>`<label><input type="checkbox" data-adow="${x}"${dowOn(x)?' checked':''}>${DOW[x]}</label>`).join('')}</div>`:''}
   ${d.sched==='interval'?`<label class="f" style="flex-direction:row;align-items:center;gap:6px">every<input type="number" min="2" max="90" id="a-every" value="${esc(d.every)}" style="width:70px">days, starting<input type="date" id="a-start" value="${esc(d.start)}" style="width:auto"></label>`:''}
   ${matList().length?`<label class="f">Use a saved QC material <select id="a-matlib" data-mre><option value="">Choose a QC material already in the system…</option>${matOptions('')}</select><span class="small muted" style="font-weight:400">Fills in the material name, lot number and expiry date for each level. You still enter the mean and SD.</span></label>`:''}
   <div class="small muted">Each level has its own QC material name and lot number.</div>
   ${Array.from({length:n},(_,i)=>`<div class="row" style="align-items:flex-end"><span class="small" style="width:56px;padding-bottom:9px">${levelName(i)}</span>
     <label class="f" style="flex:2 1 170px">QC material<input type="text" id="a-mat-${i}" value="${esc((d.mats||[])[i]||'')}" placeholder="Material name"></label>
     <label class="f" style="flex:1 1 100px">Lot no.<input type="text" id="a-lot-${i}" value="${esc((d.lots||[])[i]||'')}"></label>
     <label class="f" style="flex:0 0 140px">Expiry date<input type="date" id="a-exp-${i}" value="${esc((d.exps||[])[i]||'')}"></label>
     <label class="f" style="flex:0 0 92px">Mean<input type="number" step="any" id="a-mean-${i}" value="${esc((d.means||[])[i]||'')}"></label>
     <label class="f" style="flex:0 0 80px">SD<input type="number" step="any" min="0" id="a-sd-${i}" value="${esc((d.sds||[])[i]||'')}"></label></div>`).join('')}
   <p id="a-err" class="small" style="color:var(--bad);margin:0" hidden></p>
   <div class="row" style="justify-content:flex-end"><button class="btn" data-act="mclose">Cancel</button><button class="btn primary" data-act="addsave">Add analyte</button></div></div></div></div>`;
}
function saveAdd(){
  const m=UI.modal,d=readAdd(),err=document.getElementById('a-err'),n=m.n;
  const fail=t=>{err.textContent=t;err.hidden=false;return true};
  if(d.mode==='move'){
    if(!d.mv.length)return fail('Tick at least one analyte to move.');
    d.mv.forEach(id=>moveAnalyte(id,m.panel));
    audit('Analytes moved',d.mv.map(id=>(anOf(id)||{}).name).join(', ')+' to '+m.panel);
  UI.modal=null;save();toast(d.mv.length+' analyte'+(d.mv.length>1?'s':'')+' moved to '+m.panel+'.');return;
  }
  let name=d.name.trim();
  if(!name)return fail('Enter the analyte name.');
  if(DA().some(a=>a.name.toLowerCase()===name.toLowerCase()))return fail(name+' already exists. To run it on another analyser use "Copy selected" under Assign analytes to analysers.');
  const levels=[];
  for(let i=0;i<n;i++){
    const mean=num(d.means[i]),sd=num(d.sds[i]),mat=d.mats[i].trim();
    if(!mat)return fail('Every level needs a QC material name ('+levelName(i)+').');
    if(!d.exps[i])return fail('Every level needs an expiry date ('+levelName(i)+').');
    if(mean==null||!(sd>0))return fail('Every level needs a mean and an SD above zero.');
    levels.push({mean,sd,material:mat,lot:d.lots[i].trim(),exp:d.exps[i]});
  }
  const first=DA().find(x=>x.panel===m.panel);let schedule={type:'daily'};
  if(d.sched==='panel'&&first)schedule=JSON.parse(JSON.stringify(first.schedule));
  else if(d.sched==='ondemand')schedule={type:'ondemand'};
  else if(d.sched==='weekdays'){if(!d.days.length)return fail('Choose at least one day.');schedule={type:'weekdays',days:d.days}}
  else if(d.sched==='interval')schedule={type:'interval',every:Math.max(2,+d.every||2),start:d.start||todayStr()};
  const unit=d.unit.trim(),ai=d.inst?splitInst(d.inst):{inst:first?instOf(first):(S.setup.analysers||[])[0]||'',mod:first?(first.mod||''):''};
  name=registerSrc(m.panel,name,unit);
  S.analytes.push({id:uid(),dept:curId(),name,unit,panel:m.panel,inst:ai.inst,mod:ai.mod,nlev:n,schedule,targets:[{from:todayStr(),comment:'Added after setup',levels}]});
  audit('Analyte added',name+' to '+m.panel+' ('+n+' level'+(n>1?'s':'')+')');
  UI.modal=null;save();toast(name+' added to '+m.panel+'.');
}

/* ===== Assign / reassign analytes to analysers ===== */
UI.asg=UI.asg||{};UI.asgT=UI.asgT||'';UI.asgNew='';UI.asgName='';
function renderAssign(){
  const st=S.setup,mine=DA();if(!mine.length)return '';
  const sel=id=>!!UI.asg[id],n=Object.keys(UI.asg).filter(id=>mine.some(a=>a.id===id)).length;
  const list=Object.entries(groupBy(mine,a=>instOf(a)||'No analyser')).map(([inst,l])=>{
    return `<div class="angrp"><div class="angh"><span>${esc(inst)}</span><span class="small muted" style="font-weight:400">${l.length} analyte${l.length===1?'':'s'}</span><button class="btn sm" style="margin-left:auto" data-act="asgall" data-g="${esc(inst)}">${l.every(a=>sel(a.id))?'Clear all':'Select all'}</button></div>
     ${Object.entries(groupBy(l,a=>a.mod||'')).map(([m,ml])=>`<div style="margin:6px 0 10px"><div class="row" style="gap:8px;align-items:center;margin-bottom:4px"><span class="chip${m?' acc':''}">${m?esc(m):'No module'}</span><span class="small muted">${ml.length}</span><button class="btn sm" data-act="asgall" data-g="${esc(inst)}" data-m="${esc(m)}" data-hasm="1">${ml.every(a=>sel(a.id))?'Clear module':'Select module'}</button></div>
      <div class="checks">${ml.map(a=>`<label><input type="checkbox" data-asg="${a.id}"${sel(a.id)?' checked':''}>${esc(a.name)}</label>`).join('')}</div></div>`).join('')}</div>`}).join('');
  const T=UI.asgT||'',isNew=T==='__new';
  return `<div class="panel stack"><div><h3>Assign analytes to analysers</h3><p class="small muted" style="margin:4px 0 0">Tick the analytes, choose the analyser (and module), then press <b>Move</b> to reassign them or <b>Copy</b> to run them on that analyser as well (the copy keeps its own results and starts with the same targets). Results, targets and schedules stay with the analyte. You can also create a new analyser here.</p></div>
   <div class="scroll" style="max-height:46vh;overflow:auto">${list}</div>
   <div class="row" style="align-items:flex-end"><label class="f" style="flex:1 1 260px">Move ${n?n+' selected analyte'+(n===1?'':'s'):'selected analytes'} to<select id="as-target"><option value="">Choose analyser or module…</option>${instOpts('','')}<option value="__new"${isNew?' selected':''}>➕ A new analyser…</option></select></label>
    ${isNew?`<label class="f" style="flex:1 1 240px">New analyser<select id="as-new">${anOptions(st.dept,st.sub,UI.asgNew)}</select></label>${UI.asgNew==='Other'?`<label class="f" style="flex:1 1 200px">Name<input type="text" id="as-newname" value="${esc(UI.asgName)}" placeholder="Make and model"></label>`:''}${(AMODS[baseName(UI.asgNew)]||[]).length?`<label class="f" style="flex:1 1 200px">Module<select id="as-newmod"><option value="">Automatic by test type</option>${AMODS[baseName(UI.asgNew)].map(m=>`<option${m===UI.asgMod?' selected':''}>${esc(m)}</option>`).join('')}</select></label>`:''}`:''}
    <button class="btn primary" data-act="asgmove"${n?'':' disabled'}>Move selected</button><button class="btn" data-act="asgcopy"${n?'':' disabled'} title="Run the same analytes on this analyser as well, keeping the originals">Copy selected</button></div>
   <p id="as-err" class="small" style="color:var(--bad);margin:0" hidden></p></div>`;
}
function asgMove(copy){
  const st=S.setup,ids=Object.keys(UI.asg).filter(id=>DA().some(a=>a.id===id)),err=document.getElementById('as-err');
  const fail=t=>{if(err){err.textContent=t;err.hidden=false}return true};
  if(!ids.length)return fail('Tick at least one analyte.');
  let inst,mod='',fresh=false;
  if(UI.asgT==='__new'){
    let base=UI.asgNew==='Other'?(UI.asgName||'').trim():UI.asgNew;if(!base)return fail('Choose the new analyser'+(UI.asgNew==='Other'?' and give it a name.':'.'));
    let nm=base,k=2;while((st.analysers||[]).some(x=>x.toLowerCase()===nm.toLowerCase()))nm=base+' ('+(k++)+')';
    st.analysers.push(nm);st.amods=st.amods||{};st.amods[nm]=(AMODS[baseName(base)]||[]).slice();inst=nm;fresh=true;
  }else if(UI.asgT){const v=splitInst(UI.asgT);inst=v.inst;mod=v.mod}else return fail('Choose where to move them.');
  const names=[],skipped=[];
  if(copy){
    ids.forEach(id=>{const a=anOf(id);if(!a)return;const m=fresh?(UI.asgMod||defMod(a.name,inst)):mod;
      if(DA().some(x=>x.name===a.name&&x.inst===inst&&(x.mod||'')===(m||''))){skipped.push(a.name);return}
      const t=curTarget(a);
      S.analytes.push({id:uid(),dept:a.dept,name:a.name,unit:a.unit,panel:a.panel,inst,mod:m,nlev:a.nlev,schedule:JSON.parse(JSON.stringify(a.schedule||{type:'daily'})),copyOf:a.copyOf||a.id,
        targets:[{from:todayStr(),comment:'Copied from '+instLabel(a)+' (starting targets, review before use)',...stampNow(),levels:t.levels.map(l=>({...l}))}]});names.push(a.name)});
    if(!names.length){if(fresh){st.analysers.pop();delete st.amods[inst]}return fail('Those analytes already run on '+inst+(mod?' · '+mod:'')+'.')}
    audit('Analytes copied',names.join(', ')+' to '+inst+(mod?' · '+mod:'')+(fresh?' (new analyser)':''));
    UI.asg={};UI.asgT='';UI.asgNew='';UI.asgName='';UI.asgMod='';save();render();toast(names.length+' analyte'+(names.length===1?'':'s')+' copied to '+inst+'.'+(skipped.length?' '+skipped.length+' already there.':'')+' Review their targets and lots.');return true;
  }
  ids.forEach(id=>{const a=anOf(id);if(!a)return;a.inst=inst;a.mod=fresh?(UI.asgMod||defMod(a.name,inst)):mod;names.push(a.name)});
  audit('Analytes reassigned',names.join(', ')+' to '+inst+(mod?' · '+mod:'')+(fresh?' (new analyser)':''));
  UI.asg={};UI.asgT='';UI.asgNew='';UI.asgName='';UI.asgMod='';save();render();toast(names.length+' analyte'+(names.length===1?'':'s')+' moved to '+inst+'.');return true;
}

/* ===== Edit an analyte (fix mistakes made when it was created) ===== */
function renderEditModal(){
  const a=anOf(UI.modal.edit);if(!a){UI.modal=null;return ''}
  const t=curTarget(a),dp=decs(a),n=a.nlev;
  return `<div class="modalbg" data-act="mclose"><div class="modal" style="max-width:760px" role="dialog" aria-modal="true" aria-label="Edit ${esc(a.name)}" data-stop>
   <h2>Edit ${esc(a.name)}</h2><p class="muted small" style="margin:4px 0 12px">Correct the name, unit or current QC details. Past QC results are kept and stay with this analyte. This changes the current target from its start date. If a new lot has started, use <b>Lot change</b> on the Charts screen so the old limits are kept for the old results.</p>
   <div class="stack"><div class="grid2"><label class="f">Analyte name<input type="text" id="e-name" value="${esc(a.name)}"></label>
   <label class="f">Unit<input type="text" id="e-unit" list="unitlist" value="${esc(a.unit)}"></label></div>
   ${matList().length?`<label class="f">Use a saved QC material <select id="e-matlib"><option value="">Choose a QC material already in the system…</option>${matOptions('')}</select><span class="small muted" style="font-weight:400">Fills in the material name, lot number and expiry date for each level. The mean and SD are not changed.</span></label>`:''}
   ${Array.from({length:n},(_,i)=>{const l=t.levels[i]||{};return `<div class="row" style="align-items:flex-end"><span class="small" style="width:56px;padding-bottom:9px">${levelName(i)}</span>
     <label class="f" style="flex:2 1 170px">QC material<input type="text" id="e-mat-${i}" value="${esc(l.material||'')}"></label>
     <label class="f" style="flex:1 1 100px">Lot no.<input type="text" id="e-lot-${i}" value="${esc(l.lot||'')}"></label>
     <label class="f" style="flex:0 0 140px">Expiry date<input type="date" id="e-exp-${i}" value="${esc(l.exp||'')}"></label>
     <label class="f" style="flex:0 0 92px">Mean<input type="number" step="any" id="e-mean-${i}" value="${l.mean!=null?esc(String(l.mean)):''}"></label>
     <label class="f" style="flex:0 0 80px">SD<input type="number" step="any" min="0" id="e-sd-${i}" value="${l.sd!=null?esc(String(l.sd)):''}"></label></div>`}).join('')}
   <p id="e-err" class="small" style="color:var(--bad);margin:0" hidden></p>
   <div class="row" style="justify-content:flex-end"><button class="btn" data-act="mclose">Cancel</button><button class="btn primary" data-act="aeditsave">Save changes</button></div></div></div></div>`;
}
function saveEdit(){
  const a=anOf(UI.modal.edit),g=id=>document.getElementById(id),v=id=>g(id)?g(id).value:'',err=g('e-err');
  const fail=t=>{err.textContent=t;err.hidden=false;return true};
  if(!a)return;
  const name=v('e-name').trim(),unit=v('e-unit').trim(),t=curTarget(a),levels=[];
  if(!name)return fail('Enter the analyte name.');
  if(DA().some(x=>x.id!==a.id&&x.name.toLowerCase()===name.toLowerCase()))return fail(name+' already exists in this department.');
  for(let i=0;i<a.nlev;i++){
    const mean=num(v('e-mean-'+i)),sd=num(v('e-sd-'+i)),mat=v('e-mat-'+i).trim();
    if(!mat)return fail('Every level needs a QC material name ('+levelName(i)+').');
    if(!v('e-exp-'+i))return fail('Every level needs an expiry date ('+levelName(i)+').');
    if(mean==null||!(sd>0))return fail('Every level needs a mean and an SD above zero ('+levelName(i)+').');
    levels.push({mean,sd,material:mat,lot:v('e-lot-'+i).trim(),exp:v('e-exp-'+i)});
  }
  const old={name:a.name,unit:a.unit,lv:t.levels.slice(0,a.nlev).map(l=>[l.material,l.lot,l.exp,l.mean,l.sd].join('/'))},ch=[];
  if(name!==a.name){
    syncSel();const s=srcOf(a);
    if(s&&(s.kind==='custom'||s.kind==='padd'))s.it.name=name;
    else{if(s&&s.kind==='routine')delete S.setup.units[a.name];detachSrc(a);a.name=registerSrc(a.panel,name,unit||a.unit)}
    ch.push('name '+old.name+' to '+name);a.name=name;
  }
  if(unit!==old.unit){setUnit(a,unit);ch.push('unit '+(old.unit||'none')+' to '+(unit||'none'))}
  levels.forEach((l,i)=>{Object.assign(t.levels[i],l)});
  if(levels.some((l,i)=>[l.material,l.lot,l.exp,l.mean,l.sd].join('/')!==old.lv[i]))ch.push('QC material, lot, expiry, mean or SD');
  if(!ch.length){UI.modal=null;render();return}
  audit('Analyte edited',a.name+': '+ch.join('; '),null,[a.dept]);
  UI.modal=null;save();toast(a.name+' updated.');
}
