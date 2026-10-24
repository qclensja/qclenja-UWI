/* ===== Engine: dates, targets, Westgard rules ===== */
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const pad=n=>String(n).padStart(2,'0');
const dstr=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const todayStr=()=>dstr(new Date());
const pd=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const dowOf=s=>pd(s).getDay();
const daysBetween=(a,b)=>Math.round((pd(b)-pd(a))/864e5);
const fmtDate=s=>{const d=pd(s);return DOW[d.getDay()]+' '+pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()};
const shortDate=s=>pad(pd(s).getDate())+'/'+pad(pd(s).getMonth()+1);

function isDue(a,date){
  const s=a.schedule||{type:'daily'};
  if(s.type==='daily')return true;
  if(s.type==='weekdays')return (s.days||[]).includes(dowOf(date));
  if(s.type==='ondemand')return false;
  if(s.type==='interval'){const n=Math.max(1,+s.every||1);const k=daysBetween(s.start||date,date);return k>=0&&k%n===0}
  return true;
}
function scheduleText(a){
  const s=a.schedule||{type:'daily'};
  if(s.type==='daily')return 'Every day';
  if(s.type==='ondemand')return 'On demand (no fixed schedule)';
  if(s.type==='weekdays')return (s.days||[]).length?(s.days||[]).slice().sort().map(d=>DOW[d]).join(', '):'No days chosen';
  return 'Every '+s.every+' days from '+fmtDate(s.start);
}
function targetIndex(a,date){
  let idx=0;
  a.targets.forEach((t,i)=>{if(t.from<=date)idx=i});
  return idx;
}
/* a lot change or target adjustment only counts for a control level when that level's mean, SD, material or lot changed */
function lvChanged(a,i,lv){const p=(a.targets[i-1]||{levels:[]}).levels[lv],c=(a.targets[i]||{levels:[]}).levels[lv];if(!p||!c)return p!==c;
  return p.mean!==c.mean||p.sd!==c.sd||(p.lot||'')!==(c.lot||'')||(p.material||'')!==(c.material||'')}
function lvEra(a,lv,date){const ti=targetIndex(a,date);let e=0;for(let i=1;i<=ti;i++)if(lvChanged(a,i,lv))e++;return e}
const targetFor=(a,date)=>a.targets[targetIndex(a,date)];
const curTarget=a=>targetFor(a,todayStr());
const zOf=(a,r)=>{const t=targetFor(a,r.date).levels[r.lv];return t&&t.sd>0?(r.value-t.mean)/t.sd:0};

