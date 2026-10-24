/* ===== QC material library: enter a material once, apply it to many tests ===== */
/* QC materials belong to departments. Admins see all; other users see materials assigned to their departments (unassigned = everyone). */
const matVis=m=>!CU||CU.role==='admin'||!Array.isArray(CU.depts)||!(m.depts||[]).length||m.depts.some(d=>CU.depts.includes(d));
const matList=()=>(S.materials||[]).filter(matVis);
const matDeptTxt=m=>{const ds=(m.depts||[]).map(id=>(S.depts||[]).find(x=>x.id===id)).filter(Boolean);return ds.length?ds.map(d=>d.dept+dsub(d.sub)).join(', '):'All departments'};
const blankMatLv=()=>({material:'',lot:'',exp:''});
function applyMat(m,list,which){
  let n=0;
  list.forEach(a=>{const t=which==='first'?a.targets[0]:curTarget(a);
    m.levels.slice(0,a.nlev).forEach((l,i)=>{const L=t.levels[i];if(!L)return;L.material=l.material||'';L.lot=l.lot||'';L.exp=l.exp||''});n++});
  return n;
}
function matLine(m){return m.levels.map((l,i)=>levelName(i)+': '+(l.material||'(no name)')+(l.lot?' · Lot '+l.lot:'')+(l.exp?' · exp '+fmtDate(l.exp):'')).join('<br>')}
function renderMaterials(){
  const ed=perm('e_materials'),ms=matList().slice().sort((a,b)=>a.name.localeCompare(b.name)),d=ed?UI.mdr:null,ap=ed?UI.mAp:null,mine=VA();
  const form=d?`<div class="panelcard stack"><h3>${d.id?'Edit QC material':'New QC material'}</h3>
    <div class="row"><label class="f" style="flex:2 1 240px">Name of this QC product<input type="text" data-mf="name" value="${esc(d.name)}" placeholder="e.g. Bio-Rad Multiqual"></label>
    <label class="f" style="flex:0 1 140px">Control levels<select data-mn>${[1,2,3,4,5,6].map(n=>`<option${n===d.levels.length?' selected':''}>${n}</option>`).join('')}</select></label></div>
    ${isAdmin()?`<div><div class="small" style="font-weight:600;margin-bottom:4px">Departments that can use this material</div><div class="row" style="gap:6px 16px">${deptList().map(x=>`<label class="small" style="display:flex;gap:5px;align-items:center;font-weight:400"><input type="checkbox" data-mdept="${x.id}"${(d.depts||[]).includes(x.id)?' checked':''}>${esc(x.dept+dsub(x.sub))}</label>`).join('')}</div><p class="small muted" style="margin:4px 0 0">Leave all unticked to make it available to every department.</p></div>`:`<p class="small muted" style="margin:0">${d.id?'Available to: '+esc(matDeptTxt(d)):'This material will be assigned to your department'+(Array.isArray(CU&&CU.depts)&&CU.depts.length>1?'s':'')+' automatically.'}</p>`}
    ${d.levels.map((l,i)=>`<div class="row" style="align-items:flex-end"><span class="small" style="width:56px;padding-bottom:9px">${levelName(i)}</span>
      <label class="f" style="flex:2 1 170px">Material name<input type="text" data-ml="${i}:material" value="${esc(l.material)}" placeholder="e.g. Multiqual Level ${i+1}"></label>
      <label class="f" style="flex:1 1 100px">Lot no.<input type="text" data-ml="${i}:lot" value="${esc(l.lot)}"></label>
      <label class="f" style="flex:0 0 140px">Expiry date<input type="date" data-ml="${i}:exp" value="${esc(l.exp||'')}"></label></div>`).join('')}
    <div class="row"><button class="btn primary" data-act="matsave">Save material</button><button class="btn" data-act="matcancel">Cancel</button></div></div>`:'';
  const applyBox=m=>{
    const sel=ap.sel||{},g=groupBy(mine,a=>(deptList().length>1?deptOfA(a).dept+' · ':'')+(multiInst()?instLabel(a)+' · ':'')+a.panel),nSel=Object.keys(sel).filter(k=>sel[k]).length;
    return `<div class="panelcard stack" style="margin-top:8px"><b>Apply "${esc(m.name)}" to tests</b>
     <div class="row"><button class="btn sm" data-act="matselall">Select all</button><button class="btn sm" data-act="matselnone">Clear</button><span class="small muted">${nSel} selected</span></div>
     ${Object.entries(g).map(([p,l])=>`<div><div class="small muted" style="font-weight:600;margin:6px 0 2px">${esc(p)}</div><div class="row" style="gap:6px 16px">${l.map(a=>`<label class="small" style="display:flex;gap:5px;align-items:center;font-weight:400"><input type="checkbox" data-masel="${a.id}"${sel[a.id]?' checked':''}>${esc(a.name)}</label>`).join('')}</div></div>`).join('')||'<span class="small muted">No tests in this department.</span>'}
     <p class="small muted" style="margin:0">Fills in the material name, lot number and expiry date for each control level. Means and SDs are not changed. Level 1 gets the first level of the material, and so on. If a lot change has already been recorded for a test, use <b>Lot change</b> on the Charts screen instead.</p>
     <div class="row"><button class="btn primary" data-act="matrun" data-id="${m.id}"${nSel?'':' disabled'}>Apply to ${nSel} test${nSel===1?'':'s'}</button><button class="btn" data-act="matapplycancel">Cancel</button></div></div>`};
  return `<div class="stack"><div class="panel stack"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h2>QC materials</h2><p class="small muted" style="margin:4px 0 0;max-width:80ch">Enter a QC product once, with its material names, lot numbers and expiry dates, then apply it to as many tests as you like instead of typing it again for each one.</p></div>${d||!ed?'':'<button class="btn primary" data-act="matnew">Add QC material</button>'}</div>
   ${form}
   ${ms.map(m=>`<div class="panelcard"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px"><div><b>${esc(m.name)}</b> <span class="chip">${esc(matDeptTxt(m))}</span><div class="small muted" style="margin-top:4px">${matLine(m).split('<br>').map(esc).join('<br>')}</div></div>
     ${ed?`<div class="row" style="gap:6px"><button class="btn sm primary" data-act="matapply" data-id="${m.id}">Apply to tests</button><button class="btn sm" data-act="matedit" data-id="${m.id}">Edit</button>${UI.mdel===m.id?`<button class="btn sm danger" data-act="matdelok" data-id="${m.id}">Yes, delete</button><button class="btn sm" data-act="matdelno">Cancel</button>`:`<button class="btn sm danger" data-act="matdel" data-id="${m.id}">Delete</button>`}</div>`:''}</div>
     ${ap&&ap.id===m.id?applyBox(m):''}</div>`).join('')||(d?'':'<p class="small muted" style="margin:0">No QC materials saved yet.</p>')}</div></div>`;
}
function matOptions(sel){return matList().slice().sort((a,b)=>a.name.localeCompare(b.name)).map(m=>`<option value="${m.id}"${m.id===sel?' selected':''}>${esc(m.name)}</option>`).join('')}

