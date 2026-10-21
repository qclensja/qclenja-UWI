/* ===== Levey-Jennings chart ===== */
const CW=920,CH=360;
function ljSVG(a,lv,flags,n,forExport){
  const pts=S.results.filter(r=>r.aid===a.id&&r.lv===lv).sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:0);
  const win=n>0?pts.slice(-n):pts;
  const cur=curTarget(a).levels[lv]||{mean:0,sd:1},dp=decs(a);
  const ml=62,mr=104,mt=16,mb=36,pw=CW-ml-mr,ph=CH-mt-mb;
  const zs=win.map(r=>zOf(a,r)),ymax=Math.max(3.5,Math.ceil((Math.max(0,...zs.map(Math.abs))+.3)*2)/2);
  const Y=z=>mt+(ymax-z)/(2*ymax)*ph,step=pw/Math.max(win.length,1),X=i=>ml+(i+.5)*step;
  let s=`<svg class="lj" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="Levey-Jennings chart, ${esc(a.name)} ${levelName(lv)}">`;
  s+=`<rect x="${ml}" y="${Y(ymax)}" width="${pw}" height="${Y(3)-Y(ymax)}" fill="var(--zone3)"/><rect x="${ml}" y="${Y(-3)}" width="${pw}" height="${Y(-ymax)-Y(-3)}" fill="var(--zone3)"/>`;
  s+=`<rect x="${ml}" y="${Y(3)}" width="${pw}" height="${Y(2)-Y(3)}" fill="var(--zone2)"/><rect x="${ml}" y="${Y(-2)}" width="${pw}" height="${Y(-3)-Y(-2)}" fill="var(--zone2)"/>`;
  s+=`<rect x="${ml}" y="${Y(1)}" width="${pw}" height="${Y(-1)-Y(1)}" fill="var(--zone1)"/>`;
  for(let k=-3;k<=3;k++){
    const cls=k===0?'mean':Math.abs(k)===3?'s3':Math.abs(k)===2?'s2':'s1',val=cur.mean+k*cur.sd;
    const lc=k===0?'lm':Math.abs(k)===3?'l3':Math.abs(k)===2?'l2':'';
    s+=`<line class="${cls}" x1="${ml}" x2="${ml+pw}" y1="${Y(k)}" y2="${Y(k)}"/>`;
    s+=`<text class="${lc}" x="${ml-8}" y="${Y(k)+4}" text-anchor="end">${k===0?'Mean':(k>0?'+':'−')+Math.abs(k)+' SD'}</text>`;
    s+=`<text class="${lc}" x="${ml+pw+8}" y="${Y(k)+4}">${fmt(val,dp+1)}</text>`;
  }
  if(!win.length)s+=`<text x="${ml+pw/2}" y="${CH/2}" text-anchor="middle">No QC results yet for this level</text>`;
  const every=Math.ceil(win.length/14);
  win.forEach((r,i)=>{if(i===win.length-1||(i%every===0&&win.length-1-i>=Math.max(every,2)))s+=`<text x="${X(i)}" y="${CH-12}" text-anchor="middle">${shortDate(r.date)}</text>`});
  // lot / target change markers
  win.forEach((r,i)=>{
    const ti=targetIndex(a,r.date),pt=i>0?targetIndex(a,win[i-1].date):ti;
    if(i>0&&ti!==pt){const x=X(i)-step/2,t=a.targets[ti];
      s+=`<line class="lotline" x1="${x}" x2="${x}" y1="${mt}" y2="${mt+ph}"/><text x="${x+4}" y="${mt+11}" style="fill:var(--accent)">${esc((t.levels[lv]&&t.levels[lv].lot)?'Lot '+t.levels[lv].lot:'New targets')}</text>`}
  });
  patternsFor(a,lv,S.results).forEach(sp=>{
    const ix=win.map((r,i)=>sp.ids.includes(r.id)?i:-1).filter(i=>i>=0);if(ix.length<2)return;
    const x0=X(ix[0])-step/2,x1=X(ix[ix.length-1])+step/2,tr=sp.kind==='trend';
    s+=`<rect class="${tr?'sp-t':'sp-s'}" x="${x0}" y="${mt}" width="${x1-x0}" height="${ph}" rx="3"/><text class="spl ${tr?'spl-t':'spl-s'}" x="${x0+4}" y="${mt+ph-(tr?6:20)}">${tr?'Trend':'Shift'} ${sp.dir>0?'↑':'↓'} ${sp.n} runs</text>`});
  const stat=win.map(r=>statusOf(flags,r));
  if(win.length>1)s+=`<polyline class="line" points="${win.map((r,i)=>X(i)+','+Y(Math.max(-ymax,Math.min(ymax,zs[i])))).join(' ')}"/>`;
  win.forEach((r,i)=>{
    const x=X(i),y=Y(Math.max(-ymax,Math.min(ymax,zs[i]))),st=stat[i];
    const cls=st==='rej'?'r':st==='warn'?'w':st==='ov'?'ov':'';
    if(st==='rej')s+=`<circle class="ring" cx="${x}" cy="${y}" r="11"/>`;
    s+=`<circle class="pt ${cls}" cx="${x}" cy="${y}" r="${st==='ok'?4.5:6}"/>`;
    if(!forExport){
      const f=(flags[r.id]||[]).map(q=>RULES[q.rule].name).join(', ');
      const tip=`<b>${fmtDate(r.date)}</b><br>${fmt(r.value,dp+1)} ${esc(a.unit)} (${zs[i]>=0?'+':''}${zs[i].toFixed(2)} SD)${f?'<br>'+f:''}${r.ov?'<br>Override: '+esc(r.ov.comment)+(r.ov.byName?' ('+esc(r.ov.byName)+')':''):''}<br>${byLine(r)}`;
      s+=`<circle class="hit" cx="${x}" cy="${y}" r="13" fill="transparent" data-tip="${esc(tip)}"/>`;
    }
  });
  return {svg:s+'</svg>',count:win.length,flagged:stat.filter(x=>x==='rej').length,warn:stat.filter(x=>x==='warn').length,cur};
}
function patternBox(a,lv,n){
  const pts=S.results.filter(r=>r.aid===a.id&&r.lv===lv).sort((x,y)=>x.date<y.date?-1:1),win=new Set((n>0?pts.slice(-n):pts).map(r=>r.id));
  const sp=patternsFor(a,lv,S.results).filter(p=>p.ids.some(id=>win.has(id))).sort((x,y)=>x.to<y.to?1:-1).slice(0,4);
  if(!sp.length)return '';
  return `<div class="alert warn" style="margin-top:10px"><b>${sp.some(p=>p.kind==='trend')&&sp.some(p=>p.kind==='shift')?'Trend and shift detected':sp[0].kind==='trend'?'Trend detected':'Shift detected'} on ${levelName(lv)}</b>
   ${sp.map(p=>{const tr=p.kind==='trend',R=RULES[tr?'T7':'S6'];return `<details${p===sp[0]?' open':''} style="margin-top:8px"><summary><span class="chip warn">${tr?'Trend':'Shift'} ${p.dir>0?'upward':'downward'}</span> ${p.n} runs, ${fmtDate(p.from)} to ${fmtDate(p.to)}${p.open?' · <b>still ongoing</b>':' · ended'}</summary>
      <p class="small" style="margin:6px 0 0">${tr?'Results are moving steadily '+(p.dir>0?'up':'down')+' without a change in targets.':'Results have stayed '+(p.dir>0?'above':'below')+' the mean for '+p.n+' consecutive runs.'} ${R.desc}</p><div class="small" style="margin-top:6px"><b>Suggested actions</b></div><ul class="small" style="margin:4px 0 0">${R.fix.map(x=>`<li>${x}</li>`).join('')}</ul></details>`}).join('')}</div>`;
}
function renderCharts(){
  if(!VA().length)return '<div class="panel empty">No analytes available. '+(isAdmin()?'Set up analytes first.':'Ask an administrator to give you access to a department.')+'</div>';
  const cf=x=>(!UI.cinst||instOf(x)===UI.cinst)&&(!UI.cmod||(x.mod||'')===UI.cmod);let CL=VA().filter(cf);if(!CL.length){UI.cinst='';UI.cmod='';CL=VA()}
  const cmods=[...new Set(VA().filter(x=>!UI.cinst||instOf(x)===UI.cinst).map(x=>x.mod).filter(Boolean))].sort(),cinsts=[...new Set(VA().map(instOf).filter(Boolean))];
  if(!CL.some(x=>x.id===UI.cid))UI.cid=CL[0].id;
  const a=anOf(UI.cid),flags=allFlags(),g=groupBy(CL,x=>(multiInst()?instLabel(x)+' · ':'')+x.panel),dp=decs(a);
  const t=curTarget(a);
  const charts=Array.from({length:a.nlev},(_,lv)=>{
    const c=ljSVG(a,lv,flags,UI.win,false),l=t.levels[lv];
    return `<div class="panel"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h3>${esc(a.name)} · ${levelName(lv)}</h3>
     <div class="small muted mono">Mean ${fmt(l.mean,dp+1)} · SD ${fmt(l.sd,dp+1)} · CV ${l.mean?(l.sd/l.mean*100).toFixed(1):'–'}% · ${esc(a.unit)}</div><div class="small muted">${esc(l.material||'No QC material')}${l.lot?' · Lot '+esc(l.lot):''} ${expChip(l.exp)}</div></div>
     <div>${c.flagged?`<span class="chip bad">${c.flagged} rejection${c.flagged>1?'s':''}</span>`:'<span class="chip good">No rejections</span>'} ${c.warn?`<span class="chip warn">${c.warn} warning${c.warn>1?'s':''}</span>`:''}</div></div>
     <div class="chartbox" style="margin-top:10px">${c.svg}</div>
     ${patternBox(a,lv,UI.win)}
     <div class="legend"><span><i style="background:var(--accent)"></i>In control</span><span><i style="background:var(--warn)"></i>1₂ₛ warning</span><span><i style="background:var(--bad)"></i>Rule violation</span><span><i style="background:var(--surface);border:2px solid var(--bad);width:8px;height:8px"></i>Overridden</span><span><i style="background:var(--warn);opacity:.35;width:14px"></i>Trend</span><span><i style="background:var(--bad);opacity:.25;width:14px"></i>Shift</span><span>Points are plotted in SD units against the targets active on their date. Right-hand values are the current limits.</span></div></div>`}).join('');
  const rows=S.results.filter(r=>r.aid===a.id).sort((x,y)=>x.date<y.date?1:x.date>y.date?-1:x.lv-y.lv).slice(0,20);
  return `<div class="stack"><div class="panel"><div class="row" style="justify-content:space-between">
    <div class="row">${cinsts.length>1?`<label class="f">Analyser<select id="cinst" style="width:auto"><option value="">All analysers</option>${cinsts.map(n=>`<option${n===UI.cinst?' selected':''}>${esc(n)}</option>`).join('')}</select></label>`:''}${cmods.length?`<label class="f">Module<select id="cmod" style="width:auto"><option value="">All modules</option>${cmods.map(m=>`<option${m===UI.cmod?' selected':''}>${esc(m)}</option>`).join('')}</select></label>`:''}<label class="f">Analyte<select id="cid" style="width:auto;min-width:200px">${Object.entries(g).map(([p,l])=>`<optgroup label="${esc(p)}">${l.map(x=>`<option value="${x.id}"${x.id===a.id?' selected':''}>${esc(x.name)}${VA().filter(y=>y.name===x.name).length>1?' · '+esc(instLabel(x)):''}</option>`).join('')}</optgroup>`).join('')}</select></label>
     <label class="f">Show<select id="win" style="width:auto"><option value="20"${UI.win===20?' selected':''}>Last 20 runs</option><option value="30"${UI.win===30?' selected':''}>Last 30 runs</option><option value="60"${UI.win===60?' selected':''}>Last 60 runs</option><option value="90"${UI.win===90?' selected':''}>Last 90 runs</option><option value="120"${UI.win===120?' selected':''}>Last 120 runs</option><option value="0"${UI.win===0?' selected':''}>All runs</option></select></label></div>
    <div class="row">${perm('e_lot')?`<button class="btn" data-act="lot" data-id="${a.id}">Lot change / adjust mean &amp; SD</button>`:''}${perm('e_export')?`<button class="btn primary" data-act="xl" data-id="${a.id}">Export to Excel</button>`:''}</div></div>
    <p class="small muted" style="margin:10px 0 0">${deptList().length>1?esc(deptOfA(a).dept)+' · ':''}${multiInst()?'Analyser: '+esc(instLabel(a))+' · ':''}Schedule: ${esc(scheduleText(a))}${a.targets.length>1?` · ${a.targets.length} target sets on record`:''}</p></div>
   ${charts}
   <div class="panel"><h3 style="margin-bottom:8px">Recent results</h3><div class="scroll"><table class="t"><thead><tr><th>Date</th><th>Level</th><th>Value</th><th>SD from mean</th><th>Status</th><th>Comment</th><th>Entered by</th><th>Entered</th></tr></thead><tbody>
   ${rows.map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${levelName(r.lv)}</td><td class="mono">${fmt(r.value,dp+1)}</td><td class="mono">${zOf(a,r).toFixed(2)}</td><td>${chipFor(r,flags)}</td><td class="small">${r.ov?esc(r.ov.comment):''}</td><td>${esc(r.byName||'–')}</td><td class="small">${r.at?fmtTs(r.at):'–'}${r.upd?'<br>edited by '+esc(r.upd.byName)+' · '+fmtTs(r.upd.at)+(r.upd.reason?'<br><i>Reason: '+esc(r.upd.reason)+'</i>':''):''}</td></tr>`).join('')||'<tr><td colspan="8" class="muted">No results yet.</td></tr>'}</tbody></table></div></div></div>`;
}
/* ===== Lot change modal ===== */
const CHG=['New control lot','New reagent lot','New calibrator lot','After recalibration','Corrected target values','Other'];
function renderModal(){
  const m=UI.modal;if(!m)return '';
  if(m.acct)return renderAcctModal();
  if(m.add)return renderAddModal();
  if(m.late)return `<div class="modalbg" data-act="mclose"><div class="modal" style="max-width:640px" role="dialog" aria-modal="true" aria-label="Reason for changing QC" data-stop>
   <h2>Why is this QC value changing?</h2><p class="muted" style="margin:4px 0 12px">QC entered more than 1 hour ago can only be changed with a comment. It is saved with your name and the time, and the old value is kept in the history.</p>
   <ul class="small" style="margin:0 0 12px;padding-left:18px">${m.late.map(x=>`<li><b>${esc(x.name)}</b> ${levelName(x.lv)}: ${x.old} to <b>${x.nw}</b> <span class="muted">(entered ${fmtTs(x.at)}${x.byName?' by '+esc(x.byName):''})</span></li>`).join('')}</ul>
   <label class="f">Reason for the change (required)<textarea id="late-note" rows="3" placeholder="e.g. Transcription error: 4.2 was keyed as 2.4. Result confirmed from the analyser printout."></textarea></label>
   <p id="late-err" class="small" style="color:var(--bad);margin:6px 0 0" hidden></p>
   <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-act="mclose">Cancel</button><button class="btn primary" data-act="lateok">Save with comment</button></div></div></div>`;
  const a=anOf(m.aid),t=curTarget(a),dp=decs(a);
  return `<div class="modalbg" data-act="mclose"><div class="modal" style="max-width:880px" role="dialog" aria-modal="true" aria-label="Lot change" data-stop>
   <h2>Lot change or target adjustment</h2><p class="muted" style="margin:4px 0 12px">${esc(a.name)} · ${esc(a.unit)}. Westgard rules restart from the effective date, so the old lot does not count against the new one.</p>
   <div class="stack"><div class="grid2"><label class="f">Reason<select id="m-type">${CHG.map(c=>`<option>${c}</option>`).join('')}</select></label>
    <label class="f">Effective from<input type="date" id="m-date" value="${todayStr()}" max="${todayStr()}"></label></div>
   <div class="scroll"><table class="t"><thead><tr><th>Level</th><th>QC material</th><th>Lot no.</th><th>Expiry date</th><th>Current mean</th><th>Current SD</th><th>New mean</th><th>New SD</th></tr></thead><tbody>
   ${t.levels.slice(0,a.nlev).map((l,i)=>`<tr><td>${levelName(i)}</td><td><input type="text" id="m-mat-${i}" value="${esc(l.material)}" style="width:170px" aria-label="${levelName(i)} QC material"></td><td><input type="text" id="m-lot-${i}" value="${esc(l.lot)}" style="width:100px" aria-label="${levelName(i)} lot"></td><td><input type="date" id="m-exp-${i}" value="${esc(l.exp||'')}" style="width:140px" aria-label="${levelName(i)} expiry date"></td><td class="mono">${fmt(l.mean,dp+1)}</td><td class="mono">${fmt(l.sd,dp+1)}</td><td><input type="number" step="any" id="m-mean-${i}" value="${l.mean==null?'':l.mean}" style="width:100px"></td><td><input type="number" step="any" min="0" id="m-sd-${i}" value="${l.sd==null?'':l.sd}" style="width:90px"></td></tr>`).join('')}</tbody></table></div>
   <label class="f">Comment explaining the change (required)<textarea id="m-note" rows="3" placeholder="e.g. New lot of Bio-Rad Level 1/2 opened. Means set from 20-point lot crossover."></textarea></label>
   <p id="m-err" class="small" style="color:var(--bad);margin:0" hidden></p>
   <div class="row" style="justify-content:flex-end"><button class="btn" data-act="mclose">Cancel</button><button class="btn primary" data-act="msave">Save new targets</button></div></div></div></div>`;
}
function saveLot(){
  const a=anOf(UI.modal.aid),note=document.getElementById('m-note').value.trim(),err=document.getElementById('m-err');
  const levels=[];
  const g=id=>document.getElementById(id);
  for(let i=0;i<a.nlev;i++){levels.push({mean:num(g('m-mean-'+i).value),sd:num(g('m-sd-'+i).value),material:g('m-mat-'+i).value.trim(),lot:g('m-lot-'+i).value.trim(),exp:g('m-exp-'+i).value})}
  const date=document.getElementById('m-date').value||todayStr();
  let msg='';
  if(!note)msg='Add a comment explaining why the mean and SD are changing.';
  else if(levels.some(l=>!l.material))msg='Every level needs a QC material name.';
  else if(levels.some(l=>!l.exp))msg='Every level needs an expiry date.';
  else if(levels.some(l=>l.mean==null||!(l.sd>0)))msg='Every level needs a mean and an SD above zero.';
  if(msg){err.textContent=msg;err.hidden=false;return true}
  const t={from:date,type:document.getElementById('m-type').value,comment:note,...stampNow(),levels};
  a.targets=a.targets.filter(x=>x.from!==date);a.targets.push(t);a.targets.sort((x,y)=>x.from<y.from?-1:1);
  audit('Targets changed',a.name+' from '+fmtDate(date)+': '+t.type+'. '+note,null,a.dept);
  UI.modal=null;save();toast('New targets saved from '+fmtDate(date)+'.');
}