const RULES={
 '1-2s':{sev:'warn',name:'1₂ₛ warning',desc:'One control is more than 2 SD from the mean.',
   fix:['Warning only. Accept the run if no other rule is broken.','Look at the chart for a trend or shift building up.','Check the other control level in the same run.','Watch the next run closely.']},
 '1-3s':{sev:'reject',name:'1₃ₛ',desc:'One control is more than 3 SD from the mean (random error, or a large systematic error).',
   fix:['Re-run the same control with a fresh aliquot or vial.','Check the sample probe, bubbles, clots and short sampling.','Confirm the control was thawed, mixed and labelled correctly and is within expiry.','Check reagent volume, reagent expiry and on-board stability.','If it repeats, calibrate and re-run both levels before reporting patient results.']},
 '2-2s':{sev:'reject',name:'2₂ₛ',desc:'Two consecutive controls are more than 2 SD on the same side of the mean (systematic error).',
   fix:['Calibrate the analyte, then re-run both control levels.','Open a fresh reagent pack or a new reagent lot and check storage temperature.','Open a new control vial in case the current one has deteriorated.','Check recent maintenance, lamp, ISE electrodes, probe and water quality.','Hold patient results until QC is back within limits.']},
 'R-4s':{sev:'reject',name:'R₄ₛ',desc:'Two controls in one run are more than 4 SD apart: one above +2 SD and one below −2 SD (random error).',
   fix:['Re-run both levels with fresh aliquots.','Check pipetting, mixing, bubbles and sample probe condition.','Check for electrical noise, unstable temperature and cuvette or electrode problems.','Review the reagent and control handling steps.','Repeat QC. Persistent R₄ₛ needs service or maintenance.']},
 '4-1s':{sev:'reject',name:'4₁ₛ',desc:'Four consecutive controls are more than 1 SD on the same side of the mean (small systematic shift).',
   fix:['Calibrate and re-run QC.','Check whether a reagent or calibrator lot changed recently.','Compare against another analyser or a peer group if available.','Check scheduled maintenance, lamp hours and reagent deterioration.','If the shift is real after a lot change, review the target mean (Lot change button).']},
 '10x':{sev:'reject',name:'10ₓ',desc:'Ten consecutive controls fall on the same side of the mean (persistent bias).',
   fix:['Look for a gradual drift: reagent, calibrator, control or lamp ageing.','Calibrate and re-run QC.','Check whether the target mean still matches the current lot.','Review maintenance and environmental changes (temperature, water).','Document the investigation, then override with a comment if the run is judged acceptable.']},
 'T7':{sev:'warn',name:'Trend (7T)',desc:'Seven or more consecutive controls of one level move steadily in the same direction (gradual drift).',
   fix:['Check the reagent: deteriorating, near its on-board stability limit or stored warm. Replace with a fresh pack.','Check the control and calibrator material: evaporation, long-open vial, or storage temperature.','Check lamp hours, electrode or probe wear, cuvette condition and reagent compartment temperature.','Review water quality and recent maintenance.','Calibrate and re-run QC. If the drift continues, open a new reagent or control lot and compare.','Look at the patient moving average for the same drift.']},
 'S6':{sev:'warn',name:'Shift (6x)',desc:'Six or more consecutive controls of one level fall on the same side of the mean (early sign of a shift).',
   fix:['Ask what changed when the shift began: new reagent lot or pack, calibration, control vial or lot, maintenance, lamp or electrode change.','Check that calibration used the correct calibrator lot and passed its acceptance checks.','Recalibrate and re-run QC; compare with another analyser or peer group.','If a new control lot started the shift, record it with Lot change and a comment so the target is updated.','Check the patient moving average before the shift becomes a rejection (4₁ₛ or 10ₓ).']}
};
/* trends and shifts per control level: runs of points that drift or sit on one side of the mean */
const RORDER=['1-2s','1-3s','2-2s','R-4s','4-1s','10x','T7','S6'];
const SCOPED=['2-2s','4-1s','10x'];
const SCOPE_TXT={both:'Within each level or across levels (either one triggers it)',within:'Within each level only (each level on its own)',across:'Across levels only (all levels together, in the order they were run)'};
/* rules are set for the whole laboratory, and a department can have its own set (S.drules[deptId]) */
const rulesFor=d=>{try{const o=d&&S.drules&&S.drules[d];return o||S.rules||{}}catch(e){return {}}};
const hasOwnRules=d=>{try{return !!(d&&S.drules&&S.drules[d])}catch(e){return false}};
const scopeOf=(k,d)=>{const v=rulesFor(d)[k+'@'];return v==='within'||v==='across'?v:'both'};
const ruleOn=(k,d)=>rulesFor(d)[k]!==false;
function patternsFor(a,lv,results){
  const rs=results.filter(r=>r.aid===a.id&&r.lv===lv).sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:0),segs={};
  rs.forEach(r=>{const k=lvEra(a,lv,r.date);(segs[k]||(segs[k]=[])).push({r,z:zOf(a,r)})});
  const out=[],push=(kind,dir,w,seg)=>out.push({kind,dir,lv,ids:w.map(p=>p.r.id),n:w.length,from:w[0].r.date,to:w[w.length-1].r.date,open:w[w.length-1]===seg[seg.length-1]});
  Object.values(segs).forEach(seg=>{
    let i=0;while(i<seg.length){ // shift: same side of the mean
      const s=Math.sign(seg[i].z);if(!s){i++;continue}
      let j=i;while(j+1<seg.length&&Math.sign(seg[j+1].z)===s)j++;
      if(j-i+1>=6)push('shift',s,seg.slice(i,j+1),seg);i=j+1}
    i=0;while(i<seg.length-1){ // trend: steadily rising or falling
      const d=Math.sign(seg[i+1].z-seg[i].z);if(!d){i++;continue}
      let j=i+1;while(j+1<seg.length&&Math.sign(seg[j+1].z-seg[j].z)===d)j++;
      if(j-i+1>=7)push('trend',d,seg.slice(i,j+1),seg);i=d?j:j+1}
  });
  return out.filter(p=>ruleOn(p.kind==='shift'?'S6':'T7',a.dept));
}
function evaluate(a,results){
  const out={}; // resultId -> [{rule,sev}]
  const D=a.dept,add=(r,rule)=>{if(!ruleOn(rule,D))return;const o=out[r.id]||(out[r.id]=[]);if(!o.some(x=>x.rule===rule))o.push({rule,sev:RULES[rule].sev})};
  const rs=results.filter(r=>r.aid===a.id).sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:x.lv-y.lv);
  const segs={};
  rs.forEach(r=>{const k=targetIndex(a,r.date);(segs[k]||(segs[k]=[])).push({r,z:zOf(a,r)})});
  Object.values(segs).forEach(seg=>{
    seg.forEach(p=>{const m=Math.abs(p.z);if(m>3)add(p.r,'1-3s');else if(m>2)add(p.r,'1-2s')});
    const byLv={};seg.forEach(p=>(byLv[p.r.lv]||(byLv[p.r.lv]=[])).push(p));
    const byDate={};seg.forEach(p=>(byDate[p.r.date]||(byDate[p.r.date]=[])).push(p));
    const runs=(arr,n,test,rule)=>{for(let i=n-1;i<arr.length;i++){const w=arr.slice(i-n+1,i+1);if(w.every(p=>test(p.z,w[0].z)))add(arr[i].r,rule)}};
    const multi=Object.keys(byLv).length>1,wi=k=>!multi||scopeOf(k,D)!=='across',ac=k=>multi&&scopeOf(k,D)!=='within';
    // across levels, chronological stream of all levels
    if(multi){
      if(ac('4-1s'))runs(seg,4,(z,z0)=>Math.abs(z)>1&&Math.sign(z)===Math.sign(z0),'4-1s');
      if(ac('10x'))runs(seg,10,(z,z0)=>z!==0&&Math.sign(z)===Math.sign(z0),'10x');
    }
    Object.values(byDate).forEach(g=>{
      for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){
        const a1=g[i].z,b1=g[j].z;
        if(ac('2-2s')&&Math.abs(a1)>2&&Math.abs(b1)>2&&Math.sign(a1)===Math.sign(b1)){add(g[i].r,'2-2s');add(g[j].r,'2-2s')}
        if((a1>2&&b1<-2)||(a1<-2&&b1>2)){add(g[i].r,'R-4s');add(g[j].r,'R-4s')}
      }
    });
  });
  // within each level: a level's own run only restarts when that level's targets changed
  {const lvSegs={},nl=new Set(rs.map(r=>r.lv)).size>1;rs.forEach(r=>{const k=r.lv+'|'+lvEra(a,r.lv,r.date);(lvSegs[k]||(lvSegs[k]=[])).push({r,z:zOf(a,r)})});
   const runs=(arr,n,test,rule)=>{for(let i=n-1;i<arr.length;i++){const w=arr.slice(i-n+1,i+1);if(w.every(p=>test(p.z,w[0].z)))add(arr[i].r,rule)}};
   const wi=k=>!nl||scopeOf(k,D)!=='across';
   Object.values(lvSegs).forEach(arr=>{
     if(wi('2-2s'))runs(arr,2,(z,z0)=>Math.abs(z)>2&&Math.sign(z)===Math.sign(z0),'2-2s');
     if(wi('4-1s'))runs(arr,4,(z,z0)=>Math.abs(z)>1&&Math.sign(z)===Math.sign(z0),'4-1s');
     if(wi('10x'))runs(arr,10,(z,z0)=>z!==0&&Math.sign(z)===Math.sign(z0),'10x')})}
  const byId={};results.forEach(r=>{if(r.aid===a.id)byId[r.id]=r});
  for(let lv=0;lv<(a.nlev||1);lv++)patternsFor(a,lv,results).forEach(sp=>{
    if(sp.kind==='trend')sp.ids.slice(6).forEach(id=>add(byId[id],'T7'));
    else sp.ids.slice(5).forEach(id=>add(byId[id],'S6'))});
  return out;
}
const statusOf=(flags,r)=>{
  const f=flags[r.id]||[];
  if(f.some(x=>x.sev==='reject'))return r.ov?'ov':'rej';
  if(f.length)return r.ov?'ov':'warn';
  return 'ok';
};
