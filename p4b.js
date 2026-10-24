/* ===== Setup wizard ===== */
const STEPS=['Department & analyser','Analytes','Schedule & analyser','Control targets'];
/* sub-departments: the built-in ones, plus custom ones any department of this type already uses */
function deptChoices(){
  const out=DEPTS.filter(d=>d!=='Other / Custom');
  (S.depts||[]).forEach(r=>{if(r.dept&&!out.includes(r.dept)&&r.dept!=='Other / Custom')out.push(r.dept)});
  if(S.setup.dept&&!out.includes(S.setup.dept)&&S.setup.dept!=='Other / Custom')out.push(S.setup.dept);
  out.push('Other / Custom');return out;
}
function subList(dept){
  const base=Object.keys((CAT[dept]||{subs:{}}).subs),out=base.slice();
  const add=n=>{if(n&&!out.some(x=>x.toLowerCase()===String(n).toLowerCase()))out.push(n)};
  (S.depts||[]).forEach(r=>{if(r.dept===dept)add(r.sub)});
  if(S.setup.dept===dept)add(S.setup.sub);
  return out;
}
const subKey=()=>S.setup.dept+'|'+S.setup.sub;
const panelsNow=()=>((CAT[S.setup.dept]||{subs:{}}).subs[S.setup.sub]||[]).map(p=>({...p,items:p.items.concat((S.setup.padd||{})[subKey()+'|'+p.name]||[])}));
function ensureSel(){
  const st=S.setup;
  if(st.selFor===subKey())return;
  st.selFor=subKey();st.sel={};
  panelsNow().forEach(p=>{if(p.routine){st.sel[p.name]={};p.items.forEach(i=>st.sel[p.name][i.name]=1)}});
}
function chosenList(){
  const seen={},out=[];
  const st=S.setup;
  panelsNow().forEach(p=>p.items.forEach(i=>{if(st.sel[p.name]&&st.sel[p.name][i.name]&&!seen[i.name]){seen[i.name]=1;out.push({name:i.name,unit:st.units[i.name]!=null?st.units[i.name]:i.unit,panel:p.name})}}));
  st.cpanels.forEach(cp=>cp.items.forEach(c=>{if(c.on!==false&&!seen[c.name.toLowerCase()]&&!seen[c.name]){seen[c.name]=1;out.push({name:c.name,unit:c.unit,panel:cp.name})}}));
  return out;
}

