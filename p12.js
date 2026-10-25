/* ===== Sigma metrics and measurement uncertainty ===== */
const SG_MINN=20;
const SGCLS=[
 {min:6,key:'wc',name:'World class',col:'#0b7a6f',adv:'Very robust. A simple 1-3s rule with 2 controls per run is enough, with the fewest false rejections.'},
 {min:5,key:'ex',name:'Excellent',col:'#3f9d52',adv:'Robust. 1-3s, 2-2s and R-4s with 2 controls per run (N=2) is suitable.'},
 {min:4,key:'gd',name:'Good',col:'#8aa81f',adv:'Acceptable. Use 1-3s, 2-2s, R-4s and 4-1s with 4 controls per run (N=4), or 2 controls twice a day.'},
 {min:3,key:'mg',name:'Marginal',col:'#d9962a',adv:'Marginal. Use the full multirule with as many controls as practical (N=4 to 6), watch closely and work on reducing bias and imprecision.'},
 {min:-1e9,key:'po',name:'Poor',col:'#c0392b',adv:'Not acceptable. QC cannot make up for this. Investigate and reduce bias and imprecision, or review the allowable error goal, before relying on this method.'}];
const sgClass=s=>s==null||!isFinite(s)?null:SGCLS.find(c=>s>=c.min);
const sgSet=a=>Object.assign({tea:'',mode:'pct',bias:'',bsrc:'entered',ub:'',k:2},a.sigma||{});
const sgState=()=>UI.sg||(UI.sg={dept:'',panel:'',sort:'high',win:'era',excl:false,open:{},draft:{}});
const SGWIN={era:'Since the current target started',90:'Last 90 days',180:'Last 180 days',365:'Last 365 days'};
const sgf=(v,d)=>v==null||!isFinite(v)?'–':(+v).toFixed(d==null?2:d);

function sgCalc(a,win,excl){
  const set=sgSet(a),tea=num(set.tea),ub=num(set.ub)||0,k=num(set.k)||2,bias0=num(set.bias),today=todayStr();
  const cut=!win||win==='era'?'':dstr(new Date(Date.now()-(+win)*864e5)),T=curTarget(a),levels=[];
  for(let lv=0;lv<a.nlev;lv++){
    const t=T.levels[lv];if(!t)continue;
    const era=lvEra(a,lv,today);
    let rs=S.results.filter(r=>r.aid===a.id&&r.lv===lv&&r.value!=null&&isFinite(r.value)&&lvEra(a,lv,r.date)===era&&(!cut||r.date>=cut));
    if(excl&&t.sd>0)rs=rs.filter(r=>Math.abs((r.value-t.mean)/t.sd)<=3);
    const n=rs.length;let mo=null,so=null;
    if(n){mo=rs.reduce((s,r)=>s+r.value,0)/n;so=n>1?Math.sqrt(rs.reduce((s,r)=>s+(r.value-mo)*(r.value-mo),0)/(n-1)):null}
    const cvT=t.mean?Math.abs(t.sd/t.mean)*100:null,cvO=mo&&so!=null?Math.abs(so/mo)*100:null;
    const useObs=n>=SG_MINN&&cvO!=null,cv=useObs?cvO:cvT;
    let bias=null,biasNote='';
    if(set.bsrc==='qc'){if(n>=SG_MINN&&t.mean)bias=(mo-t.mean)/t.mean*100;else biasNote='needs '+SG_MINN+' QC values'}
    else bias=bias0;
    const bu=bias==null?0:bias;
    const teaPct=tea==null?null:set.mode==='abs'?(t.mean?tea/Math.abs(t.mean)*100:null):tea;
    const sigma=teaPct!=null&&cv>0?(teaPct-Math.abs(bu))/cv:null;
    const te=cv==null?null:Math.abs(bu)+2*cv,used=teaPct>0&&te!=null?te/teaPct*100:null;
    const Upct=cv==null?null:k*Math.sqrt(cv*cv+ub*ub),Uabs=t.mean&&Upct!=null?Upct/100*Math.abs(t.mean):null;
    levels.push({lv,t,n,mo,so,cvO,cvT,cv,cvSrc:useObs?'observed':'target',bias,bu,biasNote,teaPct,sigma,cls:sgClass(sigma),te,used,Upct,Uabs,k,ub});
  }
  const sg=levels.map(l=>l.sigma).filter(x=>x!=null),worst=sg.length?Math.min(...sg):null;
  return {a,set,levels,worst,cls:sgClass(worst),tea,k,ub,win:win||'era',excl:!!excl};
}
function sgAll(){
  const s=sgState();
  let list=VA();
  if(s.dept)list=list.filter(a=>a.dept===s.dept);
  if(s.panel)list=list.filter(a=>a.panel===s.panel);
  const rows=list.map(a=>sgCalc(a,s.win,s.excl));
  const name=(x,y)=>x.a.name.localeCompare(y.a.name);
  rows.sort(s.sort==='name'?name:(x,y)=>{
    const ax=x.worst,ay=y.worst;if(ax==null&&ay==null)return name(x,y);if(ax==null)return 1;if(ay==null)return -1;
    return (s.sort==='high'?ay-ax:ax-ay)||name(x,y)});
  return rows;
}
function sgBar(levels,w){
  const W=300,sc=v=>Math.max(0,Math.min(8,v))/8*W,seg=[[0,3,'#e9b9b2'],[3,4,'#f1d9a8'],[4,5,'#dbe59a'],[5,6,'#b5dcb9'],[6,8,'#8fcdc4']];
  return `<svg viewBox="0 0 ${W} 26" width="${w||220}" height="${Math.round((w||220)*26/W)}" role="img" aria-label="Sigma scale from 0 to 8" style="display:block;max-width:100%">${seg.map(([a,b,c])=>`<rect x="${sc(a)}" y="9" width="${sc(b)-sc(a)}" height="8" fill="${c}"/>`).join('')}
   ${[3,4,5,6].map(v=>`<line x1="${sc(v)}" x2="${sc(v)}" y1="7" y2="19" stroke="#8a9aa0" stroke-width="1"/><text x="${sc(v)}" y="26" font-size="7" text-anchor="middle" fill="#6b7d84">${v}</text>`).join('')}
   ${levels.filter(l=>l.sigma!=null).map(l=>`<polygon points="${sc(l.sigma)-4},0 ${sc(l.sigma)+4},0 ${sc(l.sigma)},8" fill="#0d3b6e"><title>${esc(levelName(l.lv))}: sigma ${sgf(l.sigma,1)}</title></polygon>`).join('')}</svg>`;
}
const sgChip=(c,txt)=>c?`<span class="chip" style="border-color:${c.col};color:${c.col};font-weight:600">${esc(txt||c.name)}</span>`:'<span class="chip">Not set</span>';

