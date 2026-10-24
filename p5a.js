/* ===== Today, alerts ===== */
const UI={date:todayStr(),cid:null,win:30,skipOpen:null,report:[],modal:null};
const anOf=id=>S.analytes.find(a=>a.id===id);
function allFlags(){const f={};S.analytes.forEach(a=>Object.assign(f,evaluate(a,S.results)));return f}
const resultAt=(aid,lv,date)=>S.results.find(r=>r.aid===aid&&r.lv===lv&&r.date===date);
const skipAt=(aid,date)=>S.skips.find(s=>s.aid===aid&&s.date===date);
function chipFor(r,flags){
  const st=statusOf(flags,r),f=flags[r.id]||[];
  if(st==='ok')return '<span class="chip good">In control</span>';
  const names=f.map(x=>RULES[x.rule].name).join(', ');
  if(st==='ov')return `<span class="chip warn" title="${esc(r.ov.comment)}">Overridden · ${names}</span>`;
  return `<span class="chip ${st==='rej'?'bad':'warn'}">${st==='rej'?'Reject':'Warning'} · ${names}</span>`;
}
function dueRow(a,flags,extra){
  const sk=skipAt(a.id,UI.date),t=targetFor(a,UI.date),dp=decs(a);
  const head=`<div class="nm">${esc(a.name)} <span class="muted small">${esc(a.unit)}</span>${instTag(a)}<div class="small muted">${esc(scheduleText(a))}</div></div>`;
  if(sk)return `<div class="due skipped">${head}<div style="flex:1 1 300px" class="small"><span class="chip">Not performed today</span> ${esc(sk.reason||'No reason given')} <button class="btn sm" data-act="unskip" data-id="${a.id}">Undo</button></div></div>`;
  const ins=Array.from({length:a.nlev},(_,lv)=>{
    const r=resultAt(a.id,lv,UI.date),l=t.levels[lv]||{};
    return `<label class="f">${levelName(lv)} <span class="mono small">${fmt(l.mean,dp)} ± ${fmt(l.sd,dp+1>4?4:dp+1)}</span><span class="small muted" style="font-weight:400">${esc(l.material||'')}${l.lot?' · Lot '+esc(l.lot):''}</span><span>${expChip(l.exp,UI.date)}</span>
     <input type="number" step="any" inputmode="decimal"${perm('e_qc')?'':' disabled'} data-in="${a.id}:${lv}" value="${r?r.value:''}" aria-label="${esc(a.name)} ${levelName(lv)}">
     ${r?`<span>${chipFor(r,flags)}</span><span class="small muted" style="font-weight:400">${byShort(r)}</span>`:''}</label>`}).join('');
  const act=UI.skipOpen===a.id
    ?`<div class="row" style="flex:1 1 100%"><label class="f" style="flex:1 1 220px">Reason (e.g. analyser down, no reagent, not requested)<input type="text" id="skr-${a.id}" placeholder="Reason"></label><button class="btn primary sm" data-act="skipok" data-id="${a.id}">Confirm not performed</button><button class="btn sm" data-act="skipcancel">Cancel</button></div>`
    :isOD(a)?'':`<button class="btn sm" data-act="skip" data-id="${a.id}">Not performed</button>`;
  return `<div class="due">${head}${ins}${perm('e_qc')?`<button class="btn sm primary" data-act="saveone" data-id="${a.id}">Save QC results</button>${act}`:''}</div>`;
}
function alertCard(r,flags,full){
  const a=anOf(r.aid);if(!a)return '';
  const f=flags[r.id]||[],z=zOf(a,r),t=targetFor(a,r.date).levels[r.lv];
  const rej=f.some(x=>x.sev==='reject'),dp=decs(a);
  const fixes=[...new Set(f.flatMap(x=>RULES[x.rule].fix))];
  return `<div class="alert${rej?'':' warn'}"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b>${esc(a.name)}</b> · ${levelName(r.lv)} · ${fmtDate(r.date)}<br>
   <span class="mono">${fmt(r.value,dp)} ${esc(a.unit)}</span> <span class="muted small">(${z>=0?'+':''}${z.toFixed(2)} SD from mean ${fmt(t.mean,dp)})</span><br><span class="small muted">${byLine(r)}</span></div>
   <div>${f.map(x=>`<span class="chip ${x.sev==='reject'?'bad':'warn'}">${RULES[x.rule].name}</span>`).join(' ')}</div></div>
   <ul>${f.map(x=>`<li><b>${RULES[x.rule].name}:</b> ${RULES[x.rule].desc}</li>`).join('')}</ul>
   <details${full?' open':''} style="margin-top:8px"><summary><b>Suggested actions</b></summary><ul>${fixes.map(x=>`<li>${x}</li>`).join('')}</ul></details>
   ${r.ov?`<p class="small" style="margin:8px 0 0"><b>Overridden:</b> ${esc(r.ov.comment)} <span class="muted">(${r.ov.byName?esc(r.ov.byName)+' · ':''}${fmtTs(r.ov.at)})</span> ${perm('e_override')?`<button class="btn sm" data-act="unoverride" data-id="${r.id}">Undo override</button>`:''}</p>`
   :!perm('e_override')?`<p class="small muted" style="margin:8px 0 0">${isAdmin()?'':'Your access level can view this alert but not resolve it.'}</p>`
   :`<div class="row" style="margin-top:10px"><label class="f" style="flex:1 1 260px">${rej?'Override comment (required to accept this result)':'Comment (required to dismiss this warning)'}<textarea id="ov-${r.id}" rows="2" placeholder="e.g. Repeated with fresh vial, in control. Calibration done."></textarea></label>
    ${rej?`<button class="btn danger" data-act="override" data-id="${r.id}">Override with comment</button>`:`<button class="btn" data-act="override" data-id="${r.id}">Dismiss with comment</button>`}${isAdmin()?`<button class="btn sm" data-act="delres" data-id="${r.id}">Delete result</button>`:''}</div>`}</div>`;
}
function unresolved(flags){return VR().filter(r=>!r.ov&&(flags[r.id]||[]).some(x=>x.sev==='reject')).sort((x,y)=>x.date<y.date?1:-1)}
function expAlerts(){
  const out=[];VA().forEach(a=>{const t=curTarget(a);t.levels.slice(0,a.nlev).forEach((l,i)=>{const e=expInfo(l.exp);if(e.st==='expired'||e.st==='soon')out.push({a,i,l,e})})});
  return out.sort((x,y)=>x.e.days-y.e.days);
}
function expBanner(){
  const x=expAlerts();if(!x.length)return '';
  const ex=x.filter(y=>y.e.st==='expired'),so=x.filter(y=>y.e.st==='soon'),line=y=>`${esc(y.a.name)} ${levelName(y.i)} (${esc(y.l.material||'material')}${y.l.lot?' lot '+esc(y.l.lot):''}) ${y.e.st==='expired'?'expired '+fmtDate(y.l.exp):y.e.days===0?'expires today':'expires '+fmtDate(y.l.exp)+' ('+y.e.days+' d)'}`;
  return `<div class="alert${ex.length?'':' warn'}"><b>${ex.length?ex.length+' QC material'+(ex.length>1?'s are':' is')+' past expiry':so.length+' QC material'+(so.length>1?'s expire':' expires')+' within 30 days'}.</b>${ex.length&&so.length?' Another '+so.length+' expire within 30 days.':''}
   <details style="margin-top:6px"><summary>Show materials</summary><ul>${x.map(y=>`<li>${line(y)}</li>`).join('')}</ul><div class="small muted">Open the analyte on Charts and use Lot change to enter the new material and expiry date.</div></details></div>`;
}
const isOD=a=>(a.schedule||{}).type==='ondemand';
function missedDays(inF){
  const out=[],n=UI.missDays||14,t=new Date();
  for(let i=1;i<=n;i++){
    const d=dstr(new Date(t.getFullYear(),t.getMonth(),t.getDate()-i,12));
    const miss=VA().filter(a=>inF(a)&&isDue(a,d)&&d>=(a.targets[0].from||'')&&!skipAt(a.id,d)&&!S.results.some(r=>r.aid===a.id&&r.date===d));
    if(miss.length)out.push({d,miss});
  }
  return out;
}
function missedPanel(inF){
  const m=missedDays(inF);
  return `<details class="panel" style="padding:0"${m.length?' open':''}><summary style="padding:12px 16px;cursor:pointer"><b>Missed QC from previous days (${m.length} day${m.length===1?'':'s'})</b> <span class="muted small">Scheduled QC with no value and no "not performed" note</span></summary>
   <div style="padding:0 16px 12px">${m.length?m.map(x=>`<div class="row" style="justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding:8px 0;gap:8px"><div><b>${fmtDate(x.d)}</b> <span class="muted small">${x.miss.length} analyte${x.miss.length===1?'':'s'}: ${esc(x.miss.slice(0,6).map(a=>a.name).join(', '))}${x.miss.length>6?' and '+(x.miss.length-6)+' more':''}</span></div><button class="btn sm primary" data-act="gotodate" data-d="${x.d}">Enter QC for this date</button></div>`).join(''):'<p class="small muted" style="margin:8px 0 0">Nothing missed in the last '+(UI.missDays||14)+' days.</p>'}
   <div class="row" style="margin-top:8px"><button class="btn sm" data-act="missmore">Look back further</button><span class="small muted">You can also pick any earlier date with the date box above.</span></div></div></details>`;
}
function renderToday(){
  const dl=visDepts(),inF=a=>(!UI.inst||instOf(a)===UI.inst)&&(!UI.dept||a.dept===UI.dept)&&(!UI.mod||(a.mod||'')===UI.mod);
  const modOpts=[...new Set(VA().filter(a=>(!UI.inst||instOf(a)===UI.inst)&&(!UI.dept||a.dept===UI.dept)).map(a=>a.mod).filter(Boolean))].sort(),anyMod=VA().some(a=>a.mod);
  const flags=allFlags(),due=VA().filter(a=>inF(a)&&isDue(a,UI.date)),rest=VA().filter(a=>inF(a)&&!isDue(a,UI.date)&&!isOD(a)),od=VA().filter(a=>inF(a)&&isOD(a));
  const un=unresolved(flags);
  const byPanel=list=>{const gi=groupBy(list,a=>(dl.length>1?(deptOfA(a).dept||'')+' · ':'')+(multiInst()||anyMod?(instOf(a)||'No analyser')+(a.mod?' · '+a.mod:''):'')),hd='padding:10px 12px 0;font-weight:600;text-transform:uppercase;letter-spacing:.06em';
    return Object.entries(gi).map(([k,l])=>`${k?`<div class="angh" style="padding:10px 12px 6px;margin:0">${esc(k)}</div>`:''}${Object.entries(groupBy(l,a=>a.panel)).map(([p,pl])=>`<div class="small muted" style="${hd}">${esc(p)}</div>${pl.map(a=>dueRow(a,flags)).join('')}`).join('')}`).join('')};
  const isDone=a=>{if(skipAt(a.id,UI.date))return true;const rs=Array.from({length:a.nlev},(_,lv)=>resultAt(a.id,lv,UI.date));return rs.every(Boolean)&&!rs.some(r=>!r.ov&&(flags[r.id]||[]).some(x=>x.sev==='reject'))};
  const pend=due.filter(a=>!isDone(a)),fin=due.filter(isDone);
  const done=due.filter(a=>skipAt(a.id,UI.date)||S.results.some(r=>r.aid===a.id&&r.date===UI.date)).length;
  const rep=UI.report.map(id=>S.results.find(r=>r.id===id)).filter(r=>r&&(flags[r.id]||[]).length);
  return `<div class="stack">
   ${rep.length?`<div class="stack"><h3>Just saved: ${rep.some(r=>!r.ov&&(flags[r.id]||[]).some(x=>x.sev==='reject'))?'QC violations need attention':'warnings to review'}</h3>${rep.map(r=>alertCard(r,flags,true)).join('')}</div>`:''}
   ${expBanner()}
   ${un.length&&!rep.length?`<div class="alert"><b>${un.length} unresolved QC violation${un.length>1?'s':''}.</b> ${perm('v_alerts')?'<button class="btn sm" data-act="tab" data-t="alerts">Review and override</button>':'Please tell a supervisor.'}</div>`:''}
   <div class="panel"><div class="row" style="justify-content:space-between"><div><h2>Daily QC</h2><div class="muted">${dl.length>1?esc(dl.map(d=>d.dept).join(', ')):esc(S.setup.dept)+' · '+esc(S.setup.sub)} · ${esc(analyserNameV())}</div></div>
    <div class="row">${dl.length>1?`<label class="f">Department<select id="deptf" style="width:auto"><option value="">All departments</option>${dl.map(d=>`<option value="${d.id}"${d.id===UI.dept?' selected':''}>${esc(d.dept)}</option>`).join('')}</select></label>`:''}${multiInst()?`<label class="f">Analyser<select id="instf" style="width:auto"><option value="">All analysers</option>${dl.filter(d=>!UI.dept||d.id===UI.dept).flatMap(d=>d.analysers||[]).map(n=>`<option${n===UI.inst?' selected':''}>${esc(n)}</option>`).join('')}</select></label>`:''}${modOpts.length?`<label class="f">Module<select id="modf" style="width:auto"><option value="">All modules</option>${modOpts.map(m=>`<option${m===UI.mod?' selected':''}>${esc(m)}</option>`).join('')}</select></label>`:''}<button class="btn" data-act="dayprev" aria-label="Previous day" title="Previous day">&#9664;</button><label class="f">QC date<input type="date" id="qcdate" value="${UI.date}" max="${todayStr()}" style="width:auto"></label>
    <button class="btn" data-act="daynext" aria-label="Next day" title="Next day"${UI.date>=todayStr()?' disabled':''}>&#9654;</button><button class="btn" data-act="today">Today</button></div></div>
    <p class="small muted" style="margin:10px 0 0">${due.length} scheduled for ${fmtDate(UI.date)} · ${done} entered or marked not performed${due.length-done>0?` · <b>${due.length-done} waiting</b>`:''}</p></div>
   ${UI.date<todayStr()?`<div class="alert warn" style="margin:0"><b>Entering QC for ${fmtDate(UI.date)}.</b> Values you save are plotted on that date, not today. <button class="btn sm" data-act="today">Back to today</button></div>`:''}
   ${missedPanel(inF)}
   <div class="panel" style="padding:0"><div class="angh" style="padding:10px 12px 6px;margin:0">To be entered <span class="small muted" style="font-weight:400">${pend.length} test${pend.length===1?'':'s'}</span></div>${pend.length?byPanel(pend):due.length?'<div class="empty">All scheduled QC for this date is entered or marked not performed.</div>':'<div class="empty">Nothing is scheduled for this date. Use the list below to enter QC for an analyte anyway.</div>'}</div>
   ${fin.length?`<div class="panel" style="padding:0"><div class="row" style="padding:10px 12px;justify-content:space-between;align-items:center"><div><b>Entered or not performed</b> <span class="small muted">${fin.length} test${fin.length===1?'':'s'} with no violation to resolve</span></div><button class="btn sm" data-act="donetoggle" aria-expanded="${UI.doneOpen?'true':'false'}">${UI.doneOpen?'Hide':'Show'}</button></div>${UI.doneOpen?byPanel(fin):''}</div>`:''}
   ${od.length?`<div class="panel" style="padding:0"><div class="angh" style="padding:10px 12px 6px;margin:0">On-demand tests <span class="small muted" style="font-weight:400">No fixed schedule. Enter QC on the date it is run.</span></div>${byPanel(od)}</div>`:''}
   ${rest.length?`<details class="panel" style="padding:0"><summary style="padding:12px 16px;cursor:pointer"><b>Not scheduled on this date (${rest.length})</b> <span class="muted small">Open to run QC anyway</span></summary>${byPanel(rest)}</details>`:''}
   ${perm('e_qc')?'<div class="row"><button class="btn primary" data-act="saveqc">Save All QC results</button><span class="muted small">Empty boxes are ignored. Saving again on the same date replaces earlier values.</span></div>':'<p class="small muted">View only: your access level does not include entering QC.</p>'}</div>`;
}
function resolvedCard(r,flags){
  const a=anOf(r.aid);if(!a)return '';
  const f=flags[r.id]||[],z=zOf(a,r),t=targetFor(a,r.date).levels[r.lv],dp=decs(a),rej=f.some(x=>x.sev==='reject');
  const edits=(r.hist||[]).filter(h=>h.reason);
  return `<div class="panelcard"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px"><div><b>${esc(a.name)}</b> · ${levelName(r.lv)} · ${fmtDate(r.date)}${instTag(a)}<br>
   <span class="mono">${fmt(r.value,dp)} ${esc(a.unit)}</span> <span class="muted small">(${z>=0?'+':''}${z.toFixed(2)} SD from mean ${fmt(t.mean,dp)})</span><br><span class="small muted">Entered: ${byLine(r)}</span></div>
   <div>${f.map(x=>`<span class="chip ${x.sev==='reject'?'bad':'warn'}">${RULES[x.rule].name}</span>`).join(' ')}</div></div>
   <div class="small" style="margin-top:8px;padding:8px 10px;border-left:3px solid var(--${rej?'good':'line'});background:var(--surface2);border-radius:4px"><b>${rej?'Resolution comment':'Note'}:</b> ${esc(r.ov.comment||'No comment')}<div class="muted">${r.ov.byName?esc(r.ov.byName)+' · ':''}${fmtTs(r.ov.at)}</div></div>
   ${edits.length?`<div class="small" style="margin-top:6px"><b>Edit comments:</b>${edits.map(h=>`<div class="muted">${esc(h.reason)} (changed from ${fmt(h.value,dp)}${h.byName?' · '+esc(h.byName):''}${h.at?' · '+fmtTs(h.at):''})</div>`).join('')}</div>`:''}
   <div class="row" style="margin-top:6px">${perm('e_override')?`<button class="btn sm" data-act="unoverride" data-id="${r.id}">Reopen violation</button>`:''}</div></div>`;
}
function renderAlerts(){
  const flags=allFlags(),un=unresolved(flags),L=UI.resLimit||15;
  const warn=VR().filter(r=>!r.ov&&(flags[r.id]||[]).length&&!(flags[r.id]||[]).some(x=>x.sev==='reject')).sort((x,y)=>x.date<y.date?1:-1).slice(0,15);
  const byNew=(x,y)=>(y.ov.at||y.date)>(x.ov.at||x.date)?1:-1;
  const resRej=VR().filter(r=>r.ov&&(flags[r.id]||[]).some(x=>x.sev==='reject')).sort(byNew);
  const resOther=VR().filter(r=>r.ov&&!(flags[r.id]||[]).some(x=>x.sev==='reject')).sort(byNew);
  return `<div class="stack"><h2>QC alerts</h2>
   <h3>Unresolved violations (${un.length})</h3>
   ${un.length?un.map(r=>alertCard(r,flags,true)).join(''):'<div class="panel empty">No unresolved violations. All results are in control or resolved with a comment.</div>'}
   ${warn.length?`<h3>Recent warnings</h3>${warn.map(r=>alertCard(r,flags,false)).join('')}`:''}
   <h3>Resolved violations (${resRej.length})</h3>
   ${resRej.length?`<p class="small muted" style="margin:0">Rejections that were accepted with a comment explaining what was done. Newest first.</p>${resRej.slice(0,L).map(r=>resolvedCard(r,flags)).join('')}${resRej.length>L?`<div><button class="btn sm" data-act="resmore">Show more (${resRej.length-L} left)</button></div>`:''}`:'<div class="panel empty">No resolved violations yet.</div>'}
   ${resOther.length?`<h3>Reviewed warnings and notes (${resOther.length})</h3>${resOther.slice(0,L).map(r=>resolvedCard(r,flags)).join('')}${resOther.length>L?`<div><button class="btn sm" data-act="resmore">Show more (${resOther.length-L} left)</button></div>`:''}`:''}</div>`;
}
const LATE_MS=3600000;
function saveQC(scope){
  scope=scope||null;UI.saveScope=scope;
  const inputs=[...document.querySelectorAll('[data-in]')].filter(i=>i.value.trim()!==''&&(!scope||i.dataset.in.split(':')[0]===scope));
  const late=[];
  inputs.forEach(i=>{const [aid,lv]=i.dataset.in.split(':'),v=num(i.value),an=anOf(aid),r=an&&canSee(an)?resultAt(aid,+lv,UI.date):null;
    if(r&&v!=null&&r.value!==v&&r.at&&Date.now()-new Date(r.at).getTime()>LATE_MS)late.push({name:an.name,lv:+lv,old:r.value,nw:v,at:r.at,byName:r.byName})});
  if(late.length&&!UI.lateReason){UI.modal={late};render();return}
  const ids=[],added=[],edited=[],expd=[];let bad=0;
  inputs.forEach(i=>{
    const [aid,lv]=i.dataset.in.split(':');const v=num(i.value);if(v==null){bad++;return}
    const L=+lv,an=anOf(aid);if(!an||!canSee(an))return;let r=resultAt(aid,L,UI.date);
    if(r){if(r.value!==v){const pr=r.upd||r,isLate=r.at&&Date.now()-new Date(r.at).getTime()>LATE_MS,why=isLate?UI.lateReason:'';(r.hist||(r.hist=[])).push({value:r.value,by:pr.by||null,byName:pr.byName||'',at:pr.at||'',reason:why||''});edited.push(an.name+' '+levelName(L)+': '+r.value+' to '+v+(why?' (reason: '+why+')':''));r.value=v;r.upd={...stampNow(),reason:why||''};r.ov=null}}
    else{r={id:uid(),aid,lv:L,date:UI.date,value:v,ov:null,...stampNow()};S.results.push(r);added.push(an.name+' '+levelName(L)+'='+v)}
    S.skips=S.skips.filter(s=>!(s.aid===aid&&s.date===UI.date));
    ids.push(r.id);
    const ex=(targetFor(an,UI.date).levels[L]||{}).exp;if(ex&&expInfo(ex,UI.date).st==='expired')expd.push(an.name+' '+levelName(L));
  });
  const dOf=[...new Set(inputs.map(i=>(anOf(i.dataset.in.split(':')[0])||{}).dept).filter(Boolean))];
  if(added.length)audit('QC entered',fmtDate(UI.date)+': '+added.join('; '),null,dOf);
  if(expd.length)audit('QC run on expired material',fmtDate(UI.date)+': '+expd.join('; '),null,dOf);
  if(edited.length)audit('QC edited',fmtDate(UI.date)+': '+edited.join('; '),null,dOf);
  UI.lateReason=null;
  if(scope){UI.report=[...new Set([...(UI.report||[]),...ids])];inputs.forEach(i=>{if(UI.draft)delete UI.draft[UI.date+':'+i.dataset.in]})}else{UI.report=ids;UI.draft={}}
  save();if(expd.length)setTimeout(()=>toast('Saved, but the QC material for '+expd.join(', ')+' is past its expiry date.'),50);
  if(!ids.length){toast(bad?'Some values are not numbers.':scope?'Enter a QC value for this analyte first.':'Enter at least one QC value.');return}
  const f=allFlags(),n=ids.filter(id=>(f[id]||[]).some(x=>x.sev==='reject')).length;
  const w=ids.filter(id=>(f[id]||[]).length).length;toast(n?`${n} QC violation${n>1?'s':''} found. See actions below.`:w?'QC saved. Warnings to review below.':'QC saved. All entered values are in control.');
}