/* ===== Expired QC material: ask for the new lot of the same material, or dismiss with a comment ===== */
function expiredGroups(){
  const g={};
  VA().forEach(a=>{const t=curTarget(a);t.levels.slice(0,a.nlev).forEach((l,lv)=>{
    if(!l.exp||expInfo(l.exp).st!=='expired'||l.expDis)return;
    const k=[l.material||'',l.lot||'',l.exp].join('|');(g[k]||(g[k]={key:k,material:l.material||'QC material',lot:l.lot||'',exp:l.exp,items:[]})).items.push({a,lv})})});
  return Object.values(g).sort((x,y)=>x.exp<y.exp?-1:x.exp>y.exp?1:x.key<y.key?-1:1);
}
function renderExpModal(){
  const gs=expiredGroups();
  if(!gs.length){UI.modal=null;return ''}
  return `<div class="modalbg" data-act="mclose"><div class="modal" style="max-width:780px" role="dialog" aria-modal="true" aria-label="Expired QC material" data-stop>
   <h2>QC material has expired</h2><p class="muted" style="margin:4px 0 12px">Enter the new lot of the same material for each one below. Mean and SD stay as they are, and the change is recorded as a lot change from today. If you cannot replace it yet, dismiss it with a comment.</p>
   <div class="stack">${gs.map((x,i)=>{const names=[...new Set(x.items.map(y=>y.a.name))];
    return `<div class="panelcard stack"><div><b>${esc(x.material)}</b>${x.lot?' · Lot '+esc(x.lot):''} <span class="chip bad">Expired ${fmtDate(x.exp)}</span>
      <div class="small muted" style="margin-top:4px">Used by ${x.items.length} level${x.items.length===1?'':'s'} on ${names.length} test${names.length===1?'':'s'}: ${esc(names.slice(0,6).join(', '))}${names.length>6?' and '+(names.length-6)+' more':''}</div></div>
      <div class="row" style="align-items:flex-end"><label class="f" style="flex:1 1 160px">New lot number<input type="text" id="xp-lot-${i}"></label><label class="f" style="flex:0 0 160px">New expiry date<input type="date" id="xp-exp-${i}" min="${todayStr()}"></label><button class="btn primary" data-act="expapply" data-g="${i}">Use new lot</button></div>
      <div class="row" style="align-items:flex-end"><label class="f" style="flex:1 1 260px">Or dismiss with a comment<textarea id="xp-note-${i}" rows="2" placeholder="e.g. New lot arrives Monday. Using the old material until then."></textarea></label><button class="btn" data-act="expdis" data-g="${i}">Dismiss with comment</button></div>
      <p id="xp-err-${i}" class="small" style="color:var(--bad);margin:0" hidden></p></div>`}).join('')}</div>
   <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-act="mclose">Remind me later</button></div></div></div>`;
}
function expApply(i){
  const gs=expiredGroups(),x=gs[i],g=id=>document.getElementById(id),err=g('xp-err-'+i);if(!x)return true;
  const fail=m=>{err.textContent=m;err.hidden=false;return true};
  const lot=g('xp-lot-'+i).value.trim(),exp=g('xp-exp-'+i).value;
  if(!lot)return fail('Enter the new lot number.');
  if(!exp)return fail('Enter the new expiry date.');
  if(exp<=todayStr())return fail('The new expiry date must be after today.');
  const today=todayStr(),seen=new Set();
  x.items.forEach(({a,lv})=>{
    let t=curTarget(a);
    if(t.from!==today){t={from:today,type:'New control lot',comment:'Replaced expired lot '+(x.lot||'')+' of '+x.material+' (expired '+fmtDate(x.exp)+')',...stampNow(),levels:t.levels.map(l=>{const c={...l};delete c.expDis;return c})};a.targets.push(t)}
    const L=t.levels[lv];L.lot=lot;L.exp=exp;delete L.expDis;seen.add(a.id)});
  (S.materials||[]).forEach(m=>m.levels.forEach(l=>{if(l.material===x.material&&(l.lot||'')===x.lot){l.lot=lot;l.exp=exp}}));
  audit('QC material renewed',x.material+': lot '+(x.lot||'none')+' (expired '+fmtDate(x.exp)+') replaced by lot '+lot+', expires '+fmtDate(exp)+' on '+seen.size+' test'+(seen.size===1?'':'s'),null,[...new Set(x.items.map(y=>y.a.dept))]);
  save();toast('New lot saved for '+seen.size+' test'+(seen.size===1?'':'s')+'.');
}
function expDismiss(i){
  const gs=expiredGroups(),x=gs[i],g=id=>document.getElementById(id),err=g('xp-err-'+i);if(!x)return true;
  const c=g('xp-note-'+i).value.trim();
  if(!c){err.textContent='Write a comment to dismiss this.';err.hidden=false;return true}
  const st=stampNow();x.items.forEach(({a,lv})=>{curTarget(a).levels[lv].expDis={comment:c,...st}});
  audit('Expired QC material dismissed',x.material+(x.lot?' lot '+x.lot:'')+' (expired '+fmtDate(x.exp)+'): '+c,null,[...new Set(x.items.map(y=>y.a.dept))]);
  save();toast('Dismissed with your comment.');
}