/* ===== helpers: analyser modules, grouping by analyser, locked panels ===== */
function instOpts(selInst,selMod){
  const st=S.setup,am=st.amods||{};
  return (st.analysers||[]).map(n=>{const ms=am[n]||[];
    if(!ms.length)return `<option value="${esc(n)}|"${n===selInst?' selected':''}>${esc(n)}</option>`;
    return `<optgroup label="${esc(n)}"><option value="${esc(n)}|"${n===selInst&&!selMod?' selected':''}>${esc(n)} (any module)</option>${ms.map(m=>`<option value="${esc(n)}|${esc(m)}"${n===selInst&&selMod===m?' selected':''}>${esc(n)} · ${esc(m)}</option>`).join('')}</optgroup>`}).join('');
}
const splitInst=v=>{const k=v.lastIndexOf('|');return {inst:v.slice(0,k),mod:v.slice(k+1)}};
function defMod(name,inst){
  const ms=(S.setup.amods||{})[inst]||[];if(!ms.length)return '';
  const imm=S.setup.dept==='Immunochemistry',ise=/^(sodium|potassium|chloride)$/i.test(name);
  return (imm?ms.find(x=>/^e\b/i.test(x)):ise?ms.find(x=>/ISE|electrolyte/i.test(x)):(ms.find(x=>/^c\b/i.test(x))||ms.find(x=>/photometric/i.test(x))))||'';
}
function byAnalyser(list,fn){
  const gi=groupBy(list,a=>instOf(a)||'No analyser'),am=S.setup.amods||{};
  return Object.entries(gi).map(([inst,l])=>{const ms=am[inst]||[];
    return `<div class="angrp"><div class="angh"><span>${esc(inst)}</span>${ms.map(m=>`<span class="chip">${esc(m)}</span>`).join('')}<span class="small muted" style="font-weight:400">${l.length} analyte${l.length===1?'':'s'}</span></div>${Object.entries(groupBy(l,a=>a.panel)).map(([p,pl])=>fn(p,pl,inst)).join('')}</div>`}).join('');
}
function analyserEditor(){
  const st=S.setup,am=st.amods||{},mine=DA();
  return (st.analysers||[]).map((n,i)=>{const have=am[n]||[],all=[...new Set([...(AMODS[baseName(n)]||[]),...have])],cnt=mine.filter(a=>a.inst===n).length;
    return `<div class="panelcard" style="margin-top:8px"><div class="row" style="justify-content:space-between;align-items:center">${UI.renI===i?`<span class="row" style="gap:6px;flex:1 1 260px"><input type="text" data-anrenv value="${esc(n)}" aria-label="New name for ${esc(n)}" style="flex:1 1 200px"><button type="button" class="btn sm primary" data-act="anrensave" data-i="${i}">Save name</button><button type="button" class="btn sm" data-act="anrencancel">Cancel</button></span>`:`<b>${esc(n)}</b>`}<span class="row" style="gap:8px">${UI.renI===i?'':`<button type="button" class="btn sm" data-act="anren" data-i="${i}">Rename</button>`}<span class="small muted">${cnt} analyte${cnt===1?'':'s'}</span><button type="button" class="btn sm" data-act="ainstdel" data-i="${i}"${st.analysers.length<2?' disabled title="A department needs at least one analyser"':''}>Remove</button></span></div>
     <div class="row" style="gap:12px;margin-top:6px;align-items:center"><span class="small muted">Modules</span>${all.map(m=>`<label class="small" style="display:flex;gap:4px;align-items:center;font-weight:400"><input type="checkbox" data-amod="${i}:${esc(m)}"${have.includes(m)?' checked':''}>${esc(m)}</label>`).join('')||'<span class="small muted" style="font-weight:400">None</span>'}
     <input type="text" data-amodnew="${i}" placeholder="Add module, press Enter" style="width:190px" aria-label="Add a module to ${esc(n)}"></div></div>`}).join('')||'<span class="small muted">None added yet.</span>';
}
const isAdded=name=>S.setup.done&&DA().some(a=>a.name.toLowerCase()===String(name).toLowerCase());
const tgBad=a=>a.targets[0].levels.slice(0,a.nlev).some(l=>!(l.material||'').trim()||!(l.exp||'').trim()||!(l.mean!=null&&l.sd>0));
const minLv=a=>S.results.reduce((m,r)=>r.aid===a.id?Math.max(m,r.lv+1):m,1);
function setLevels(a,n){
  a.nlev=n;
  a.targets.forEach(t=>{while(t.levels.length<n)t.levels.push(emptyLevel())});
  const t0=a.targets[0];if(t0.levels.length>n&&a.targets.length===1)t0.levels.length=n;
}
function buildAnalytes(){
  const ch=chosenList(),old=DA();
  const cur=curId(),mineNew=ch.map(c=>{
    const o=old.find(a=>a.name===c.name&&!a.copyOf);
    if(o){o.panel=c.panel;o.unit=c.unit;if(!(S.setup.analysers||[]).includes(o.inst)){o.inst=S.setup.analysers[0]||'';o.mod=defMod(o.name,o.inst)}else if(o.mod&&!((S.setup.amods||{})[o.inst]||[]).includes(o.mod))o.mod='';
      if(!S.setup.done&&!o.nlevCustom&&S.setup.nlev>=minLv(o))setLevels(o,S.setup.nlev);
      return o}
    return {id:uid(),dept:cur,name:c.name,unit:c.unit,panel:c.panel,inst:S.setup.analysers[0]||'',mod:defMod(c.name,S.setup.analysers[0]||''),nlev:S.setup.nlev,schedule:{type:'daily'},
      targets:[{from:todayStr(),comment:'Initial targets',levels:Array.from({length:S.setup.nlev},emptyLevel)}]};
  });
  const keepN=new Set(ch.map(c=>c.name)),copies=old.filter(a=>a.copyOf&&keepN.has(a.name));
  S.analytes=S.analytes.filter(a=>a.dept!==cur).concat(mineNew,copies);
  const ids=new Set(S.analytes.map(a=>a.id));
  S.results=S.results.filter(r=>ids.has(r.aid));S.skips=S.skips.filter(r=>ids.has(r.aid));
}
function schedCtl(a){
  const s=a.schedule;
  let h=`<div class="row" style="gap:8px"><select data-sched="${a.id}" aria-label="Schedule for ${esc(a.name)}" style="width:auto">
   <option value="daily"${s.type==='daily'?' selected':''}>Every day</option>
   <option value="weekdays"${s.type==='weekdays'?' selected':''}>Specific days of the week</option>
   <option value="interval"${s.type==='interval'?' selected':''}>Every N days</option>
   <option value="ondemand"${s.type==='ondemand'?' selected':''}>On demand (no fixed schedule)</option></select>`;
  if(s.type==='weekdays')h+=`<div class="days" role="group" aria-label="Days">${[1,2,3,4,5,6,0].map(d=>`<label><input type="checkbox" data-dow="${a.id}:${d}"${(s.days||[]).includes(d)?' checked':''}>${DOW[d]}</label>`).join('')}</div>`;
  if(s.type==='interval')h+=`<label class="f" style="flex-direction:row;align-items:center;gap:6px">every<input type="number" min="2" max="90" data-every="${a.id}" value="${s.every||2}" style="width:64px">days, starting<input type="date" data-start="${a.id}" value="${s.start||todayStr()}" style="width:auto"></label>`;
  return h+'</div>';
}
function groupBy(list,f){const g={};list.forEach(x=>(g[f(x)]||(g[f(x)]=[])).push(x));return g}
function renderSetup(){
  const st=S.setup,step=st.step;
  const steps=`<div class="steps">${STEPS.map((n,i)=>`<span class="${i+1===step?'on':i+1<step?'done':''}">${i+1}. ${n}</span>`).join('')}</div>`;
  let body='',next='Next',canNext=true;
  if(step===1){
    const d=catOf(st.dept);
    body=`<div class="grid2">
     <label class="f">Laboratory name (optional)<input type="text" data-path="lab" value="${esc(st.lab)}" placeholder="e.g. Main Laboratory"></label>
     <div class="f">Department<select data-path="dept" data-r aria-label="Department">${deptChoices().map(x=>`<option${x===st.dept?' selected':''}>${esc(x)}</option>`).join('')}<option value="__newdept">+ Custom department (choose its name)…</option></select>
      ${UI.cdept?`<div class="row" style="align-items:flex-end;margin-top:6px"><label class="f" style="flex:1 1 200px">Department name<input type="text" id="cdept-name" maxlength="40" placeholder="e.g. Point of Care Testing"></label><button type="button" class="btn primary" data-act="cdeptadd">Use this department</button><button type="button" class="btn" data-act="cdeptno">Cancel</button></div><span id="cdept-err" class="small" style="color:var(--bad)" hidden></span>`:''}</div>
     <div class="f">Sub-department<select data-path="sub" data-r aria-label="Sub-department"><option value="__none"${st.sub?'':' selected'}>(None)</option>${subList(st.dept).map(x=>`<option${x===st.sub?' selected':''}>${esc(x)}</option>`).join('')}<option value="__new">+ Add a custom sub-department…</option></select>
      ${UI.csub?`<div class="row" style="align-items:flex-end;margin-top:6px"><label class="f" style="flex:1 1 200px">New sub-department name<input type="text" id="csub-name" maxlength="40" placeholder="e.g. Special Chemistry"></label><button type="button" class="btn primary" data-act="csubadd">Use this sub-department</button><button type="button" class="btn" data-act="csubno">Cancel</button></div><span id="csub-err" class="small" style="color:var(--bad)" hidden></span>`:''}</div>
     <div class="f" style="grid-column:1/-1">Analysers in this department${analyserEditor()}
      <div class="row" style="align-items:flex-end;margin-top:8px"><label class="f" style="flex:1 1 220px">Add an analyser<select data-path="analyser" data-r>${anOptions(st.dept,st.sub,st.analyser)}</select></label>
      ${st.analyser==='Other'?`<label class="f" style="flex:1 1 220px">Analyser name<input type="text" data-path="analyserOther" value="${esc(st.analyserOther)}" placeholder="Make and model"></label>`:''}
      <label class="f" style="flex:1 1 160px">Label (optional)<input type="text" id="an-suffix" placeholder="e.g. Main lab" maxlength="24"></label>
    <button type="button" class="btn" data-act="ainstadd"${pickedName()?'':' disabled'}>Add analyser</button></div>
      <span class="small" style="font-weight:400">Add every analyser in this department and tick the modules fitted (for example cobas pro with ISE, c 503 and e 801). Each analyte is assigned to an analyser and module in step 3. Adding the same model again names it "(2)".</span></div>
     <div class="f">Control levels run each day (starting value)<div class="seg" role="group" aria-label="Control levels">${[1,2,3,4,5,6].map(n=>`<button type="button" data-act="nlev" data-n="${n}" aria-pressed="${st.nlev===n}">${n}</button>`).join('')}</div><span class="small" style="font-weight:400">You can change the number of levels for each analyte in step 4.</span></div></div>`;
    canNext=(st.analysers||[]).length>0;
  }
  if(step===2){
    ensureSel();
    const ps=panelsNow(),uOf=i=>st.units[i.name]!=null?st.units[i.name]:i.unit;
    const unitIn=(attr,v)=>`<input type="text" class="unitin" list="unitlist" ${attr} value="${esc(v)}" aria-label="Unit" title="Unit">`;
    body=`${ps.length?'':`<div class="alert warn" style="margin:0 0 10px"><b>${esc(st.sub||st.dept)}</b> has no suggested panels. Create your own panels and tests below.</div>`}<p class="hint">Routine panels for <b>${esc(st.sub)}</b> on the ${esc(analyserName())} are ticked. Untick anything you do not run. Edit a unit if your lab reports it differently (for example mg/dL instead of mmol/L). Changing a unit does not convert existing results or targets. Add your own panels and tests at the bottom.${S.setup.done?' Panels and tests already in use are greyed out and cannot be unticked or deleted here; use Remove under Panels and analytes if you really need to take one out.':''}</p>
     <datalist id="unitlist">${UNITS.map(u=>`<option value="${esc(u)}">`).join('')}</datalist>
     <div class="grid2">${ps.map(p=>{const s=st.sel[p.name]||{},nL=p.items.filter(i=>isAdded(i.name)).length,allL=nL===p.items.length&&nL>0;const all=p.items.every(i=>s[i.name]||isAdded(i.name));
      return `<div class="panelcard${allL?' locked':''}"><h3><span>${esc(p.name)} ${p.routine?'<span class="chip acc">Routine</span>':''}${allL?' <span class="chip">Already added</span>':nL?' <span class="chip">'+nL+' already added</span>':''}</span>
       <button class="btn sm" data-act="panelall" data-p="${esc(p.name)}"${allL?' disabled':''}>${all?'Clear':'Select all'}</button></h3>
       <div class="checks col">${p.items.map(i=>`<div class="arow${isAdded(i.name)?' lk':''}"><label><input type="checkbox" data-an="${esc(p.name)}|${esc(i.name)}"${s[i.name]||isAdded(i.name)?' checked':''}${isAdded(i.name)?' disabled title="Already in use. Remove it from Panels and analytes if needed."':''}>${esc(i.name)}</label>${unitIn('data-unit="'+esc(i.name)+'"',uOf(i))}</div>`).join('')}</div></div>`}).join('')}</div>
     <h3 style="margin-top:6px">Custom panels</h3>
     <div class="grid2">${st.cpanels.map((cp,ci)=>{const all=cp.items.length&&cp.items.every(x=>x.on!==false),nL=cp.items.filter(x=>isAdded(x.name)).length,allL=nL===cp.items.length&&nL>0;
      return `<div class="panelcard${allL?' locked':''}"><h3><span>${esc(cp.name)} <span class="chip">Custom</span>${allL?' <span class="chip">Already added</span>':''}</span><span class="row" style="gap:6px"><button class="btn sm" data-act="cpall" data-ci="${ci}"${allL?' disabled':''}>${all?'Clear':'Select all'}</button><button class="btn sm danger" data-act="cpdel" data-ci="${ci}"${nL?' disabled title="Has analytes in use"':''}>Delete panel</button></span></h3>
       <div class="checks col">${cp.items.map((c,ii)=>`<div class="arow${isAdded(c.name)?' lk':''}"><label><input type="checkbox" data-cu="${ci}:${ii}"${c.on!==false||isAdded(c.name)?' checked':''}${isAdded(c.name)?' disabled':''}>${esc(c.name)}</label><span class="row" style="gap:4px;flex-wrap:nowrap">${unitIn('data-cunit="'+ci+':'+ii+'"',c.unit)}<button class="btn sm" data-act="cprem" data-ci="${ci}" data-ii="${ii}" aria-label="Remove ${esc(c.name)}" title="Remove"${isAdded(c.name)?' disabled':''}>×</button></span></div>`).join('')||'<span class="muted small">No analytes yet. Add the first one below.</span>'}</div>
       <div class="row" style="margin-top:10px"><label class="f" style="flex:2 1 120px">Analyte<input type="text" id="cpn-${ci}" placeholder="e.g. Ammonia"></label>
        <label class="f" style="flex:1 1 90px">Unit<input type="text" id="cpu-${ci}" list="unitlist" placeholder="µmol/L"></label>
        <button class="btn" data-act="cpadd" data-ci="${ci}">Add analyte</button></div></div>`}).join('')}
      <div class="panelcard"><h3>New custom panel</h3><p class="small muted" style="margin:6px 0 0">Group your own tests under one name, for example Special tests or Research. Each panel can have its own schedule in step 3.</p>
       <div class="row" style="margin-top:10px"><label class="f" style="flex:1 1 160px">Panel name<input type="text" id="newpanel" placeholder="e.g. Special tests"></label><button class="btn" data-act="cpnew">Create panel</button></div></div></div>`;
    canNext=chosenList().length>0;
  }
  if(step===3){
    if(!DA().length)buildAnalytes();
    const g=groupBy(DA(),a=>a.panel);
    body=`<p class="hint">Is any test done only on certain days (for example HbA1c on Mondays and Thursdays)? Leave it on <b>Every day</b> if it runs daily. The Today screen only asks for QC on scheduled days, and you can always mark a test as not performed.</p>
     <div class="stack">${byAnalyser(DA(),(p,list,inst)=>`<div class="panelcard" data-g="${esc(inst)}"><h3><span>${esc(p)}</span>
      <select data-psched="${esc(p)}" aria-label="Set whole panel" style="width:auto"><option value="">Set whole panel…</option><option value="daily">Every day</option><option value="weekdays">Specific days</option><option value="interval">Every N days</option><option value="ondemand">On demand</option></select>${ctxMulti()?`<select data-pinst="${esc(p)}" aria-label="Set analyser for whole panel" style="width:auto"><option value="">Move whole panel to…</option>${instOpts('','')}</select>`:''}</h3>
      <table class="t"><tbody>${list.map(a=>`<tr><td style="width:34%"><b>${esc(a.name)}</b></td>${ctxMulti()?`<td style="width:210px"><select data-inst="${a.id}" aria-label="Analyser for ${esc(a.name)}">${instOpts(instOf(a),a.mod||'')}</select></td>`:''}<td>${schedCtl(a)}</td></tr>`).join('')}</tbody></table></div>`)}</div>`;
  }
  if(step===4){
    const bad=DA().some(tgBad);
    next=S.setup.done?'Save and close':'Finish setup';canNext=!bad;
    const g=groupBy(DA(),a=>a.panel);
    body=`<p class="hint">Every control level has its own QC material name and lot number (for example Level 1 and Level 2 of one product are different materials with different lots). For each analyte choose how many levels you run, then enter the material, lot, mean and SD for each level. Use <b>Apply to panel</b> when the same materials cover a whole panel. Changes for a later lot are made with a comment on the Charts screen.</p>
     <div class="stack">${byAnalyser(DA(),(p,list,inst)=>{const K=Math.max(...list.map(a=>a.nlev));return `<div class="panelcard" data-g="${esc(inst)}"><h3><span>${esc(p)}</span></h3>
      <div class="small muted" style="margin-top:6px">QC materials for the whole panel</div>
      ${Array.from({length:K},(_,i)=>`<div class="row" style="margin:4px 0;align-items:flex-end"><span class="small" style="width:56px;padding-bottom:9px">${levelName(i)}</span><label class="f" style="flex:2 1 180px">QC material<input type="text" data-pm="${i}" placeholder="e.g. Multiqual Level ${i+1}"></label><label class="f" style="flex:1 1 110px">Lot no.<input type="text" data-pl="${i}"></label><label class="f" style="flex:0 0 140px">Expiry date<input type="date" data-pe="${i}"></label></div>`).join('')}
      <div class="row" style="margin-bottom:4px"><button class="btn sm" data-act="papply" data-p="${esc(p)}">Apply to panel</button>${(S.materials||[]).length?`<select data-matsel="${esc(p)}" aria-label="Saved QC material" style="width:auto"><option value="">Saved QC material…</option>${matOptions('')}</select><button class="btn sm" data-act="matpanel" data-p="${esc(p)}">Apply saved material</button>`:''}</div>
      ${list.map(a=>{const t=a.targets[0],lo=Math.max(1,minLv(a));return `<div style="border-top:1px solid var(--line);padding:10px 0;margin-top:8px"><div class="row" style="align-items:center">
        <b style="flex:1 1 130px;min-width:0">${esc(a.name)} <span class="muted small">${esc(a.unit)}</span></b>
        <label class="f" style="flex:0 1 120px">Control levels<select data-nlev="${a.id}">${[1,2,3,4,5,6].filter(n=>n>=lo).map(n=>`<option${n===a.nlev?' selected':''}>${n}</option>`).join('')}</select></label></div>
        ${t.levels.slice(0,a.nlev).map((l,i)=>`<div class="row" style="margin-top:8px;align-items:flex-end"><span class="small" style="width:56px;padding-bottom:9px">${levelName(i)}</span>
          <label class="f" style="flex:2 1 170px">QC material<input type="text" data-lmat="${a.id}:${i}" value="${esc(l.material)}" placeholder="Material name"></label>
          <label class="f" style="flex:1 1 100px">Lot no.<input type="text" data-llot="${a.id}:${i}" value="${esc(l.lot)}"></label>
          <label class="f" style="flex:0 0 140px">Expiry date<input type="date" data-lexp="${a.id}:${i}" value="${esc(l.exp||'')}" aria-label="${esc(a.name)} ${levelName(i)} expiry date"></label>
          <label class="f" style="flex:0 0 92px">Mean<input type="number" step="any" data-tg="${a.id}:${i}:mean" value="${l.mean==null?'':l.mean}" aria-label="${esc(a.name)} ${levelName(i)} mean"></label>
          <label class="f" style="flex:0 0 80px">SD<input type="number" step="any" min="0" data-tg="${a.id}:${i}:sd" value="${l.sd==null?'':l.sd}" aria-label="${esc(a.name)} ${levelName(i)} SD"></label></div>`).join('')}</div>`}).join('')}</div>`})}</div>
     ${bad?'<p id="tgnote" class="small muted">Every level needs a QC material name, an expiry date, a mean and an SD above zero.</p>':''}`;
  }
  return `<div class="panel stack"><div><h2>${S.setup.adding?'Add a department':S.setup.done?'Edit setup':'Set up QCLens'}</h2><p class="muted" style="margin:4px 0 0">${S.setup.adding?'Choose the department and its analysers, pick the analytes, then enter the QC materials. Your other departments are not changed.':S.setup.done?'Changes apply from now on for '+esc(S.setup.dept)+'. Existing results are kept.':'Answer four short steps. Your settings stay on this device.'}</p></div>
   ${steps}${body}
   <div class="row" style="justify-content:space-between"><div class="row">${step>1?'<button class="btn" data-act="back">Back</button>':''}${S.setup.done?'<button class="btn" data-act="closesetup">Cancel</button>':''}</div>
   <button class="btn primary" data-act="next"${canNext?'':' disabled'}>${next}</button></div></div>`;
}
