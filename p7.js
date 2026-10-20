/* ===== Establish limits: mean and SD from 20 to 40 runs ===== */
const EST_MIN=20,EST_MAX=40;
const estOf=id=>(S.est||(S.est=[])).find(s=>s.id===id);
function estStats(vals){
  const n=vals.length;if(!n)return {n:0,mean:0,sd:0,cv:0,min:0,max:0};
  const mean=vals.reduce((a,b)=>a+b,0)/n;
  const sd=n>1?Math.sqrt(vals.reduce((a,b)=>a+(b-mean)*(b-mean),0)/(n-1)):0;
  return {n,mean,sd,cv:mean?sd/Math.abs(mean)*100:0,min:Math.min(...vals),max:Math.max(...vals)};
}
function estLevel(s,lv){
  const rows=s.runs.map(r=>({r,v:r.v[lv],ex:!!(r.ex&&r.ex[lv])})).filter(x=>x.v!=null);
  const inc=rows.filter(x=>!x.ex).map(x=>x.v),st=estStats(inc);
  const out=(st.n>=8&&st.sd>0)?rows.filter(x=>!x.ex&&Math.abs(x.v-st.mean)>3*st.sd).map(x=>x.r.id):[];
  return {rows,inc,st,out,ready:st.n>=EST_MIN};
}
const estDec=sd=>Math.min(4,Math.max(0,2-Math.floor(Math.log10(sd>0?sd:1))));
const rnd=(v,d)=>{const f=Math.pow(10,d);return Math.round(v*f)/f};
function estChart(info,dp){
  const W=460,H=215,ml=48,mr=64,mt=12,mb=26,pw=W-ml-mr,ph=H-mt-mb,st=info.st,rows=info.rows;
  if(rows.length<2||!(st.sd>0))return '<div class="muted small" style="padding:24px 0;text-align:center">Add at least two values to see the chart.</div>';
  const zs=rows.map(x=>(x.v-st.mean)/st.sd),ymax=Math.max(3.5,Math.ceil((Math.max(...zs.map(Math.abs))+.3)*2)/2);
  const Y=z=>mt+(ymax-z)/(2*ymax)*ph,step=pw/rows.length,X=i=>ml+(i+.5)*step;
  let s=`<svg class="lj" viewBox="0 0 ${W} ${H}" role="img" aria-label="Values collected so far with the calculated limits">`;
  s+=`<rect x="${ml}" y="${Y(1)}" width="${pw}" height="${Y(-1)-Y(1)}" fill="var(--zone1)"/><rect x="${ml}" y="${Y(3)}" width="${pw}" height="${Y(2)-Y(3)}" fill="var(--zone2)"/><rect x="${ml}" y="${Y(-2)}" width="${pw}" height="${Y(-3)-Y(-2)}" fill="var(--zone2)"/>`;
  for(let k=-3;k<=3;k++){
    const cls=k===0?'mean':Math.abs(k)===3?'s3':Math.abs(k)===2?'s2':'s1',lc=k===0?'lm':Math.abs(k)===3?'l3':Math.abs(k)===2?'l2':'';
    s+=`<line class="${cls}" x1="${ml}" x2="${ml+pw}" y1="${Y(k)}" y2="${Y(k)}"/><text class="${lc}" x="${ml-6}" y="${Y(k)+4}" text-anchor="end">${k===0?'Mean':(k>0?'+':'−')+Math.abs(k)+' SD'}</text><text class="${lc}" x="${ml+pw+6}" y="${Y(k)+4}">${fmt(st.mean+k*st.sd,dp)}</text>`;
  }
  s+=`<polyline class="line" points="${rows.map((x,i)=>X(i)+','+Y(Math.max(-ymax,Math.min(ymax,zs[i])))).join(' ')}"/>`;
  rows.forEach((x,i)=>{const o=info.out.includes(x.r.id),c=x.ex?'pt ex':o?'pt r':'pt';
    s+=`<circle class="${c}" cx="${X(i)}" cy="${Y(Math.max(-ymax,Math.min(ymax,zs[i])))}" r="${o?6:4}"/>`});
  s+=`<text x="${X(0)}" y="${H-8}" text-anchor="middle">${shortDate(rows[0].r.date)}</text><text x="${X(rows.length-1)}" y="${H-8}" text-anchor="middle">${shortDate(rows[rows.length-1].r.date)}</text></svg>`;
  return s;
}
function estNew(a,mats,lots,exps){
  const t=curTarget(a);
  return {id:uid(),aid:a.id,created:nowIso(),...stampNow(),status:'collecting',
    levels:t.levels.slice(0,a.nlev).map((l,i)=>({material:(mats&&mats[i]!=null)?mats[i]:(l.material||''),lot:(lots&&lots[i]!=null)?lots[i]:(l.lot||''),exp:(exps&&exps[i]!=null)?exps[i]:''})),runs:[]};
}
function renderLimits(){
  if(!VA().length)return '<div class="panel empty">No analytes available.</div>';
  if(!VA().some(x=>x.id===UI.estAid))UI.estAid=VA()[0].id;
  const a=anOf(UI.estAid),g=groupBy(VA(),x=>x.panel);
  const mine=S.est.filter(s=>s.aid===a.id).slice().sort((x,y)=>x.created<y.created?1:-1);
  let cur=mine.find(s=>s.id===UI.estSid)||(UI.estSid===null?null:mine.find(s=>s.status==='collecting'))||null;
  UI.estSid=cur?cur.id:null;
  const intro=`<div class="panel stack"><div><h2>Establish mean and SD</h2><p class="muted" style="margin:4px 0 0;max-width:80ch">Run each control level ${EST_MIN} to ${EST_MAX} times and enter the values here. Spread the runs over several days so the SD includes real day-to-day variation. When every level has at least ${EST_MIN} values, QCLens calculates the mean and SD and can insert them straight into the analyte's QC limits.</p></div>
   <div class="row"><label class="f">Analyte<select id="est-aid" style="width:auto;min-width:220px">${Object.entries(g).map(([p,l])=>`<optgroup label="${esc(p)}">${l.map(x=>`<option value="${x.id}"${x.id===a.id?' selected':''}>${esc(x.name)} (${esc(x.unit)})${VA().filter(y=>y.name===x.name).length>1?' · '+esc(instLabel(x)):''}</option>`).join('')}</optgroup>`).join('')}</select></label>
    ${cur?`<button class="btn" data-act="estnew">Start a different data set</button>`:''}</div></div>`;
  if(!cur){
    const t=curTarget(a);
    return `<div class="stack">${intro}<div class="panel stack"><h3>Start collecting for ${esc(a.name)}</h3>
     <p class="muted small" style="margin:0">Enter the QC material and lot you are characterising. For a new lot, use the new lot number. You can change these later while collecting.</p>
     ${t.levels.slice(0,a.nlev).map((l,i)=>`<div class="row" style="align-items:flex-end"><span class="small" style="width:56px;padding-bottom:9px">${levelName(i)}</span><label class="f" style="flex:2 1 200px">QC material<input type="text" id="est-m-${i}" value="${esc(l.material)}"></label><label class="f" style="flex:1 1 120px">Lot no.<input type="text" id="est-l-${i}" value="${esc(l.lot)}"></label><label class="f" style="flex:0 0 140px">Expiry date<input type="date" id="est-x-${i}" value="${esc(l.exp||'')}"></label></div>`).join('')}
     <div><button class="btn primary" data-act="eststart">Start collecting</button></div></div>${estPast(mine,null)}</div>`;
  }
  const s=cur,open=s.status==='collecting',nl=s.levels.length,infos=s.levels.map((_,i)=>estLevel(s,i)),dp0=Math.max(...infos.map(x=>x.st.sd>0?estDec(x.st.sd):0));
  const dp=UI.estDp!=null?UI.estDp:dp0,ready=infos.every(x=>x.ready),days=new Set(s.runs.map(r=>r.date)).size;
  const dates=s.runs.map(r=>r.date).sort(),span=dates.length?(dates[0]===dates[dates.length-1]?fmtDate(dates[0]):fmtDate(dates[0])+' to '+fmtDate(dates[dates.length-1])):'';
  const hdr=`<div class="panel stack"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h3>${esc(a.name)} · ${open?'collecting':'applied'}</h3><div class="small muted">Started ${fmtTs(s.created)} by ${esc(s.byName||'–')} · ${s.runs.length} run${s.runs.length===1?'':'s'}${days?' on '+days+' day'+(days===1?'':'s'):''}</div></div>
     <div class="row" style="gap:6px">${open?'<button class="btn sm" data-act="estexp" data-id="'+s.id+'">Export to Excel</button>':'<button class="btn sm" data-act="estexp" data-id="'+s.id+'">Export to Excel</button>'}${UI.estDel===s.id?`<span class="small">Delete this data set?</span><button class="btn sm danger" data-act="estdel" data-id="${s.id}">Delete</button><button class="btn sm" data-act="estdelno">Keep</button>`:`<button class="btn sm" data-act="estdelask" data-id="${s.id}">Delete data set</button>`}</div></div>
    ${s.levels.map((l,i)=>`<div class="row" style="align-items:flex-end"><span class="small" style="width:56px;padding-bottom:9px">${levelName(i)}</span><label class="f" style="flex:2 1 200px">QC material<input type="text" data-emat="${s.id}:${i}" value="${esc(l.material)}"${open?'':' disabled'}></label><label class="f" style="flex:1 1 120px">Lot no.<input type="text" data-elot="${s.id}:${i}" value="${esc(l.lot)}"${open?'':' disabled'}></label><label class="f" style="flex:0 0 140px">Expiry date<input type="date" data-eexp="${s.id}:${i}" value="${esc(l.exp||'')}"${open?'':' disabled'}></label>
      <div style="flex:1 1 180px;padding-bottom:6px"><div class="small muted">${infos[i].st.n} of ${EST_MIN} minimum${infos[i].ready?' · <b style="color:var(--good)">ready</b>':''}</div><div style="height:6px;border-radius:3px;background:var(--grid);overflow:hidden"><div style="height:100%;width:${Math.min(100,infos[i].st.n/EST_MIN*100)}%;background:${infos[i].ready?'var(--good)':'var(--accent)'}"></div></div></div></div>`).join('')}
    ${days&&days<5?`<p class="small" style="margin:0;color:var(--warn)">The runs so far come from ${days} day${days===1?'':'s'}. Collecting over more days (most guidance suggests 5 to 10 or more) gives an SD that reflects normal day-to-day variation.</p>`:''}</div>`;
  const add=open?`<div class="panel stack"><h3>Add a run</h3><div class="row" style="align-items:flex-end"><label class="f">Date<input type="date" id="est-date-new" value="${UI.estNewDate||todayStr()}" max="${todayStr()}" style="width:auto"></label>
     ${s.levels.map((_,i)=>`<label class="f" style="flex:0 0 110px">${levelName(i)}<input type="number" step="any" inputmode="decimal" id="est-in-${i}" data-ein></label>`).join('')}
     <button class="btn primary" data-act="estadd"${s.runs.length>=EST_MAX?' disabled':''}>Add run</button></div>
     <p class="small muted" style="margin:0">${s.runs.length>=EST_MAX?'This data set has the maximum of '+EST_MAX+' runs.':'You can leave a level blank if it was not run. Up to '+EST_MAX+' runs per data set.'}</p>
     <div class="row" style="align-items:flex-end;border-top:1px solid var(--line);padding-top:10px"><label class="f">Or import QC results already entered, from<input type="date" id="est-impfrom" value="${UI.estImp||dstr(new Date(Date.now()-30*864e5))}" style="width:auto"></label><button class="btn" data-act="estimp"${s.runs.length>=EST_MAX?' disabled':''}>Import from my QC results</button></div></div>`:'';
  const tbl=`<div class="panel"><h3 style="margin-bottom:8px">Runs</h3>${s.runs.length?`<div class="scroll"><table class="t"><thead><tr><th>#</th><th>Date</th>${s.levels.map((l,i)=>`<th>${levelName(i)}</th>`).join('')}<th>Added by</th><th></th></tr></thead><tbody>
   ${s.runs.slice().sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:0).map((r,n)=>`<tr><td class="muted">${n+1}</td><td style="white-space:nowrap">${fmtDate(r.date)}${r.src==='qc'?' <span class="chip">from QC</span>':''}</td>
     ${s.levels.map((_,i)=>{const sug=infos[i].out.includes(r.id),ex=r.ex&&r.ex[i];return `<td style="${sug?'background:var(--bad-soft)':''}"><div class="row" style="gap:6px;flex-wrap:nowrap;align-items:center"><input type="number" step="any" class="estin" data-ev="${s.id}:${r.id}:${i}" value="${r.v[i]==null?'':r.v[i]}" style="width:92px${ex?';opacity:.5;text-decoration:line-through':''}"${open?'':' disabled'} aria-label="${levelName(i)} value">
       <label class="small" style="white-space:nowrap;display:flex;gap:3px;align-items:center" title="Leave this value out of the calculation"><input type="checkbox" data-eex="${s.id}:${r.id}:${i}"${ex?' checked':''}${open?'':' disabled'}>excl.</label></div>${sug?'<div class="small" style="color:var(--bad)">beyond 3 SD</div>':''}</td>`}).join('')}
     <td class="small">${esc(r.byName||'–')}<div class="muted">${fmtTs(r.at)}</div></td><td>${open?`<button class="btn sm" data-act="estrm" data-sid="${s.id}" data-id="${r.id}" aria-label="Remove run">Remove</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No runs yet. Add the first run above.</div>'}</div>`;
  const stats=`<div class="panel stack"><h3>Calculated values</h3><div class="scroll"><table class="t"><thead><tr><th>Level</th><th>Values used</th><th>Mean</th><th>SD</th><th>CV %</th><th>Min</th><th>Max</th><th></th></tr></thead><tbody>
   ${infos.map((x,i)=>`<tr><td><b>${levelName(i)}</b><div class="small muted">${esc(s.levels[i].material||'')}${s.levels[i].lot?' · '+esc(s.levels[i].lot):''}</div></td><td class="mono">${x.st.n}${x.rows.length!==x.st.n?' of '+x.rows.length:''}</td>
     <td class="mono">${x.st.n?fmt(x.st.mean,dp+1):'–'}</td><td class="mono">${x.st.n>1?fmt(x.st.sd,dp+1):'–'}</td><td class="mono">${x.st.n>1?x.st.cv.toFixed(2):'–'}</td><td class="mono">${x.st.n?fmt(x.st.min,dp+1):'–'}</td><td class="mono">${x.st.n?fmt(x.st.max,dp+1):'–'}</td>
     <td>${x.out.length&&open?`<button class="btn sm" data-act="estexo" data-sid="${s.id}" data-lv="${i}">Exclude ${x.out.length} value${x.out.length>1?'s':''} beyond 3 SD</button>`:x.ready?'<span class="chip good">Ready</span>':`<span class="chip">${EST_MIN-x.st.n} more needed</span>`}</td></tr>`).join('')}</tbody></table></div>
   <p class="small muted" style="margin:0">SD is the sample SD (n − 1). Values beyond 3 SD of the group are suggested for exclusion: check them for a cause such as a bubble or a mislabelled tube, exclude them, and the values recalculate.</p>
   <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">${infos.map((x,i)=>`<div><div class="small" style="font-weight:600;margin-bottom:4px">${levelName(i)}</div><div class="chartbox">${estChart(x,dp+1)}</div></div>`).join('')}</div></div>`;
  let apply='';
  if(open){
    const dflt=ready?`Established from ${Math.max(...infos.map(x=>x.st.n))} runs (${span}) of ${s.levels.map(l=>l.material).filter((v,i,ar)=>v&&ar.indexOf(v)===i).join(', ')||'the QC material'}.`:'';
    apply=`<div class="panel stack"><h3>Insert into ${esc(a.name)}</h3>${ready?`<p class="small muted" style="margin:0">These become the QC limits used on the charts from the effective date. Earlier results keep the limits they were judged against, and the Westgard rules restart from the new date.</p>
     <div class="scroll"><table class="t"><thead><tr><th>Level</th><th>Current mean</th><th>Current SD</th><th>New mean</th><th>New SD</th><th>Change in mean</th></tr></thead><tbody>${infos.map((x,i)=>{const cl=curTarget(a).levels[i]||{},nm=rnd(x.st.mean,dp),ch=cl.mean?((nm-cl.mean)/cl.mean*100):null;
       return `<tr><td>${levelName(i)}</td><td class="mono">${cl.mean==null?'–':fmt(cl.mean,dp+1)}</td><td class="mono">${cl.sd==null?'–':fmt(cl.sd,dp+1)}</td><td class="mono"><b>${nm.toFixed(dp)}</b></td><td class="mono"><b>${rnd(x.st.sd,dp).toFixed(dp)}</b></td><td class="mono">${ch==null?'–':(ch>=0?'+':'')+ch.toFixed(1)+'%'}</td></tr>`}).join('')}</tbody></table></div>
     <div class="grid2"><label class="f">Decimal places<select id="est-dp" data-estdp>${[0,1,2,3,4].map(d=>`<option${d===dp?' selected':''}>${d}</option>`).join('')}</select></label><label class="f">Effective from<input type="date" id="est-date" value="${UI.estDate||todayStr()}" max="${todayStr()}"></label></div>
     <label class="f">Comment (required)<textarea id="est-note" rows="2">${esc(UI.estNote!=null?UI.estNote:dflt)}</textarea></label>
     <p id="est-err" class="small" style="color:var(--bad);margin:0" hidden></p>
     <div><button class="btn primary" data-act="estapply">Insert into ${esc(a.name)} QC limits</button></div>`
     :`<p class="muted" style="margin:0">${infos.map((x,i)=>x.ready?'':`${levelName(i)} needs ${EST_MIN-x.st.n} more value${EST_MIN-x.st.n===1?'':'s'}`).filter(Boolean).join(' · ')}. The insert option appears when every level has at least ${EST_MIN} values.</p>`}</div>`;
  }else if(s.applied){
    apply=`<div class="panel"><h3>Applied</h3><p class="small" style="margin:4px 0 0">Inserted into the QC limits by ${esc(s.applied.byName||'–')} on ${fmtTs(s.applied.at)}, effective ${fmtDate(s.applied.from)}.</p>
     <div class="scroll"><table class="t" style="margin-top:8px"><thead><tr><th>Level</th><th>Mean</th><th>SD</th></tr></thead><tbody>${s.applied.mean.map((m,i)=>`<tr><td>${levelName(i)}</td><td class="mono">${m}</td><td class="mono">${s.applied.sd[i]}</td></tr>`).join('')}</tbody></table></div>
     <div class="row" style="margin-top:10px"><button class="btn" data-act="tab" data-t="charts" data-aid="${a.id}">View charts</button></div></div>`;
  }
  return `<div class="stack">${intro}${hdr}${add}${tbl}${stats}${apply}${estPast(mine,s)}</div>`;
}
function estPast(list,cur){
  const rest=list.filter(s=>!cur||s.id!==cur.id);if(!rest.length)return '';
  return `<div class="panel"><h3 style="margin-bottom:8px">Other data sets for this analyte</h3><div class="scroll"><table class="t"><thead><tr><th>Started</th><th>Runs</th><th>Status</th><th>By</th><th></th></tr></thead><tbody>${rest.map(s=>`<tr><td>${fmtTs(s.created)}</td><td class="mono">${s.runs.length}</td><td>${s.status==='applied'?'<span class="chip good">Applied '+fmtDate(s.applied.from)+'</span>':'<span class="chip">Collecting</span>'}</td><td class="small">${esc(s.byName||'–')}</td><td><button class="btn sm" data-act="estopen" data-id="${s.id}">Open</button></td></tr>`).join('')}</tbody></table></div></div>`;
}
/* ----- actions ----- */
function estAct(act,el){
  const id=el.dataset.id,s=el.dataset.sid?estOf(el.dataset.sid):estOf(id);
  const done=()=>{save();render();return true};
  switch(act){
   case 'eststart':{const a=anOf(UI.estAid),t=curTarget(a);
     const mats=t.levels.slice(0,a.nlev).map((_,i)=>gv('est-m-'+i).trim()),lots=t.levels.slice(0,a.nlev).map((_,i)=>gv('est-l-'+i).trim()),exps=t.levels.slice(0,a.nlev).map((_,i)=>gv('est-x-'+i));
     const n=estNew(a,mats,lots,exps);S.est.push(n);UI.estSid=n.id;UI.estNote=null;UI.estDp=null;audit('Limits data set started',a.name+' ('+n.levels.map(l=>l.material+(l.lot?' lot '+l.lot:'')).join('; ')+')');return done()}
   case 'estnew':UI.estSid=null;UI.estNote=null;return done();
   case 'estopen':UI.estSid=id;UI.estNote=null;UI.estDp=null;return done();
   case 'estadd':{const sx=estOf(UI.estSid);if(!sx||sx.status!=='collecting')return true;
     if(sx.runs.length>=EST_MAX){toast('A data set holds up to '+EST_MAX+' runs.');return true}
     const v=sx.levels.map((_,i)=>num(gv('est-in-'+i))),date=gv('est-date-new')||todayStr();
     if(v.every(x=>x==null)){toast('Enter at least one value.');return true}
     const r={id:uid(),date,v,ex:v.map(()=>false),...stampNow()};sx.runs.push(r);UI.estNewDate=date;
     audit('Limits data added',(anOf(sx.aid)||{}).name+' '+fmtDate(date)+': '+v.map((x,i)=>x==null?null:levelName(i)+'='+x).filter(Boolean).join(', '));
     save();render();const f=document.getElementById('est-in-0');if(f)f.focus();return true}
   case 'estimp':{const sx=estOf(UI.estSid);if(!sx)return true;const from=gv('est-impfrom')||todayStr();UI.estImp=from;
     const byDate={};S.results.filter(r=>r.aid===sx.aid&&r.date>=from&&r.lv<sx.levels.length).forEach(r=>{(byDate[r.date]||(byDate[r.date]=Array(sx.levels.length).fill(null)))[r.lv]=r.value});
     const have=new Set(sx.runs.filter(r=>r.src==='qc').map(r=>r.date));let added=0;
     Object.keys(byDate).sort().forEach(d=>{if(have.has(d)||sx.runs.length>=EST_MAX)return;sx.runs.push({id:uid(),date:d,v:byDate[d],ex:byDate[d].map(()=>false),src:'qc',...stampNow()});added++});
     if(!added){toast('No new QC results found from that date.');return true}
     audit('Limits data imported',(anOf(sx.aid)||{}).name+': '+added+' run'+(added>1?'s':'')+' from QC results since '+fmtDate(from));toast(added+' run'+(added>1?'s':'')+' imported.');return done()}
   case 'estrm':{const sx=estOf(el.dataset.sid);if(!sx)return true;const r=sx.runs.find(x=>x.id===id);sx.runs=sx.runs.filter(x=>x.id!==id);
     if(r)audit('Limits run removed',(anOf(sx.aid)||{}).name+' '+fmtDate(r.date));return done()}
   case 'estexo':{const sx=estOf(el.dataset.sid),lv=+el.dataset.lv,info=estLevel(sx,lv);
     if(info.st.n-info.out.length<EST_MIN){toast('Excluding these would leave fewer than '+EST_MIN+' values. Add more runs first, then exclude them.');return true}
     sx.runs.forEach(r=>{if(info.out.includes(r.id)){r.ex=r.ex||[];r.ex[lv]=true}});
     audit('Limits values excluded',(anOf(sx.aid)||{}).name+' '+levelName(lv)+': '+info.out.length+' value'+(info.out.length>1?'s':'')+' beyond 3 SD');return done()}
   case 'estdelask':UI.estDel=id;return done();
   case 'estdelno':UI.estDel=null;return done();
   case 'estdel':{const sx=estOf(id);if(sx)audit('Limits data set deleted',(anOf(sx.aid)||{}).name+' with '+sx.runs.length+' runs'+(sx.status==='applied'?' (had been applied)':''));S.est=S.est.filter(x=>x.id!==id);UI.estDel=null;UI.estSid=null;return done()}
   case 'estexp':estExport(estOf(id));return true;
   case 'estapply':{const sx=estOf(UI.estSid);if(!sx||sx.status!=='collecting')return true;
     const a=anOf(sx.aid),infos=sx.levels.map((_,i)=>estLevel(sx,i)),err=document.getElementById('est-err'),fail=t=>{err.textContent=t;err.hidden=false;return true};
     if(!infos.every(x=>x.ready))return fail('Every level needs at least '+EST_MIN+' values.');
     const dp=+gv('est-dp'),date=gv('est-date')||todayStr(),note=gv('est-note').trim();
     if(!note)return fail('Add a comment explaining where these values come from.');
     if(sx.levels.some(l=>!(l.material||'').trim()))return fail('Every level needs a QC material name.');
     if(sx.levels.some(l=>!l.exp))return fail('Every level needs an expiry date. Enter it in the QC material section above.');
     const levels=infos.map((x,i)=>({mean:rnd(x.st.mean,dp),sd:rnd(x.st.sd,dp),material:sx.levels[i].material.trim(),lot:(sx.levels[i].lot||'').trim(),exp:sx.levels[i].exp}));
     if(levels.some(l=>!(l.sd>0)))return fail('An SD rounds to zero. Increase the decimal places.');
     const t={from:date,type:'Established from in-house data',comment:note,at:nowIso(),by:CU?CU.id:null,byName:CU?CU.name:'',est:sx.id,levels};
     a.targets=a.targets.filter(x=>x.from!==date);a.targets.push(t);a.targets.sort((x,y)=>x.from<y.from?-1:1);
     sx.status='applied';sx.applied={at:t.at,by:t.by,byName:t.byName,from:date,mean:levels.map(l=>l.mean),sd:levels.map(l=>l.sd)};
     audit('Limits applied',a.name+' from '+fmtDate(date)+': '+levels.map((l,i)=>levelName(i)+' mean '+l.mean+' SD '+l.sd).join('; '));
     UI.estNote=null;UI.estDate=null;toast('New mean and SD inserted into '+a.name+'.');return done()}
  }
  return false;
}
function estChange(e){
  const t=e.target,d=t.dataset;
  if(t.id==='est-aid'){UI.estAid=t.value;UI.estSid=undefined;UI.estNote=null;UI.estDp=null;UI.estDel=null;render();return true}
  if(d.estdp!==undefined){UI.estDp=+t.value;render();return true}
  if(t.id==='est-note'){UI.estNote=t.value;return true}
  if(t.id==='est-date'){UI.estDate=t.value;return true}
  if(t.id==='est-date-new'){UI.estNewDate=t.value;return true}
  if(t.id==='est-impfrom'){UI.estImp=t.value;return true}
  if(d.emat||d.elot||d.eexp){const [sid,lv]=(d.emat||d.elot||d.eexp).split(':'),sx=estOf(sid);if(sx){sx.levels[+lv][d.emat?'material':d.elot?'lot':'exp']=t.value.trim();save()}return true}
  if(d.ev){const [sid,rid,lv]=d.ev.split(':'),sx=estOf(sid),r=sx&&sx.runs.find(x=>x.id===rid);if(r){const old=r.v[+lv],nv=num(t.value);r.v[+lv]=nv;r.upd=stampNow();
    audit('Limits value edited',(anOf(sx.aid)||{}).name+' '+fmtDate(r.date)+' '+levelName(+lv)+': '+old+' to '+nv);save();render()}return true}
  if(d.eex){const [sid,rid,lv]=d.eex.split(':'),sx=estOf(sid),r=sx&&sx.runs.find(x=>x.id===rid);if(r){r.ex=r.ex||[];r.ex[+lv]=t.checked;
    audit(t.checked?'Limits value excluded':'Limits value included',(anOf(sx.aid)||{}).name+' '+fmtDate(r.date)+' '+levelName(+lv));save();render()}return true}
  return false;
}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('[data-ein]')){e.preventDefault();const b=document.querySelector('[data-act="estadd"]');if(b&&!b.disabled)b.click()}});
async function estExport(s){
  const dl=await getDl();if(!dl){toast('Saving files is not available in this view.');return}
  if(!window.ExcelJS){toast('The Excel library did not load. Check your connection and try again.');return}
  try{
    const a=anOf(s.aid),wb=new ExcelJS.Workbook(),sum=wb.addWorksheet('Summary'),ws=wb.addWorksheet('Runs');
    const hdr=r=>{r.font={bold:true,color:{argb:'FFFFFFFF'}};r.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0B6E78'}}};
    sum.addRow(['Establish mean and SD']).font={bold:true,size:14};
    [['Analyte',a.name+' ('+a.unit+')'],['Status',s.status==='applied'?'Applied '+s.applied.from:'Collecting'],['Started',fmtTs(s.created)+' by '+(s.byName||'')],['Exported',new Date().toLocaleString()]].forEach(r=>sum.addRow(r));sum.addRow([]);
    hdr(sum.addRow(['Level','QC material','Lot','Values used','Mean','SD','CV %','Min','Max']));
    s.levels.forEach((l,i)=>{const x=estLevel(s,i);sum.addRow([levelName(i),l.material,l.lot,x.st.n,x.st.n?+x.st.mean.toFixed(5):'',x.st.n>1?+x.st.sd.toFixed(5):'',x.st.n>1?+x.st.cv.toFixed(3):'',x.st.n?x.st.min:'',x.st.n?x.st.max:''])});
    sum.columns.forEach(c=>c.width=16);sum.getColumn(1).width=22;sum.getColumn(2).width=30;
    hdr(ws.addRow(['#','Date',...s.levels.map((_,i)=>levelName(i)),...s.levels.map((_,i)=>levelName(i)+' excluded'),'Added by','Added at']));
    s.runs.slice().sort((x,y)=>x.date<y.date?-1:1).forEach((r,n)=>ws.addRow([n+1,r.date,...s.levels.map((_,i)=>r.v[i]==null?'':r.v[i]),...s.levels.map((_,i)=>r.ex&&r.ex[i]?'yes':''),r.byName||'',fmtTs(r.at)]));
    ws.columns.forEach(c=>c.width=14);
    await dl.save({filename:'QCLens-limits-'+a.name.replace(/[^\w-]+/g,'_')+'-'+todayStr()+'.xlsx',data:await wb.xlsx.writeBuffer()});toast('Excel file ready.');
  }catch(e){toast(e&&e.code==='declined'?'Save cancelled.':'Export failed.')}
}
