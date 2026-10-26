/* ===== Other QC: plot QC values for earlier days that were never entered ===== */
const obState=()=>{
  const t=new Date(),d=n=>dstr(new Date(t.getFullYear(),t.getMonth(),t.getDate()-n,12));
  const o=UI.ob||(UI.ob={aid:'',from:d(14),to:d(1),sched:false,inst:'',mod:''});if(!UI.obd)UI.obd={};return o;
};
function obDates(o){
  const out=[];let [y,m,dd]=o.to.split('-').map(Number);const lim=o.from;
  for(let i=0;i<62;i++){const ds=dstr(new Date(y,m-1,dd-i,12));if(ds<lim)break;out.push(ds)}
  return out;
}
function renderOther(){
  const o=obState(),yest=dstr(new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()-1,12));
  if(o.to>yest)o.to=yest;if(o.from>o.to)o.from=o.to;
  const all=VAL();if(!all.length)return '<div class="panel empty">No active analytes available.</div>';
  if(o.mode==='day')return renderOtherDay(o,all,yest);
  const cf=x=>(!o.inst||instOf(x)===o.inst)&&(!o.mod||(x.mod||'')===o.mod);let L=all.filter(cf);if(!L.length){o.inst='';o.mod='';L=all}
  if(!L.some(x=>x.id===o.aid))o.aid=L[0].id;
  const a=anOf(o.aid),t=curTarget(a),dp=decs(a),insts=[...new Set(all.map(instOf).filter(Boolean))],mods=[...new Set(all.filter(x=>!o.inst||instOf(x)===o.inst).map(x=>x.mod).filter(Boolean))].sort();
  const g=groupBy(L,x=>(multiInst()?instLabel(x)+' · ':'')+x.panel);
  let dates=obDates(o);const total=dates.length;
  if(o.sched)dates=dates.filter(d=>isDue(a,d));
  const flags=allFlags();
  const rows=dates.map(d=>{
    const sk=skipAt(a.id,d),dueD=isDue(a,d),dw=DOW[dowOf(d)];
    const cells=Array.from({length:a.nlev},(_,lv)=>{const r=resultAt(a.id,lv,d);
      if(r)return `<td><span class="mono">${fmt(r.value,dp)}</span> <span class="small">${chipFor(r,flags)}</span></td>`;
      const dv=UI.obd[a.id+'|'+d+'|'+lv];
      return `<td><input type="number" step="any" inputmode="decimal" data-ob="${a.id}|${d}|${lv}" value="${dv!==undefined?esc(dv):''}" aria-label="${esc(a.name)} ${levelName(lv)} on ${fmtDate(d)}" style="width:110px"></td>`}).join('');
    return `<tr><td style="white-space:nowrap"><b>${fmtDate(d)}</b><div class="small muted">${dw}</div></td><td class="small">${isOD(a)?'On demand':dueD?'Scheduled':'Not scheduled'}${sk?'<br><span class="chip">Not performed</span>':''}</td>${cells}</tr>`}).join('');
  const nIn=Object.values(UI.obd).filter(v=>String(v).trim()!=='').length;
  return `<div class="stack"><div class="panel stack"><div><h2>Other QC</h2>${obModeSw(o)}<p class="muted small" style="margin:4px 0 0;max-width:80ch">Plot QC values for earlier days that were never entered. Pick an analyte and a range of dates, type the values you have, and save. Each value is plotted on the chart on its own date. Days that already have a value are shown as they are; to change those, use the Today tab.</p></div>
   <div class="row">${insts.length>1?`<label class="f">Analyser<select id="ob-inst" style="width:auto"><option value="">All analysers</option>${insts.map(n=>`<option${n===o.inst?' selected':''}>${esc(n)}</option>`).join('')}</select></label>`:''}${mods.length?`<label class="f">Module<select id="ob-mod" style="width:auto"><option value="">All modules</option>${mods.map(m=>`<option${m===o.mod?' selected':''}>${esc(m)}</option>`).join('')}</select></label>`:''}
    <label class="f">Analyte<select id="ob-aid" style="width:auto;min-width:200px">${Object.entries(g).map(([p,l])=>`<optgroup label="${esc(p)}">${l.map(x=>`<option value="${x.id}"${x.id===a.id?' selected':''}>${esc(x.name)}${all.filter(y=>y.name===x.name).length>1?' · '+esc(instLabel(x)):''}</option>`).join('')}</optgroup>`).join('')}</select></label>
    <label class="f">From<input type="date" id="ob-from" value="${o.from}" max="${o.to}" style="width:auto"></label><label class="f">To<input type="date" id="ob-to" value="${o.to}" max="${yest}" style="width:auto"></label>
    <label class="f" style="flex-direction:row;align-items:center;gap:6px;font-weight:400"><input type="checkbox" id="ob-sched"${o.sched?' checked':''}> Scheduled days only</label></div>
   <p class="small muted" style="margin:0">${esc(a.name)} ${esc(a.unit)}${instTag(a)} · ${esc(scheduleText(a))}${total>=62?' · showing the 62 most recent days in the range':''}</p></div>
   <div class="panel"><div class="scroll"><table class="t"><thead><tr><th>Date</th><th>Schedule</th>${Array.from({length:a.nlev},(_,lv)=>`<th>${levelName(lv)}<div class="mono small muted" style="font-weight:400">${fmt(t.levels[lv].mean,dp)} ± ${fmt(t.levels[lv].sd,dp+1>4?4:dp+1)}</div></th>`).join('')}</tr></thead><tbody>${rows||'<tr><td colspan="9" class="muted">No dates in this range.</td></tr>'}</tbody></table></div>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-act="obsave">Save and plot these values${nIn?' ('+nIn+')':''}</button><button class="btn" data-act="tab" data-t="charts" data-aid="${a.id}">View chart</button><span class="muted small">Empty boxes are ignored. Values you enter for other analytes are kept while you switch.</span></div></div></div>`;
}
function saveOther(only){
  const o=obState(),entries=Object.entries(UI.obd).filter(([k,v])=>String(v).trim()!==''&&(!only||k.split('|')[0]===only));
  const mine=entries.filter(([k])=>true);
  if(!mine.length)return toast(only?'Enter a value for this analyte first.':'Enter at least one QC value.');
  const ids=[],added=[],byAn={};let bad=0,exist=0,notAllowed=0;
  mine.forEach(([k,v])=>{
    const [aid,d,lv]=k.split('|'),n=num(v),an=anOf(aid);
    if(n==null){bad++;return}if(!an||!canSee(an)){notAllowed++;return}
    if(resultAt(aid,+lv,d)){exist++;return}
    const r={id:uid(),aid,lv:+lv,date:d,value:n,ov:null,backfill:true,...stampNow()};S.results.push(r);ids.push(r.id);
    S.skips=S.skips.filter(s=>!(s.aid===aid&&s.date===d));
    (byAn[aid]||(byAn[aid]=[])).push(d);added.push(an.name+' '+levelName(+lv)+' '+fmtDate(d)+'='+n);
  });
  Object.keys(byAn).forEach(aid=>{const an=anOf(aid);audit('QC entered for earlier days',an.name+': '+[...new Set(byAn[aid])].sort().map(fmtDate).join(', ')+' ('+byAn[aid].length+' value'+(byAn[aid].length>1?'s':'')+')',null,[an.dept])});
  if(only)entries.forEach(([k])=>delete UI.obd[k]);else UI.obd={};save();
  if(!ids.length)return toast(bad?'Some values are not numbers.':'Nothing new to save.');
  const f=allFlags(),n=ids.filter(id=>(f[id]||[]).some(x=>x.sev==='reject')).length;
  toast(ids.length+' value'+(ids.length>1?'s':'')+' saved and plotted.'+(n?' '+n+' violation'+(n>1?'s':'')+' found. See QC alerts.':''));
}