function renderSigma(){
  const s=sgState(),ed=perm('e_sigma'),ex=perm('e_export'),rows=sgAll(),ds=visDepts(),panels=[...new Set(VA().filter(a=>!s.dept||a.dept===s.dept).map(a=>a.panel))].sort();
  const cnt={};SGCLS.forEach(c=>cnt[c.key]=0);let miss=0;rows.forEach(r=>{if(r.cls)cnt[r.cls.key]++;else miss++});
  const tiles=`<div class="row" style="gap:8px">${SGCLS.map(c=>`<div class="panelcard" style="flex:1 1 110px;padding:10px 12px;border-left:4px solid ${c.col}"><div class="small muted">${c.min>-1e8?'Sigma ≥ '+c.min:'Sigma < 3'}</div><div style="font-size:22px;font-weight:700">${cnt[c.key]}</div><div class="small">${c.name}</div></div>`).join('')}<div class="panelcard" style="flex:1 1 110px;padding:10px 12px;border-left:4px solid #8a9aa0"><div class="small muted">No allowable error set</div><div style="font-size:22px;font-weight:700">${miss}</div><div class="small">Not scored</div></div></div>`;
  const head=`<div class="panel stack"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h2>Sigma metrics and measurement uncertainty</h2>
   <p class="small muted" style="margin:4px 0 0;max-width:90ch">The sigma score says how much room a test has for error. It compares the total allowable error (TEa) with how much error the test actually has, from its bias and its imprecision (CV).</p></div>
   ${ex&&rows.length?`<div class="row" style="gap:6px"><button class="btn sm" data-act="sgpdfall">Summary and reports (PDF)</button><button class="btn sm" data-act="sgxlall">Summary and reports (Excel)</button></div>`:''}</div>
   <div class="panelcard" style="background:var(--surface2)"><b>Sigma = (TEa % &minus; |Bias %|) &divide; CV %</b><div class="small muted" style="margin-top:4px">Higher is better. A sigma of 6 or more is world class, 5 to 6 excellent, 4 to 5 good, 3 to 4 marginal, and below 3 not acceptable. Measurement uncertainty is U = k &times; &radic;(CV&sup2; + u<sub>bias</sub>&sup2;), with k = 2 for about 95% confidence.</div></div>
   <div class="row" style="align-items:flex-end;gap:10px">
    ${ds.length>1?`<label class="f" style="flex:0 1 200px">Department<select data-sgsel="dept"><option value="">All departments</option>${ds.map(d=>`<option value="${d.id}"${s.dept===d.id?' selected':''}>${esc(d.dept+dsub(d.sub))}</option>`).join('')}</select></label>`:''}
    <label class="f" style="flex:0 1 200px">Panel<select data-sgsel="panel"><option value="">All panels</option>${panels.map(p=>`<option${s.panel===p?' selected':''}>${esc(p)}</option>`).join('')}</select></label>
    <label class="f" style="flex:0 1 230px">QC values used for CV<select data-sgsel="win">${Object.entries(SGWIN).map(([k,v])=>`<option value="${k}"${String(s.win)===k?' selected':''}>${v}</option>`).join('')}</select></label>
    <label class="f" style="flex:0 1 230px">Order<select data-sgsel="sort"><option value="low"${s.sort==='low'?' selected':''}>Least room for error first</option><option value="high"${s.sort==='high'?' selected':''}>Most room for error first</option><option value="name"${s.sort==='name'?' selected':''}>Name</option></select></label>
    <label class="small" style="display:flex;gap:6px;align-items:center;font-weight:400;padding-bottom:9px"><input type="checkbox" data-sgsel="excl"${s.excl?' checked':''}>Leave out values beyond 3 SD</label></div>
   ${tiles}</div>`;
  const card=r=>{
    const a=r.a,open=!!s.open[a.id],dr=s.draft[a.id]||{},v=k=>dr[k]!==undefined?dr[k]:r.set[k],lowest=r.levels.filter(l=>l.sigma!=null);
    const room=r.levels.map(l=>l.used).filter(x=>x!=null),usedMax=room.length?Math.max(...room):null;
    const sum=`<div class="row" style="justify-content:space-between;align-items:center;gap:10px;cursor:pointer" data-act="sgtoggle" data-id="${a.id}" role="button" tabindex="0" aria-expanded="${open}">
      <div style="flex:1 1 200px"><b>${esc(a.name)}</b> <span class="small muted">${esc(a.panel||'')}${visDepts().length>1?' · '+esc(deptOfA(a).dept||''):''}</span>${instTag(a)}</div>
      <div style="flex:0 1 230px">${lowest.length?sgBar(r.levels,220):'<span class="small muted">Enter the allowable error to score this test</span>'}</div>
      <div style="flex:0 0 150px;text-align:right">${r.worst!=null?`<span style="font-size:20px;font-weight:700">${sgf(r.worst,1)}</span> `:''}${sgChip(r.cls)}</div>
      <div style="flex:0 0 120px" class="small muted">${usedMax!=null?'Uses '+sgf(usedMax,0)+'% of TEa':''}</div><span class="muted" aria-hidden="true">${open?'▾':'▸'}</span></div>`;
    const set=ed?`<div class="row" style="align-items:flex-end;gap:10px;margin-top:10px">
      <label class="f" style="flex:0 1 120px">Allowable error (TEa)<input type="text" inputmode="decimal" data-sgf="${a.id}:tea" value="${esc(v('tea'))}" placeholder="e.g. 6"></label>
      <label class="f" style="flex:0 1 150px">TEa is given as<select data-sgf="${a.id}:mode"><option value="pct"${v('mode')==='pct'?' selected':''}>% of the result</option><option value="abs"${v('mode')==='abs'?' selected':''}>Units (${esc(a.unit||'result units')})</option></select></label>
      <label class="f" style="flex:0 1 230px">Bias comes from<select data-sgf="${a.id}:bsrc"><option value="entered"${v('bsrc')==='entered'?' selected':''}>A value I enter (EQA or peer)</option><option value="qc"${v('bsrc')==='qc'?' selected':''}>My QC data (observed vs target mean)</option></select></label>
      <label class="f" style="flex:0 1 110px">Bias %<input type="text" inputmode="decimal" data-sgf="${a.id}:bias" value="${esc(v('bias'))}" placeholder="0"${v('bsrc')==='qc'?' disabled':''}></label>
      <label class="f" style="flex:0 1 130px">Uncertainty of bias % <input type="text" inputmode="decimal" data-sgf="${a.id}:ub" value="${esc(v('ub'))}" placeholder="0"></label>
      <label class="f" style="flex:0 1 80px">k<input type="text" inputmode="decimal" data-sgf="${a.id}:k" value="${esc(v('k'))}"></label>
      <button class="btn primary" data-act="sgsave" data-id="${a.id}">Save</button></div>`:`<p class="small muted" style="margin:8px 0 0">TEa ${esc(r.set.tea||'not set')}${r.set.tea?(r.set.mode==='abs'?' '+esc(a.unit||'units'):' %'):''} · Bias ${r.set.bsrc==='qc'?'from QC data':esc(r.set.bias===''?'not entered':r.set.bias+' %')}. Ask someone with edit access to change these.</p>`;
    const tbl=`<div class="scroll" style="margin-top:10px"><table class="t"><thead><tr><th>Level</th><th>Material · lot</th><th>QC values</th><th>CV %</th><th>Bias %</th><th>TEa %</th><th>Sigma</th><th>Room for error</th><th>Error used</th><th>U % (k=${sgf(r.k,0)})</th><th>U (${esc(a.unit||'units')})</th></tr></thead><tbody>
      ${r.levels.map(l=>`<tr><td>${levelName(l.lv)}</td><td class="small">${esc(l.t.material||'–')}${l.t.lot?' · '+esc(l.t.lot):''}</td><td>${l.n}</td><td>${sgf(l.cv)} <span class="small muted">${l.cvSrc}</span></td><td>${l.bias==null?'<span class="small muted">'+esc(l.biasNote||'not entered')+'</span>':sgf(l.bias)}</td><td>${sgf(l.teaPct)}</td><td><b>${sgf(l.sigma,1)}</b></td><td>${sgChip(l.cls)}</td><td>${l.used==null?'–':sgf(l.used,0)+'%'}</td><td>${sgf(l.Upct)}</td><td>${sgf(l.Uabs,3)}</td></tr>`).join('')}</tbody></table></div>
      ${r.levels.some(l=>l.cvSrc==='target')?`<p class="small muted" style="margin:6px 0 0">Levels marked <i>target</i> have fewer than ${SG_MINN} QC values in this period, so the CV comes from the target SD and mean instead.</p>`:''}`;
    const adv=r.cls?`<div class="panelcard" style="margin-top:8px;border-left:4px solid ${r.cls.col}"><b>${r.cls.name} (lowest sigma ${sgf(r.worst,1)})</b><div class="small" style="margin-top:2px">${esc(r.cls.adv)}</div></div>`:'';
    const btns=`<div class="row" style="gap:6px;margin-top:10px"><button class="btn" data-act="sgreport" data-id="${a.id}">View report</button>${ex?`<button class="btn" data-act="sgpdf" data-id="${a.id}">Report (PDF)</button><button class="btn" data-act="sgxl" data-id="${a.id}">Report (Excel)</button>`:''}</div>`;
    return `<div class="panelcard">${sum}${open?`${set}${tbl}${adv}${btns}`:''}</div>`;
  };
  return `<div class="stack">${head}${rows.length?`<div class="stack">${rows.map(card).join('')}</div>`:'<div class="panel empty">No tests to show.</div>'}${ed&&rows.length?`<p class="small muted">Open a test to set its allowable error. Settings save per test with the Save button. TEa is your laboratory's own goal, for example from CLIA, RCPA, biological variation or your manufacturer.</p>`:''}</div>`;
}

