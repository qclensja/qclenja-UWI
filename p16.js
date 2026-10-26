/* p16: calibration, reagent lot and maintenance log (events) shown as markers on charts */
const EVT=[['cal','Calibration','C','#8b6cf0'],['reg','Reagent lot change','R','#d6459f'],['mnt','Maintenance','M','#2f7fc4'],['oth','Other','!','#6b7280']];
const evT=k=>EVT.find(x=>x[0]===k)||EVT[3];
const evVis=ev=>canSeeD(ev.dept);
function evApplies(ev,a){
  if(ev.dept!==a.dept)return false;
  if(Array.isArray(ev.aids)&&ev.aids.length)return ev.aids.includes(a.id);
  if(ev.inst&&instOf(a)!==ev.inst)return false;
  if(ev.mod&&(a.mod||'')!==ev.mod)return false;
  return true;
}
const evFor=(a,from,to)=>(S.events||[]).filter(ev=>evApplies(ev,a)&&(!from||ev.date>=from)&&(!to||ev.date<=to)).sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:(x.at||'')<(y.at||'')?-1:1);
function evScope(ev){
  const d=(S.depts||[]).find(x=>x.id===ev.dept)||{};
  if(Array.isArray(ev.aids)&&ev.aids.length){const n=ev.aids.map(id=>(anOf(id)||{}).name).filter(Boolean);return (ev.inst?ev.inst+' · ':'')+(n.length>3?n.slice(0,3).join(', ')+' and '+(n.length-3)+' more':n.join(', '))}
  return (ev.inst||'All analysers')+(ev.mod?' · '+ev.mod:'')+' · all tests'+(S.depts&&S.depts.filter(x=>x.dept).length>1?' ('+(d.dept||'')+')':'');
}
function evLine(ev,a){
  const t=evT(ev.type);return `${t[1]} ${fmtDate(ev.date)}${ev.lot?' (lot '+ev.lot+')':''}${ev.note?': '+ev.note:''}`;
}
/* markers drawn on a Levey-Jennings chart. win = plotted results, X(i) = x of point i */
function evMarks(a,win,X,step,mt,ph,forExport){
  if(!win.length)return '';
  const first=win[0].date,list=evFor(a,first,todayStr());if(!list.length)return '';
  const groups={};
  list.forEach(ev=>{
    let i=win.findIndex(r=>r.date>=ev.date),x;
    if(i<0)x=X(win.length-1)+step/2;else x=X(i)-step/2;
    const k=Math.round(x);(groups[k]=groups[k]||{x,evs:[]}).evs.push(ev)});
  return Object.values(groups).map(g=>{
    const e0=g.evs[0],t=evT(e0.type),col=g.evs.length>1&&new Set(g.evs.map(e=>e.type)).size>1?'#374151':t[3],lab=g.evs.length>1?String(g.evs.length):t[2];
    const tip='<b>Logged events</b><br>'+g.evs.map(ev=>esc(evLine(ev,a))+(ev.byName?' <span style="opacity:.7">('+esc(ev.byName)+')</span>':'')).join('<br>');
    return `<line x1="${g.x}" x2="${g.x}" y1="${mt}" y2="${mt+ph}" stroke="${col}" stroke-width="1.5" stroke-dasharray="2 3" opacity=".85"/><circle cx="${g.x}" cy="${mt-4}" r="7.5" fill="${col}"/><text x="${g.x}" y="${mt-1}" text-anchor="middle" style="fill:#fff;font-size:9px;font-weight:700">${lab}</text>${forExport?'':`<circle class="hit" cx="${g.x}" cy="${mt-4}" r="11" fill="transparent" data-tip="${esc(tip)}"/>`}`}).join('');
}
function evNear(a,fromDate,toDate){   /* text block for shifts and violations */
  const l=evFor(a,fromDate,toDate);if(!l.length)return '';
  return `<div class="small" style="margin-top:6px"><b>Logged around then:</b><ul style="margin:4px 0 0">${l.slice(-6).map(ev=>`<li>${esc(evLine(ev,a))}</li>`).join('')}</ul></div>`;
}
const dAdd=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return dstr(d)};
/* ---------- the Calibration log tab ---------- */
function evDraft(){return UI.evd||(UI.evd={id:'',type:'cal',date:todayStr(),dept:'',inst:'',mod:'',aids:[],lot:'',note:''})}
function evRead(){
  const d=evDraft(),g=id=>{const e=document.getElementById(id);return e?e.value:null};
  const v={type:g('ev-type'),date:g('ev-date'),dept:g('ev-dept'),inst:g('ev-inst'),mod:g('ev-mod'),lot:g('ev-lot'),note:g('ev-note')};
  Object.keys(v).forEach(k=>{if(v[k]!==null)d[k]=v[k]});
  const boxes=[...document.querySelectorAll('[data-evt]')];if(boxes.length||document.getElementById('ev-tests'))d.aids=boxes.filter(b=>b.checked).map(b=>b.dataset.evt);
}
function evChange(e){
  const t=e.target;if(!t.id||!t.id.startsWith('ev-')&&!t.hasAttribute('data-evt'))return false;
  if(t.id&&t.id.startsWith('evf-')){UI.evf=UI.evf||{};UI.evf[t.id.slice(4)]=t.value;UI.evLim=0;render();return true}
  evRead();const d=evDraft();
  if(t.tagName==='TEXTAREA'||t.type==='text'||t.type==='date')return true;   /* no redraw: it would swallow the click on the Save button */
  if(t.id==='ev-dept'){d.inst='';d.mod='';d.aids=[]}
  if(t.id==='ev-inst'){d.mod='';d.aids=[]}
  if(t.id==='ev-mod')d.aids=[];
  render();return true;
}
function evScopeList(d){return S.analytes.filter(a=>a.dept===d.dept&&(!d.inst||instOf(a)===d.inst)&&(!d.mod||(a.mod||'')===d.mod)).sort((x,y)=>x.name.localeCompare(y.name,undefined,{numeric:true,sensitivity:'base'}))}
function evForm(){
  if(!perm('e_log'))return '';
  const d=evDraft(),dl=visDepts();if(!dl.length)return '';
  if(!d.dept||!dl.some(x=>x.id===d.dept))d.dept=dl[0].id;
  const rec=dl.find(x=>x.id===d.dept),insts=[...new Set(S.analytes.filter(a=>a.dept===d.dept).map(instOf).filter(Boolean))],
    mods=[...new Set(S.analytes.filter(a=>a.dept===d.dept&&(!d.inst||instOf(a)===d.inst)).map(a=>a.mod).filter(Boolean))].sort(),
    tests=evScopeList(d);
  const open=UI.evOpen||!!d.id||(d.aids&&d.aids.length)||UI.evNew;
  return `<details class="panel"${open?' open':''} data-evopen><summary style="cursor:pointer"><b>${d.id?'Edit logged event':'Log a calibration, reagent lot change or maintenance'}</b></summary>
   <form data-form="evsave" class="stack" style="margin-top:10px" autocomplete="off"><div class="grid2">
    <label class="f">What happened<select id="ev-type">${EVT.map(t=>`<option value="${t[0]}"${t[0]===d.type?' selected':''}>${t[1]}</option>`).join('')}</select></label>
    <label class="f">Date<input type="date" id="ev-date" value="${esc(d.date)}" max="${todayStr()}"></label>
    ${dl.length>1?`<label class="f">Department<select id="ev-dept">${dl.map(x=>`<option value="${x.id}"${x.id===d.dept?' selected':''}>${esc(x.dept)}</option>`).join('')}</select></label>`:''}
    <label class="f">Analyser<select id="ev-inst"><option value="">All analysers</option>${insts.map(n=>`<option${n===d.inst?' selected':''}>${esc(n)}</option>`).join('')}</select></label>
    ${mods.length?`<label class="f">Module<select id="ev-mod"><option value="">All modules</option>${mods.map(m=>`<option${m===d.mod?' selected':''}>${esc(m)}</option>`).join('')}</select></label>`:''}
    <label class="f">${d.type==='reg'?'Reagent lot number':d.type==='cal'?'Calibrator lot or calibration ID':'Lot or reference'} (optional)<input type="text" id="ev-lot" maxlength="60" value="${esc(d.lot)}"></label></div>
    <details id="ev-tests"${d.aids&&d.aids.length?' open':''}><summary class="small" style="cursor:pointer">Applies to <b>${d.aids&&d.aids.length?d.aids.length+' selected test'+(d.aids.length===1?'':'s'):'all '+tests.length+' tests'}</b> on this selection. Pick specific tests (optional)</summary>
     <div class="row" style="gap:6px 16px;margin-top:6px">${tests.map(a=>`<label class="small" style="display:flex;gap:5px;align-items:center;font-weight:400"><input type="checkbox" data-evt="${a.id}"${(d.aids||[]).includes(a.id)?' checked':''}>${esc(a.name)}</label>`).join('')}</div></details>
    <label class="f">Details (optional)<textarea id="ev-note" rows="2" maxlength="300" placeholder="e.g. Full calibration after reagent change; replaced ISE electrode; probe cleaned">${esc(d.note)}</textarea></label>
    ${UI.evMsg?`<p class="amsg" role="alert">${esc(UI.evMsg)}</p>`:''}
    <div class="row"><button class="btn primary" type="submit">${d.id?'Save changes':'Add to log'}</button>${d.id||UI.evNew||(d.aids&&d.aids.length)?'<button class="btn" type="button" data-act="evcancel">Cancel</button>':''}</div></form></details>`;
}
function renderLog(){
  const f=UI.evf||{},dl=visDepts(),can=perm('e_log');
  let list=(S.events||[]).filter(evVis);
  if(f.type)list=list.filter(e=>e.type===f.type);
  if(f.dept)list=list.filter(e=>e.dept===f.dept);
  if(f.from)list=list.filter(e=>e.date>=f.from);if(f.to)list=list.filter(e=>e.date<=f.to);
  if(f.q){const q=f.q.toLowerCase();list=list.filter(e=>((e.note||'')+' '+(e.lot||'')+' '+evScope(e)).toLowerCase().includes(q))}
  list=list.sort((x,y)=>x.date<y.date?1:x.date>y.date?-1:(y.at||'')<(x.at||'')?-1:1);
  const L=UI.evLim||50;
  return `<div class="stack"><div class="panel"><h2>Calibration and maintenance log</h2><p class="small muted" style="margin:4px 0 0;max-width:80ch">Record calibrations, reagent lot changes and maintenance. Each entry appears as a marker on the Levey-Jennings charts of the tests it applies to, and is listed beside any trend, shift or violation that follows it, which makes a shift easier to explain.</p></div>
   ${evForm()}
   <div class="panel"><div class="row" style="align-items:flex-end;gap:10px"><label class="f">Type<select id="evf-type" style="width:auto"><option value="">All types</option>${EVT.map(t=>`<option value="${t[0]}"${f.type===t[0]?' selected':''}>${t[1]}</option>`).join('')}</select></label>
    ${dl.length>1?`<label class="f">Department<select id="evf-dept" style="width:auto"><option value="">All departments</option>${dl.map(d=>`<option value="${d.id}"${f.dept===d.id?' selected':''}>${esc(d.dept)}</option>`).join('')}</select></label>`:''}
    <label class="f">From<input type="date" id="evf-from" value="${esc(f.from||'')}" style="width:auto"></label><label class="f">To<input type="date" id="evf-to" value="${esc(f.to||'')}" style="width:auto"></label>
    <label class="f" style="flex:1 1 160px">Search<input type="text" id="evf-q" value="${esc(f.q||'')}" placeholder="Lot, test or detail"></label></div>
    <div class="scroll" style="margin-top:10px"><table class="t"><thead><tr><th>Date</th><th>Type</th><th>Applies to</th><th>Lot / ID</th><th>Details</th><th>Logged by</th><th></th></tr></thead><tbody>
    ${list.slice(0,L).map(ev=>{const t=evT(ev.type);return `<tr><td>${fmtDate(ev.date)}</td><td><span class="chip" style="border-color:${t[3]};color:${t[3]}">${t[1]}</span></td><td class="small">${esc(evScope(ev))}</td><td class="mono small">${esc(ev.lot||'')}</td><td class="small">${esc(ev.note||'')}</td><td class="small">${esc(ev.byName||'')}${ev.at?'<div class="muted">'+fmtTs(ev.at)+'</div>':''}</td>
     <td style="white-space:nowrap">${can?`<button class="btn sm" data-act="evedit" data-id="${ev.id}">Edit</button> ${UI.evdel===ev.id?`<button class="btn sm danger" data-act="evdelok" data-id="${ev.id}">Yes, delete</button> <button class="btn sm" data-act="evdelno">Cancel</button>`:`<button class="btn sm" data-act="evdel" data-id="${ev.id}">Delete</button>`}`:''}</td></tr>`}).join('')||'<tr><td colspan="7" class="muted">Nothing logged yet.'+(can?' Use the form above.':'')+'</td></tr>'}</tbody></table></div>
    ${list.length>L?`<div style="margin-top:8px"><button class="btn sm" data-act="evmore">Show more (${list.length-L} left)</button></div>`:''}</div></div>`;
}
function evSave(){
  evRead();const d=evDraft();
  if(!perm('e_log'))return;
  if(!d.date||d.date>todayStr()){UI.evMsg='Choose the date it happened (today or earlier).';return}
  if(!S.depts.some(x=>x.id===d.dept)){UI.evMsg='Choose a department.';return}
  const now=nowIso(),rec={type:d.type,date:d.date,dept:d.dept,inst:d.inst||'',mod:d.mod||'',aids:(d.aids||[]).slice(),lot:(d.lot||'').trim(),note:(d.note||'').trim(),modAt:now};
  S.events=S.events||[];
  if(d.id){const o=S.events.find(x=>x.id===d.id);if(!o)return;Object.assign(o,rec);delete o._h;audit('Log entry edited',evT(o.type)[1]+' '+fmtDate(o.date)+' · '+evScope(o),null,[o.dept])}
  else{const o={id:uid(),...rec,by:CU?CU.id:null,byName:CU?CU.name:'',at:now};S.events.push(o);audit('Log entry added',evT(o.type)[1]+' '+fmtDate(o.date)+' · '+evScope(o)+(o.lot?' · lot '+o.lot:''),null,[o.dept])}
  UI.evd=null;UI.evOpen=false;UI.evNew=false;UI.evMsg='';save();toast('Added to the log.');
}
function evAct(act,el){
  const id=el.dataset.id;
  if(act==='evnew'){   /* from a chart: prefill with that test */
    const a=anOf(id);if(!a||!perm('e_log'))return true;
    UI.evd={id:'',type:'cal',date:todayStr(),dept:a.dept,inst:instOf(a),mod:'',aids:[a.id],lot:'',note:''};UI.evNew=true;setTab('log');return true}
  if(act==='evcancel'){UI.evd=null;UI.evNew=false;UI.evOpen=false;UI.evMsg='';render();return true}
  if(act==='evmore'){UI.evLim=(UI.evLim||50)+50;render();return true}
  if(!perm('e_log'))return true;
  if(act==='evedit'){const o=(S.events||[]).find(x=>x.id===id);if(!o)return true;UI.evd={id:o.id,type:o.type,date:o.date,dept:o.dept,inst:o.inst||'',mod:o.mod||'',aids:(o.aids||[]).slice(),lot:o.lot||'',note:o.note||''};UI.evOpen=true;render();window.scrollTo(0,0);return true}
  if(act==='evdel'){UI.evdel=id;render();return true}
  if(act==='evdelno'){UI.evdel=null;render();return true}
  if(act==='evdelok'){const o=(S.events||[]).find(x=>x.id===id);UI.evdel=null;if(o){tomb(id);S.events=S.events.filter(x=>x.id!==id);audit('Log entry deleted',evT(o.type)[1]+' '+fmtDate(o.date)+' · '+evScope(o),null,[o.dept]);save();toast('Deleted from the log.')}render();return true}
  return false;
}
