/* p18: search (analyte, lot, date) and filters on the Alerts tab */
const dOnly=s=>{const m=String(s||'').trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);if(m)return m[3]+'-'+pad(+m[2])+'-'+pad(+m[1]);const n=String(s||'').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);return n?n[1]+'-'+pad(+n[2])+'-'+pad(+n[3]):''};
const lvOf=(a,r)=>((targetFor(a,r.date)||{}).levels||[])[r.lv]||{};
function alActive(){const f=UI.alf||{};return !!(f.q||f.inst||f.rule||f.who||f.from||f.to)}
function alMatch(r,flags){
  const f=UI.alf||{},a=anOf(r.aid);if(!a)return false;const fl=flags[r.id]||[],t=lvOf(a,r);
  if(f.inst&&instOf(a)!==f.inst)return false;
  if(f.rule&&!fl.some(x=>x.rule===f.rule))return false;
  if(f.who&&r.byName!==f.who&&!(r.ov&&r.ov.byName===f.who))return false;
  if(f.from&&r.date<f.from)return false;if(f.to&&r.date>f.to)return false;
  const q=(f.q||'').trim().toLowerCase();
  if(q){const iso=dOnly(q);
    const hay=[a.name,a.panel,instOf(a),a.mod,t.lot,t.material,r.date,fmtDate(r.date),r.byName,r.ov&&r.ov.comment,r.ov&&r.ov.byName,...ptNotes(r).map(n=>n.text)].filter(Boolean).join(' | ').toLowerCase();
    if(!(hay.includes(q)||(iso&&r.date===iso)))return false}
  return true;
}
const alF=(list,flags)=>alActive()?list.filter(r=>alMatch(r,flags)):list;
function alertBar(flags){
  const f=UI.alf||{},rs=VR(),insts=[...new Set(VA().map(a=>instOf(a)).filter(Boolean))].sort(),
   who=[...new Set(rs.flatMap(r=>[r.byName,r.ov&&r.ov.byName]).filter(Boolean))].sort((x,y)=>x.localeCompare(y)),
   used=new Set(Object.values(flags).flat().map(x=>x.rule)),rules=Object.keys(RULES).filter(k=>used.has(k)||k===f.rule);
  const sel=(id,lab,opts,v)=>`<label class="f">${lab}<select id="${id}" style="width:auto"><option value="">All</option>${opts.map(o=>`<option value="${esc(o[0])}"${o[0]===v?' selected':''}>${esc(o[1])}</option>`).join('')}</select></label>`;
  return `<div class="panel stack" style="gap:10px"><div class="row" style="align-items:flex-end;gap:10px;flex-wrap:wrap">
   <label class="f" style="flex:1 1 220px">Find in alerts<input type="search" id="alq" value="${esc(f.q||'')}" placeholder="Analyte, lot, date, comment or person" autocomplete="off"></label>
   ${insts.length>1?sel('alinst','Analyser',insts.map(x=>[x,x]),f.inst):''}
   ${sel('alrule','Rule',rules.map(k=>[k,RULES[k].name]),f.rule)}
   ${sel('alwho','Person',who.map(x=>[x,x]),f.who)}
   <label class="f">From<input type="date" id="alfrom" value="${esc(f.from||'')}"></label><label class="f">To<input type="date" id="alto" value="${esc(f.to||'')}"></label>
   ${alActive()?'<button class="btn sm" data-act="alclear">Clear filters</button>':''}</div>
   <p class="small muted" style="margin:0">Person matches who entered the result or who resolved it. Filters apply to every list below.</p></div>`;
}
/* ---- global search ---- */
function srchData(q){
  q=(q||'').trim().toLowerCase();if(!q)return null;
  const iso=dOnly(q),A=VA(),flags=allFlags();
  const an=A.filter(a=>(a.name+' '+(a.panel||'')+' '+instOf(a)).toLowerCase().includes(q)).sort((x,y)=>x.name.localeCompare(y.name)).slice(0,25);
  const lots=new Map();
  A.forEach(a=>(a.targets||[]).forEach((tg,ti)=>tg.levels.forEach((l,li)=>{
    if(l.lot&&(l.lot+' '+(l.material||'')).toLowerCase().includes(q)){const k=(l.material||'')+'|'+l.lot;if(!lots.has(k))lots.set(k,{lot:l.lot,material:l.material||'',rows:[]});
      lots.get(k).rows.push({a,li,from:tg.from,exp:l.exp,cur:ti===a.targets.length-1})}})));
  const days=iso?VR().filter(r=>r.date===iso).sort((x,y)=>(anOf(x.aid).name+x.lv).localeCompare(anOf(y.aid).name+y.lv)):[];
  return {q,iso,an,lots:[...lots.values()].slice(0,12),days,flags};
}
function srchHtml(q){
  const d=srchData(q);if(!d)return '<p class="muted small" style="margin:8px 0 0">Type an analyte name, a QC lot number or a date (for example 22/10/2026).</p>';
  let h='';
  if(d.iso)h+=`<h3 style="margin:12px 0 6px">${fmtDate(d.iso)}</h3><div class="row" style="margin-bottom:6px"><button class="btn sm" data-act="srchday" data-d="${d.iso}">Open this day on Today</button></div>`+(d.days.length?`<div class="stack" style="gap:4px">${d.days.map(r=>{const a=anOf(r.aid),f=d.flags[r.id]||[],rej=f.some(x=>x.sev==='reject');return `<button class="btn" style="text-align:left" data-act="ptnote" data-id="${r.id}"><b>${esc(a.name)}</b> · ${levelName(r.lv)} · <span class="mono">${fmt(r.value,decs(a))} ${esc(a.unit)}</span> ${f.length?f.map(x=>`<span class="chip ${x.sev==='reject'?'bad':'warn'}">${RULES[x.rule].name}</span>`).join(' '):'<span class="chip good">In control</span>'}</button>`}).join('')}</div>`:'<p class="muted small">No QC results on this date.</p>');
  if(d.an.length)h+=`<h3 style="margin:12px 0 6px">Analytes (${d.an.length})</h3><div class="stack" style="gap:4px">${d.an.map(a=>`<button class="btn" style="text-align:left" data-act="srchan" data-id="${a.id}"><b>${esc(a.name)}</b> <span class="muted small">${esc(a.panel||'')}${multiInst()?' · '+esc(instLabel(a)):''}${a.off?' · disabled':''}</span></button>`).join('')}</div>`;
  if(d.lots.length)h+=`<h3 style="margin:12px 0 6px">QC lots</h3>`+d.lots.map(l=>`<div class="panelcard small" style="margin-bottom:6px"><b>${esc(l.lot)}</b> <span class="muted">${esc(l.material)}</span><div class="muted" style="margin-top:4px">${l.rows.slice(0,40).map(x=>`<button class="btn sm" data-act="srchan" data-id="${x.a.id}" style="margin:0 6px 6px 0">${esc(x.a.name)} L${x.li+1}</button>`).join('')}${l.rows.length>40?'…':''}</div><div class="muted" style="margin-top:4px">Used from ${fmtDate(l.rows.map(x=>x.from).sort()[0])}${l.rows.some(x=>x.exp)?' · expires '+fmtDate(l.rows.map(x=>x.exp).filter(Boolean).sort().pop()):''}${l.rows.some(x=>x.cur)?' · current lot':' · past lot'}</div></div>`).join('');
  if(!d.an.length&&!d.lots.length&&!(d.iso))h+='<p class="muted small" style="margin:8px 0 0">Nothing found.</p>';
  return h;
}
function renderSrchModal(){
  return `<div class="modalbg" data-act="mclose"><div class="modal" style="max-width:680px" role="dialog" aria-modal="true" aria-label="Search" data-stop>
   <h2>Search</h2><label class="f" style="margin-top:6px">Analyte, lot or date<input type="search" id="srch-q" value="${esc(UI.srchQ||'')}" autocomplete="off" placeholder="e.g. Sodium, A1042 or 22/10/2026"></label>
   <div id="srch-res">${srchHtml(UI.srchQ)}</div><div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn" data-act="mclose">Close</button></div></div></div>`;
}
function srchAct(act,el){
  if(act==='alclear'){UI.alf={};render();return true}
  if(act==='srchopen'){UI.srchQ='';UI.modal={srch:true};render();setTimeout(()=>{const i=document.getElementById('srch-q');if(i)i.focus()},30);return true}
  if(act==='srchan'){const a=anOf(el.dataset.id);UI.modal=null;if(a){if(!perm('v_charts'))return true;UI.cid=a.id;if(a.dept&&S.setup.cur!==a.dept&&canSeeD(a.dept))try{loadCtx(a.dept)}catch(e){}UI.cid=a.id;setTab('charts')}else render();return true}
  if(act==='srchday'){UI.modal=null;UI.date=el.dataset.d;UI.report=[];setTab('today');return true}
  return false;
}
document.addEventListener('input',e=>{
  const t=e.target;if(!t||!t.id||typeof CU==='undefined'||!CU)return;
  if(t.id==='srch-q'){UI.srchQ=t.value;const r=document.getElementById('srch-res');if(r)r.innerHTML=srchHtml(t.value)}
  else if(t.id==='alq'){(UI.alf=UI.alf||{}).q=t.value;const r=document.getElementById('alres');if(r)r.innerHTML=alertsBody(allFlags())}
});
document.addEventListener('change',e=>{
  const t=e.target;if(!t||!CU)return;const m={alinst:'inst',alrule:'rule',alwho:'who',alfrom:'from',alto:'to'}[t.id];
  if(m){(UI.alf=UI.alf||{})[m]=t.value;render()}
});
document.addEventListener('keydown',e=>{
  if(!CU||UI.modal)return;if((e.key==='/'&&!/^(INPUT|TEXTAREA|SELECT)$/.test((e.target||{}).tagName))||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')){e.preventDefault();srchAct('srchopen')}
});