/* ---- the report for one analyte ---- */
function sgReport(r){
  const a=r.a,d=deptOfA(a),set=r.set,u=a.unit||'';
  const meta=[['Laboratory',S.setup.lab||''],['Department',(d.dept||'')+dsub(d.sub)],['Analyser',instLabel(a)],['Panel',a.panel||''],['Analyte',a.name+(u?' ('+u+')':'')],
    ['Report date',fmtDate(todayStr())],['Prepared by',CU?CU.name+' ('+roleName(CU.role)+')':''],['QC values used',SGWIN[r.win]+(r.excl?'; values beyond 3 SD left out':'')]];
  const settings=[['Total allowable error (TEa)',set.tea===''?'not set':set.tea+(set.mode==='abs'?' '+(u||'units')+' (converted to % at each level\'s target mean)':' %')],
    ['Bias',set.bsrc==='qc'?'From QC data: observed mean against target mean':(set.bias===''?'not entered (treated as 0)':set.bias+' % (entered)')],
    ['Uncertainty of bias, u(bias)',(num(set.ub)||0)+' %'],['Coverage factor, k',sgf(r.k,0)+(r.k===2?' (about 95% confidence)':'')]];
  const lv=r.levels.map(l=>({name:levelName(l.lv),mat:(l.t.material||'')+(l.t.lot?' lot '+l.t.lot:''),tmean:l.t.mean,tsd:l.t.sd,n:l.n,omean:l.mo,osd:l.so,cv:l.cv,src:l.cvSrc,bias:l.bias,bu:l.bu,note:l.biasNote,tea:l.teaPct,sigma:l.sigma,cls:l.cls,te:l.te,used:l.used,U:l.Upct,Uabs:l.Uabs}));
  const stmts=r.levels.filter(l=>l.Uabs!=null).map(l=>`${levelName(l.lv)}: at the target mean of ${fmt(l.t.mean)}${u?' '+u:''}, the expanded uncertainty is ±${sgf(l.Uabs,3)}${u?' '+u:''} (±${sgf(l.Upct)} %, k=${sgf(l.k,0)}).`);
  const interp=[];
  if(r.worst==null)interp.push('This test has not been scored because the total allowable error has not been set.');
  else{
    interp.push(`The lowest sigma across the control levels is ${sgf(r.worst,1)}, which is ${r.cls.name.toLowerCase()}.`);
    interp.push(r.cls.adv);
    const bad=r.levels.filter(l=>l.sigma!=null&&l.sigma<3);if(bad.length)interp.push('Sigma is below 3 at '+bad.map(l=>levelName(l.lv)).join(' and ')+'. Look first at the bias, then at the imprecision.');
    const hb=r.levels.filter(l=>l.teaPct>0&&Math.abs(l.bu)>l.teaPct/2);if(hb.length)interp.push('Bias is using more than half of the allowable error at '+hb.map(l=>levelName(l.lv)).join(' and ')+'. Check calibration and traceability.');
  }
  const notes=['Sigma = (TEa % - |Bias %|) / CV %. Estimated total error = |Bias %| + 2 x CV %. Expanded uncertainty U = k x sqrt(CV^2 + u(bias)^2).',
    `CV comes from the laboratory's own QC values when a level has ${SG_MINN} or more in the period, and from the target SD and mean otherwise.`,
    'The sigma strategy guidance follows the Westgard sigma-rule approach. It is a guide and does not replace your laboratory procedures.'];
  return {title:'Sigma metric and measurement uncertainty report',meta,settings,levels:lv,stmts,interp,notes,r};
}
function sgReportHtml(rep){
  const f=sgf,r=rep.r;
  return `<div id="sg-report"><h3 style="margin:0 0 6px">${esc(rep.title)}</h3>
   <div class="row" style="gap:4px 24px">${rep.meta.map(([k,v])=>`<div style="flex:1 1 220px"><span class="small muted">${esc(k)}</span><div>${esc(v||'–')}</div></div>`).join('')}</div>
   <h4 style="margin:14px 0 4px">Settings used</h4><div class="row" style="gap:4px 24px">${rep.settings.map(([k,v])=>`<div style="flex:1 1 260px"><span class="small muted">${esc(k)}</span><div>${esc(v)}</div></div>`).join('')}</div>
   <h4 style="margin:14px 0 4px">Sigma by control level</h4>${sgBar(r.levels,300)}
   <div class="scroll" style="margin-top:8px"><table class="t"><thead><tr><th>Level</th><th>Target mean</th><th>Target SD</th><th>n</th><th>Observed mean</th><th>Observed SD</th><th>CV %</th><th>Bias %</th><th>TEa %</th><th>Sigma</th><th>Class</th><th>Est. total error %</th><th>TEa used</th><th>U %</th><th>U</th></tr></thead><tbody>
   ${rep.levels.map(l=>`<tr><td>${esc(l.name)}<div class="small muted">${esc(l.mat)}</div></td><td>${f(l.tmean,3)}</td><td>${f(l.tsd,3)}</td><td>${l.n}</td><td>${f(l.omean,3)}</td><td>${f(l.osd,3)}</td><td>${f(l.cv)} <span class="small muted">${l.src}</span></td><td>${l.bias==null?'–':f(l.bias)}</td><td>${f(l.tea)}</td><td><b>${f(l.sigma,1)}</b></td><td>${l.cls?esc(l.cls.name):'–'}</td><td>${f(l.te)}</td><td>${l.used==null?'–':f(l.used,0)+'%'}</td><td>${f(l.U)}</td><td>${f(l.Uabs,3)}</td></tr>`).join('')}</tbody></table></div>
   ${rep.stmts.length?`<h4 style="margin:14px 0 4px">Measurement uncertainty</h4><ul style="margin:0;padding-left:18px">${rep.stmts.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
   <h4 style="margin:14px 0 4px">Interpretation</h4>${rep.interp.map(x=>`<p style="margin:0 0 6px">${esc(x)}</p>`).join('')}
   <h4 style="margin:14px 0 4px">Notes</h4><ul class="small muted" style="margin:0;padding-left:18px">${rep.notes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
}
function renderSgModal(){
  const a=anOf(UI.modal.sgrep);if(!a){UI.modal=null;return ''}
  const s=sgState(),r=sgCalc(a,s.win,s.excl),rep=sgReport(r),ex=perm('e_export');
  return `<div class="modalbg" data-act="mclose"><div class="modal" style="max-width:1000px" role="dialog" aria-modal="true" aria-label="Sigma report" data-stop>
   ${sgReportHtml(rep)}
   <div class="row" style="justify-content:flex-end;gap:6px;margin-top:14px">${ex?`<button class="btn primary" data-act="sgpdf" data-id="${a.id}">Download PDF</button><button class="btn" data-act="sgxl" data-id="${a.id}">Download Excel</button>`:''}<button class="btn" data-act="mclose">Close</button></div></div></div>`;
}

/* ---- a small PDF writer (A4, Helvetica) so reports can be saved without any other library ---- */
const PW_H=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const PW_B=[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
function pdfClean(s){
  s=String(s==null?'':s).replace(/[–—−]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/[₀-₉]/g,'').replace(/ₙ|ₛ|ₓ/g,'').replace(/²/g,'2').replace(/√/g,'sqrt').replace(/…/g,'...').replace(/ /g,' ');
  let o='';for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);o+=c<32?' ':c<=255?s[i]:'?'}return o;
}
class MiniPdf{
  constructor(){this.W=595.28;this.H=841.89;this.M=40;this.pages=[];this.add()}
  add(){this.cur=[];this.pages.push(this.cur);this.y=this.M;return this}
  static col(h){h=(h||'#000000').replace('#','');return [0,2,4].map(i=>(parseInt(h.substr(i,2),16)/255).toFixed(3)).join(' ')}
  tw(s,size,bold){const T=bold?PW_B:PW_H;let w=0;s=pdfClean(s);for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);w+=(c>=32&&c<=126?T[c-32]:556)}return w*size/1000}
  wrap(s,w,size,bold){
    const out=[];pdfClean(s).split('\n').forEach(par=>{let line='';par.split(' ').forEach(wd=>{const t=line?line+' '+wd:wd;if(line&&this.tw(t,size,bold)>w){out.push(line);line=wd}else line=t});out.push(line)});return out;
  }
  esc(s){return pdfClean(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
  text(x,y,s,o){o=o||{};const size=o.size||10,w=this.tw(s,size,o.bold);let px=x;if(o.align==='right')px=x-w;else if(o.align==='center')px=x-w/2;
    this.cur.push(`BT ${MiniPdf.col(o.color||'#14232b')} rg /${o.bold?'F2':'F1'} ${size} Tf ${px.toFixed(2)} ${(this.H-y).toFixed(2)} Td (${this.esc(s)}) Tj ET`)}
  rect(x,y,w,h,fill,stroke){let op='';if(fill)op+=MiniPdf.col(fill)+' rg ';if(stroke)op+=MiniPdf.col(stroke)+' RG 0.6 w ';this.cur.push(`${op}${x.toFixed(2)} ${(this.H-y-h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${fill&&stroke?'B':fill?'f':'S'}`)}
  line(x1,y1,x2,y2,c,lw){this.cur.push(`${MiniPdf.col(c||'#8a9aa0')} RG ${lw||0.6} w ${x1.toFixed(2)} ${(this.H-y1).toFixed(2)} m ${x2.toFixed(2)} ${(this.H-y2).toFixed(2)} l S`)}
  tri(x,y,s,c){this.cur.push(`${MiniPdf.col(c)} rg ${(x-s).toFixed(2)} ${(this.H-y).toFixed(2)} m ${(x+s).toFixed(2)} ${(this.H-y).toFixed(2)} l ${x.toFixed(2)} ${(this.H-y-s*1.6).toFixed(2)} l f`)}
  ensure(h){if(this.y+h>this.H-this.M-10)this.add()}
  para(s,o){o=o||{};const size=o.size||9.5,lead=size*1.35,x=o.x||this.M,w=o.w||this.W-2*this.M-(x-this.M);
    this.wrap(s,w,size,o.bold).forEach(l=>{this.ensure(lead);this.text(x,this.y+size,l,{size,bold:o.bold,color:o.color});this.y+=lead});this.y+=o.gap==null?3:o.gap}
  h(s,size){this.ensure(24);this.y+=6;this.text(this.M,this.y+(size||12),s,{size:size||12,bold:true,color:'#0d3b6e'});this.y+=(size||12)+5;this.line(this.M,this.y,this.W-this.M,this.y,'#d5e0e2');this.y+=6}
  table(cols,rows,o){o=o||{};const size=o.size||7.5,pad=3,tw=cols.reduce((a,c)=>a+c.w,0),x0=this.M;
    const draw=(cells,head)=>{
      const lines=cells.map((c,i)=>this.wrap(c&&c.t!=null?c.t:c,cols[i].w-2*pad,size,head||(c&&c.bold)));
      const h=Math.max(...lines.map(l=>l.length))*size*1.3+2*pad;this.ensure(h);
      let x=x0;cells.forEach((c,i)=>{const fill=head?'#e3f2ef':(c&&c.fill)||null;if(fill)this.rect(x,this.y,cols[i].w,h,fill);
        lines[i].forEach((l,j)=>this.text(cols[i].align==='right'?x+cols[i].w-pad:x+pad,this.y+pad+size+j*size*1.3-1,l,{size,bold:head||(c&&c.bold),align:cols[i].align,color:(c&&c.color)||(head?'#0d3b6e':'#14232b')}));x+=cols[i].w});
      this.line(x0,this.y+h,x0+tw,this.y+h,'#d5e0e2');this.y+=h};
    draw(cols.map(c=>c.h),true);rows.forEach(r=>draw(r,false));this.y+=6}
  bytes(footer){
    const n=this.pages.length;if(footer)this.pages.forEach((p,i)=>{this.cur=p;this.text(this.W/2,this.H-22,footer+'  ·  Page '+(i+1)+' of '+n,{size:7.5,align:'center',color:'#566a73'})});
    const objs=[];const add=s=>{objs.push(s);return objs.length};
    add('<< /Type /Catalog /Pages 2 0 R >>');add('PAGES');add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids=[];this.pages.forEach(p=>{const c=p.join('\n'),ci=add(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`),pi=add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.W.toFixed(2)} ${this.H.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${ci} 0 R >>`);kids.push(pi+' 0 R')});
    objs[1]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;
    let out='%PDF-1.4\n',offs=[];objs.forEach((o,i)=>{offs.push(out.length);out+=`${i+1} 0 obj\n${o}\nendobj\n`});
    const xr=out.length;out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+offs.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
    const u=new Uint8Array(out.length);for(let i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;return u}
}
const sgMix=h=>{h=h.replace('#','');return '#'+[0,2,4].map(i=>Math.round(parseInt(h.substr(i,2),16)*0.3+255*0.7).toString(16).padStart(2,'0')).join('')};
function sgPdfReport(pdf,rep,first){
  if(!first)pdf.add();
  const W=pdf.W,M=pdf.M;
  pdf.rect(0,0,W,64,'#0d3b6e');pdf.text(M,30,'QCLens',{size:11,bold:true,color:'#b4e05a'});pdf.text(M,52,rep.title,{size:16,bold:true,color:'#ffffff'});pdf.y=80;
  const colw=(W-2*M)/2;let y0=pdf.y;
  rep.meta.forEach(([k,v],i)=>{const x=M+(i%2)*colw,y=y0+Math.floor(i/2)*26;pdf.text(x,y+8,k,{size:7.5,color:'#566a73'});pdf.text(x,y+19,String(v||'-').slice(0,62),{size:9.5})});
  pdf.y=y0+Math.ceil(rep.meta.length/2)*26+4;
  pdf.h('Settings used');rep.settings.forEach(([k,v])=>{pdf.para(k+': '+v,{size:9,gap:1})});
  pdf.h('Sigma by control level');
  // sigma scale
  pdf.ensure(70);const sx=M,sw=W-2*M,sc=v=>sx+Math.max(0,Math.min(8,v))/8*sw,by=pdf.y+14;
  [[0,3,'#e9b9b2'],[3,4,'#f1d9a8'],[4,5,'#dbe59a'],[5,6,'#b5dcb9'],[6,8,'#8fcdc4']].forEach(([a,b,c])=>pdf.rect(sc(a),by,sc(b)-sc(a),14,c));
  [0,1,2,3,4,5,6,7,8].forEach(v=>{pdf.line(sc(v),by,sc(v),by+18,'#8a9aa0');pdf.text(sc(v),by+28,String(v),{size:7,align:'center',color:'#566a73'})});
  rep.levels.forEach((l,i)=>{if(l.sigma!=null){pdf.tri(sc(l.sigma),by-1,4,'#0d3b6e');pdf.text(sc(l.sigma),by-14-(i%2)*0,'L'+(i+1)+' '+sgf(l.sigma,1),{size:7.5,bold:true,align:'center',color:'#0d3b6e'})}});
  pdf.y=by+36;
  const f=sgf;
  pdf.h('Imprecision and bias');
  pdf.table([{h:'Level',w:50},{h:'Material and lot',w:105},{h:'Target mean',w:48,align:'right'},{h:'Target SD',w:44,align:'right'},{h:'n',w:26,align:'right'},{h:'Obs. mean',w:48,align:'right'},{h:'Obs. SD',w:42,align:'right'},{h:'CV %',w:50,align:'right'},{h:'Bias %',w:50,align:'right'}],
    rep.levels.map(l=>[l.name,l.mat||'-',f(l.tmean,3),f(l.tsd,3),String(l.n),f(l.omean,3),f(l.osd,3),f(l.cv)+' ('+l.src+')',l.bias==null?'-':f(l.bias)]));
  pdf.h('Sigma and measurement uncertainty');
  pdf.table([{h:'Level',w:50},{h:'TEa %',w:44,align:'right'},{h:'Sigma',w:40,align:'right'},{h:'Class',w:74},{h:'Est. total error %',w:62,align:'right'},{h:'TEa used',w:50,align:'right'},{h:'U %',w:46,align:'right'},{h:'U (units)',w:56,align:'right'}],
    rep.levels.map(l=>[l.name,f(l.tea),{t:f(l.sigma,1),bold:true},{t:l.cls?l.cls.name:'-',fill:l.cls?sgMix(l.cls.col):null},f(l.te),l.used==null?'-':f(l.used,0)+'%',f(l.U),f(l.Uabs,3)]));
  if(rep.stmts.length){pdf.h('Measurement uncertainty');rep.stmts.forEach(x=>pdf.para(x,{size:9,gap:2}))}
  pdf.h('Interpretation');rep.interp.forEach(x=>pdf.para(x,{size:9.5}));
  pdf.h('Notes');rep.notes.forEach(x=>pdf.para('- '+x,{size:8,color:'#566a73',gap:2}));
  pdf.ensure(36);pdf.y+=16;
  ['Prepared by','Reviewed by','Date'].forEach((t,i)=>{const x=M+i*((W-2*M)/3),w=(W-2*M)/3-14;pdf.line(x,pdf.y,x+w,pdf.y,'#14232b',0.6);pdf.text(x,pdf.y+10,t,{size:7.5,color:'#566a73'})});
  pdf.y+=18;
}
function sgPdfSummary(pdf,rows){
  const W=pdf.W,M=pdf.M;
  pdf.rect(0,0,W,64,'#0d3b6e');pdf.text(M,30,'QCLens',{size:11,bold:true,color:'#b4e05a'});pdf.text(M,52,'Sigma metrics summary',{size:16,bold:true,color:'#ffffff'});pdf.y=80;
  pdf.para((S.setup.lab||'')+'   Report date: '+fmtDate(todayStr())+'   Prepared by: '+(CU?CU.name:''),{size:9,color:'#566a73'});
  const s=sgState();pdf.para('QC values used for CV: '+SGWIN[s.win]+(s.excl?'; values beyond 3 SD left out':'')+'. Sigma = (TEa % - |Bias %|) / CV %.',{size:8.5,color:'#566a73'});
  pdf.table([{h:'Analyte',w:100},{h:'Panel',w:90},{h:'TEa',w:44,align:'right'},{h:'Lowest sigma',w:56,align:'right'},{h:'Class',w:74},{h:'Error used',w:56,align:'right'},{h:'CV % (worst level)',w:95,align:'right'}],
   rows.map(r=>{const used=r.levels.map(l=>l.used).filter(x=>x!=null),cvs=r.levels.map(l=>l.cv).filter(x=>x!=null);return [r.a.name,r.a.panel||'',r.set.tea===''?'-':r.set.tea+(r.set.mode==='abs'?' '+(r.a.unit||''):' %'),{t:sgf(r.worst,1),bold:true},{t:r.cls?r.cls.name:'Not scored',fill:r.cls?sgMix(r.cls.col):null},used.length?sgf(Math.max(...used),0)+'%':'-',cvs.length?sgf(Math.max(...cvs)):'-']}));
}
const sgFile=a=>'QCLens-sigma-'+a.name.replace(/[^\w-]+/g,'_')+'-'+todayStr();
async function sgSave(filename,data){
  const dl=await getDl();if(!dl){toast('Saving files is not available in this view. Open the app in claude.ai to export.');return false}
  try{await dl.save({filename,data});return true}catch(e){toast(e&&e.code==='declined'?'Save cancelled.':(e&&e.message)||'Export failed.');return false}
}
async function sgExportPdf(list){
  const s=sgState(),rows=list.map(a=>sgCalc(a,s.win,s.excl)),pdf=new MiniPdf();
  if(rows.length>1){sgPdfSummary(pdf,rows);rows.filter(r=>r.worst!=null).forEach(r=>sgPdfReport(pdf,sgReport(r),false))}else sgPdfReport(pdf,sgReport(rows[0]),true);
  const fn=rows.length>1?'QCLens-sigma-summary-'+todayStr()+'.pdf':sgFile(rows[0].a)+'.pdf';
  if(await sgSave(fn,pdf.bytes('QCLens sigma metrics  ·  '+(S.setup.lab||''))))toast('PDF ready.');
  audit('Sigma report exported',(rows.length>1?rows.length+' analytes':rows[0].a.name)+' (PDF)',null,[...new Set(list.map(a=>a.dept))]);save();
}
function sgColName(i){return String.fromCharCode(65+i)}
async function sgExportXlsx(list){
  if(typeof ExcelJS==='undefined'){toast('Excel export is not available right now. Check your connection.');return}
  const s=sgState(),rows=list.map(a=>sgCalc(a,s.win,s.excl)),wb=new ExcelJS.Workbook();wb.creator='QCLens';wb.created=new Date();
  const hdr=c=>{c.font={bold:true,color:{argb:'FF0D3B6E'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE3F2EF'}};c.alignment={wrapText:true,vertical:'middle'}};
  const argb=h=>'FF'+h.replace('#','').toUpperCase(),light=h=>{h=h.replace('#','');const m=i=>Math.round(parseInt(h.substr(i,2),16)*0.35+255*0.65).toString(16).padStart(2,'0');return 'FF'+(m(0)+m(2)+m(4)).toUpperCase()};
  if(rows.length>1){
    const ws=wb.addWorksheet('Summary');ws.addRow(['Sigma metrics summary']).font={bold:true,size:14,color:{argb:'FF0D3B6E'}};
    ws.addRow([S.setup.lab||'','Report date',fmtDate(todayStr()),'Prepared by',CU?CU.name:'']);ws.addRow(['QC values used for CV',SGWIN[s.win]+(s.excl?'; values beyond 3 SD left out':'')]);ws.addRow([]);
    const h=ws.addRow(['Analyte','Panel','Department','TEa','TEa given as','Lowest sigma','Class','Highest % of TEa used','Highest CV %']);h.eachCell(hdr);
    rows.forEach(r=>{const used=r.levels.map(l=>l.used).filter(x=>x!=null),cvs=r.levels.map(l=>l.cv).filter(x=>x!=null),d=deptOfA(r.a);
      const row=ws.addRow([r.a.name,r.a.panel||'',(d.dept||'')+dsub(d.sub),r.set.tea===''?'':+r.set.tea,r.set.mode==='abs'?(r.a.unit||'units'):'%',r.worst==null?'':+r.worst.toFixed(2),r.cls?r.cls.name:'Not scored',used.length?+(Math.max(...used)/100).toFixed(4):'',cvs.length?+Math.max(...cvs).toFixed(3):'']);
      row.getCell(8).numFmt='0%';if(r.cls){row.getCell(6).fill=row.getCell(7).fill={type:'pattern',pattern:'solid',fgColor:{argb:light(r.cls.col)}}}});
    [24,22,24,10,12,13,14,18,13].forEach((w,i)=>ws.getColumn(i+1).width=w);ws.views=[{state:'frozen',ySplit:5}];
  }
  const used=new Set();
  rows.filter(r=>rows.length===1||r.worst!=null).slice(0,60).forEach(r=>{
    const rep=sgReport(r);let nm=('Report '+r.a.name).replace(/[\\\/\?\*\[\]:]/g,'').slice(0,28),k=1,base=nm;while(used.has(nm.toLowerCase()))nm=base.slice(0,26)+' '+(++k);used.add(nm.toLowerCase());
    const ws=wb.addWorksheet(nm);ws.addRow([rep.title]).font={bold:true,size:14,color:{argb:'FF0D3B6E'}};ws.addRow([]);
    rep.meta.forEach(([k,v])=>{const row=ws.addRow([k,v]);row.getCell(1).font={bold:true}});ws.addRow([]);
    ws.addRow(['Settings used']).font={bold:true,color:{argb:'FF0D3B6E'}};
    const tr=ws.rowCount+1;
    ws.addRow(['TEa % at target mean (see level table)',rep.r.set.tea===''?'not set':rep.r.set.tea+(rep.r.set.mode==='abs'?' '+(r.a.unit||'units'):' %')]);
    ws.addRow(['Bias',rep.settings[1][1]]);
    const ubRow=ws.addRow(['Uncertainty of bias, u(bias) %',num(rep.r.set.ub)||0]);ubRow.getCell(2).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF7D6'}};
    const kRow=ws.addRow(['Coverage factor k',r.k]);kRow.getCell(2).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF7D6'}};
    ws.addRow([]);
    const ubA='$B$'+ubRow.number,kA='$B$'+kRow.number;
    const hr=ws.addRow(['Level','Material and lot','Target mean','Target SD','n','Observed mean','Observed SD','CV % used','CV source','Bias % used','TEa %','Sigma','Class','Est. total error %','TEa used','Expanded U %','Expanded U (units)']);hr.eachCell(hdr);hr.height=32;
    rep.levels.forEach(l=>{const rn=ws.rowCount+1,cl=l.cls;
      const row=ws.addRow([l.name,l.mat,l.tmean,l.tsd,l.n,l.omean==null?'':+l.omean.toFixed(4),l.osd==null?'':+l.osd.toFixed(4),l.cv==null?'':+l.cv.toFixed(4),l.src,l.bu,l.tea==null?'':+l.tea.toFixed(4),'','','','','','']);
      row.getCell(12).value={formula:`IF(AND(ISNUMBER(K${rn}),H${rn}>0),(K${rn}-ABS(J${rn}))/H${rn},"")`,result:l.sigma==null?'':+l.sigma.toFixed(3)};
      row.getCell(13).value={formula:`IF(L${rn}="","Not scored",IF(L${rn}>=6,"World class",IF(L${rn}>=5,"Excellent",IF(L${rn}>=4,"Good",IF(L${rn}>=3,"Marginal","Poor")))))`,result:cl?cl.name:'Not scored'};
      row.getCell(14).value={formula:`ABS(J${rn})+2*H${rn}`,result:l.te==null?'':+l.te.toFixed(3)};
      row.getCell(15).value={formula:`IF(AND(ISNUMBER(K${rn}),K${rn}>0),N${rn}/K${rn},"")`,result:l.used==null?'':+(l.used/100).toFixed(4)};row.getCell(15).numFmt='0%';
      row.getCell(16).value={formula:`${kA}*SQRT(H${rn}^2+${ubA}^2)`,result:l.U==null?'':+l.U.toFixed(3)};
      row.getCell(17).value={formula:`P${rn}/100*ABS(C${rn})`,result:l.Uabs==null?'':+l.Uabs.toFixed(4)};
      if(cl){row.getCell(12).fill=row.getCell(13).fill={type:'pattern',pattern:'solid',fgColor:{argb:light(cl.col)}};row.getCell(12).font={bold:true}}
      [12,14,16].forEach(c=>row.getCell(c).numFmt='0.00')});
    ws.addRow([]);ws.addRow(['Measurement uncertainty']).font={bold:true,color:{argb:'FF0D3B6E'}};rep.stmts.forEach(x=>ws.addRow([x]));
    ws.addRow([]);ws.addRow(['Interpretation']).font={bold:true,color:{argb:'FF0D3B6E'}};rep.interp.forEach(x=>ws.addRow([x]));
    ws.addRow([]);ws.addRow(['Notes']).font={bold:true,color:{argb:'FF0D3B6E'}};rep.notes.forEach(x=>ws.addRow([x]));
    ws.addRow([]);ws.addRow(['Prepared by: ____________________','Reviewed by: ____________________','Date: ____________']);
    [30,30,12,12,8,13,13,11,11,11,9,9,13,14,10,13,15].forEach((w,i)=>ws.getColumn(i+1).width=w);
  });
  try{toast('Preparing Excel file…');const buf=await wb.xlsx.writeBuffer(),fn=rows.length>1?'QCLens-sigma-summary-'+todayStr()+'.xlsx':sgFile(rows[0].a)+'.xlsx';
    if(await sgSave(fn,buf))toast('Excel file ready.');
    audit('Sigma report exported',(rows.length>1?rows.length+' analytes':rows[0].a.name)+' (Excel)',null,[...new Set(list.map(a=>a.dept))]);save()}catch(e){toast((e&&e.message)||'Export failed.')}
}

/* ---- actions ---- */
function sgDraftRead(){const s=sgState();return s.draft}
function sgAct(act,el){
  const s=sgState(),id=el.dataset.id;
  if(!perm('v_sigma'))return true;
  switch(act){
   case 'sgtoggle':s.open[id]=!s.open[id];render();return true;
   case 'sgreport':UI.modal={sgrep:id};render();return true;
   case 'sgsave':{
     if(!perm('e_sigma')){toast('Your access level does not include this. Ask an administrator.');return true}
     const a=anOf(id);if(!a||!canSeeD(a.dept))return true;
     const d=Object.assign({},sgSet(a),s.draft[id]||{});
     const tea=d.tea===''?null:num(d.tea);
     if(d.tea!==''&&(tea==null||tea<=0))return toast('Allowable error must be a number above 0.'),true;
     if(d.bias!==''&&num(d.bias)==null)return toast('Bias must be a number.'),true;
     if(d.ub!==''&&(num(d.ub)==null||num(d.ub)<0))return toast('Uncertainty of bias must be 0 or more.'),true;
     const k=num(d.k);if(k==null||k<=0)return toast('k must be a number above 0 (usually 2).'),true;
     a.sigma={tea:d.tea===''?'':String(tea),mode:d.mode==='abs'?'abs':'pct',bias:d.bias===''?'':String(num(d.bias)),bsrc:d.bsrc==='qc'?'qc':'entered',ub:d.ub===''?'':String(num(d.ub)),k:k,...stampNow()};
     delete s.draft[id];
     audit('Sigma settings saved',a.name+': TEa '+(a.sigma.tea||'none')+(a.sigma.mode==='abs'?' '+(a.unit||'units'):' %')+', bias '+(a.sigma.bsrc==='qc'?'from QC data':(a.sigma.bias||'0')+' %')+', k '+a.sigma.k,null,[a.dept]);
     save();toast('Saved for '+a.name+'.');render();return true}
   case 'sgpdf':case 'sgxl':case 'sgpdfall':case 'sgxlall':{
     if(!perm('e_export')){toast('Your access level does not include exporting.');return true}
     const all=act.endsWith('all'),list=all?sgAll().map(r=>r.a):[anOf(id)].filter(Boolean);
     if(!list.length)return true;
     (act.startsWith('sgpdf')?sgExportPdf:sgExportXlsx)(list);return true}
  }
  return false;
}
function sgChange(e){
  const t=e.target,d=t.dataset;if(!d||(d.sgsel===undefined&&d.sgf===undefined))return false;
  const s=sgState();
  if(d.sgsel!==undefined){
    sgCaptureDrafts();
    if(d.sgsel==='excl')s.excl=t.checked;else{s[d.sgsel]=t.value;if(d.sgsel==='dept')s.panel=''}
    render();return true}
  const [id,f]=d.sgf.split(':');(s.draft[id]||(s.draft[id]={}))[f]=t.value;
  if(f==='bsrc'){sgCaptureDrafts();render()}
  return true;
}
function sgCaptureDrafts(){const s=sgState();document.querySelectorAll('[data-sgf]').forEach(i=>{const [id,f]=i.dataset.sgf.split(':');(s.draft[id]||(s.draft[id]={}))[f]=i.value})}