function obModeSw(o){return `<div class="row" style="margin:8px 0 0"><button class="btn sm${o.mode==='day'?'':' primary'}" data-act="obmode" data-m="an">One analyte, many days</button><button class="btn sm${o.mode==='day'?' primary':''}" data-act="obmode" data-m="day">All analytes, one day</button></div>`}
function renderOtherDay(o,all,yest){
  if(!o.day||o.day>yest)o.day=yest;
  const insts=[...new Set(all.map(instOf).filter(Boolean))],mods=[...new Set(all.filter(x=>!o.inst||instOf(x)===o.inst).map(x=>x.mod).filter(Boolean))].sort();
  const d=o.day,flags=allFlags();
  let L=all.filter(x=>(!o.inst||instOf(x)===o.inst)&&(!o.mod||(x.mod||'')===o.mod));
  const miss=x=>Array.from({length:x.nlev},(_,lv)=>lv).filter(lv=>!resultAt(x.id,lv,d));
  const outstanding=x=>isDue(x,d)&&!skipAt(x.id,d)&&miss(x).length>0;
  const nOut=L.filter(outstanding).length;
  if(!o.all)L=L.filter(outstanding);
  const maxL=Math.max(1,...L.map(x=>x.nlev)),g=groupBy(L,x=>(multiInst()?instLabel(x)+' · ':'')+x.panel);
  const nIn=Object.values(UI.obd).filter(v=>String(v).trim()!=='').length;
  const body=Object.entries(g).map(([p,l])=>`<tr><td colspan="${maxL+2}" class="small muted" style="font-weight:600;background:var(--soft,transparent)">${esc(p)}</td></tr>`+l.map(a=>{const dp=decs(a);
    return `<tr><td><b>${esc(a.name)}</b> <span class="small muted">${esc(a.unit||'')}${instTag(a)}</span></td>${Array.from({length:maxL},(_,lv)=>{
      if(lv>=a.nlev)return '<td></td>';const r=resultAt(a.id,lv,d);
      if(r)return `<td><span class="mono">${fmt(r.value,dp)}</span> <span class="small">${chipFor(r,flags)}</span></td>`;
      const dv=UI.obd[a.id+'|'+d+'|'+lv];
      return `<td><input type="number" step="any" inputmode="decimal" data-ob="${a.id}|${d}|${lv}" value="${dv!==undefined?esc(dv):''}" aria-label="${esc(a.name)} ${levelName(lv)}" style="width:100px"></td>`}).join('')}<td>${miss(a).length?`<button class="btn sm primary" data-act="obsaveone" data-id="${a.id}">Save</button>`:'<span class="small muted">Complete</span>'}</td></tr>`}).join('')).join('');
  return `<div class="stack"><div class="panel stack"><div><h2>Other QC</h2>${obModeSw(o)}<p class="muted small" style="margin:8px 0 0;max-width:80ch">Pick a day and enter every QC value that was missed on it. By default only analytes scheduled that day with values still missing are listed. Type the values you have, then save.</p></div>
   <div class="row">${insts.length>1?`<label class="f">Analyser<select id="ob-inst" style="width:auto"><option value="">All analysers</option>${insts.map(n=>`<option${n===o.inst?' selected':''}>${esc(n)}</option>`).join('')}</select></label>`:''}${mods.length?`<label class="f">Module<select id="ob-mod" style="width:auto"><option value="">All modules</option>${mods.map(m=>`<option${m===o.mod?' selected':''}>${esc(m)}</option>`).join('')}</select></label>`:''}
    <label class="f">Day<input type="date" id="ob-day" value="${d}" max="${yest}" style="width:auto"></label>
    <label class="f" style="flex-direction:row;align-items:center;gap:6px;font-weight:400"><input type="checkbox" id="ob-all"${o.all?' checked':''}> Show all analytes, not just outstanding</label></div>
   <p class="small muted" style="margin:0"><b>${fmtDate(d)}</b> (${DOW[dowOf(d)]}) · ${nOut} analyte${nOut===1?'':'s'} outstanding</p></div>
   <div class="panel"><div class="scroll"><table class="t"><thead><tr><th>Analyte</th>${Array.from({length:maxL},(_,lv)=>`<th>${levelName(lv)}</th>`).join('')}<th></th></tr></thead><tbody>${body||'<tr><td colspan="9" class="muted">Nothing outstanding for this day.</td></tr>'}</tbody></table></div>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-act="obsave">Save and plot these values${nIn?' ('+nIn+')':''}</button><span class="muted small">Empty boxes are ignored. Values already saved are shown as they are.</span></div></div></div>`;
}
