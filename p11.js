/* ===== QC material library: enter a material once, apply it to many tests ===== */
const blankMatLv=()=>({material:'',lot:'',exp:''});
function applyMat(m,list,which){
  let n=0;
  list.forEach(a=>{const t=which==='first'?a.targets[0]:a.targets[a.targets.length-1];
    m.levels.slice(0,a.nlev).forEach((l,i)=>{const L=t.levels[i];if(!L)return;L.material=l.material||'';L.lot=l.lot||'';L.exp=l.exp||''});n++});
  return n;
}
function matLine(m){return m.levels.map((l,i)=>levelName(i)+': '+(l.material||'(no name)')+(l.lot?' · Lot '+l.lot:'')+(l.exp?' · exp '+fmtDate(l.exp):'')).join('<br>')}
function renderMaterials(){
  const ms=(S.materials||[]).slice().sort((a,b)=>a.name.localeCompare(b.name)),d=UI.mdr,ap=UI.mAp,mine=DA();
  const form=d?`<div class="panelcard stack"><h3>${d.id?'Edit QC material':'New QC material'}</h3>
    <div class="row"><label class="f" style="flex:2 1 240px">Name of this QC product<input type="text" data-mf="name" value="${esc(d.name)}" placeholder="e.g. Bio-Rad Multiqual"></label>
    <label class="f" style="flex:0 1 140px">Control levels<select data-mn>${[1,2,3,4,5,6].map(n=>`<option${n===d.levels.length?' selected':''}>${n}</option>`).join('')}</select></label></div>
    ${d.levels.map((l,i)=>`<div class="row" style="align-items:flex-end"><span class="small" style="width:56px;padding-bottom:9px">${levelName(i)}</span>
      <label class="f" style="flex:2 1 170px">Material name<input type="text" data-ml="${i}:material" value="${esc(l.material)}" placeholder="e.g. Multiqual Level ${i+1}"></label>
      <label class="f" style="flex:1 1 100px">Lot no.<input type="text" data-ml="${i}:lot" value="${esc(l.lot)}"></label>
      <label class="f" style="flex:0 0 140px">Expiry date<input type="date" data-ml="${i}:exp" value="${esc(l.exp||'')}"></label></div>`).join('')}
    <div class="row"><button class="btn primary" data-act="matsave">Save material</button><button class="btn" data-act="matcancel">Cancel</button></div></div>`:'';
  const applyBox=m=>{
    const sel=ap.sel||{},g=groupBy(mine,a=>(multiInst()?instLabel(a)+' · ':'')+a.panel),nSel=Object.keys(sel).filter(k=>sel[k]).length;
    return `<div class="panelcard stack" style="margin-top:8px"><b>Apply "${esc(m.name)}" to tests in ${esc(S.setup.dept||'this department')}</b>
     <div class="row"><button class="btn sm" data-act="matselall">Select all</button><button class="btn sm" data-act="matselnone">Clear</button><span class="small muted">${nSel} selected</span></div>
     ${Object.entries(g).map(([p,l])=>`<div><div class="small muted" style="font-weight:600;margin:6px 0 2px">${esc(p)}</div><div class="row" style="gap:6px 16px">${l.map(a=>`<label class="small" style="display:flex;gap:5px;align-items:center;font-weight:400"><input type="checkbox" data-masel="${a.id}"${sel[a.id]?' checked':''}>${esc(a.name)}</label>`).join('')}</div></div>`).join('')||'<span class="small muted">No tests in this department.</span>'}
     <p class="small muted" style="margin:0">Fills in the material name, lot number and expiry date for each control level. Means and SDs are not changed. Level 1 gets the first level of the material, and so on. If a lot change has already been recorded for a test, use <b>Lot change</b> on the Charts screen instead.</p>
     <div class="row"><button class="btn primary" data-act="matrun" data-id="${m.id}"${nSel?'':' disabled'}>Apply to ${nSel} test${nSel===1?'':'s'}</button><button class="btn" data-act="matapplycancel">Cancel</button></div></div>`};
  return `<div class="panel stack"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h3>QC materials</h3><p class="small muted" style="margin:4px 0 0;max-width:80ch">Enter a QC product once, with its material names, lot numbers and expiry dates, then apply it to as many tests as you like instead of typing it again for each one.</p></div>${d?'':'<button class="btn primary" data-act="matnew">Add QC material</button>'}</div>
   ${form}
   ${ms.map(m=>`<div class="panelcard"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px"><div><b>${esc(m.name)}</b><div class="small muted" style="margin-top:4px">${matLine(m).split('<br>').map(esc).join('<br>')}</div></div>
     <div class="row" style="gap:6px"><button class="btn sm primary" data-act="matapply" data-id="${m.id}">Apply to tests</button><button class="btn sm" data-act="matedit" data-id="${m.id}">Edit</button>${UI.mdel===m.id?`<button class="btn sm danger" data-act="matdelok" data-id="${m.id}">Yes, delete</button><button class="btn sm" data-act="matdelno">Cancel</button>`:`<button class="btn sm danger" data-act="matdel" data-id="${m.id}">Delete</button>`}</div></div>
     ${ap&&ap.id===m.id?applyBox(m):''}</div>`).join('')||(d?'':'<p class="small muted" style="margin:0">No QC materials saved yet.</p>')}</div>`;
}
function matOptions(sel){return (S.materials||[]).slice().sort((a,b)=>a.name.localeCompare(b.name)).map(m=>`<option value="${m.id}"${m.id===sel?' selected':''}>${esc(m.name)}</option>`).join('')}
