/* ===== CLIA acceptance limits (criteria for acceptable performance) =====
   Built-in copy of the CLIA proficiency testing acceptance limits (42 CFR part 493 subpart I) as revised by the 2024 final rule (CMS-3355-F),
   from CMS memo QSO-24-15-CLIA, Attachment 1. A newer table can be loaded from clia.json in the QCLens repository (see cliaRefresh). */
const CLIA_BUILTIN={version:'CLIA 2024 final rule (CMS-3355-F)',updated:'2024-07-11',effective:'2024-07-11',ptStart:'2025-01-01',checked:'2026-10-25',
 source:'CMS QSO-24-15-CLIA, Attachment 1',
 notes:'Acceptance limits are written as a percentage of the target value, a fixed amount, or whichever is greater. Fixed amounts are converted to the test\'s own units where a standard conversion exists.',
 skipDepts:['Urinalysis','Microbiology','Molecular Diagnostics'],
 e:[
 /* k key, n names, g group, p percent, a absolute amount (in unit u), u its unit, c conversion factors u -> app unit, d only these departments */
 {k:'alt',n:['alt','sgpt','alanine aminotransferase'],g:'Routine chemistry',p:15,a:6,u:'U/L',c:{'U/L':1}},
 {k:'alb',n:['albumin'],g:'Routine chemistry',p:8},
 {k:'alp',n:['alp','alkaline phosphatase'],g:'Routine chemistry',p:20},
 {k:'amy',n:['amylase'],g:'Routine chemistry',p:20},
 {k:'ast',n:['ast','sgot','aspartate aminotransferase'],g:'Routine chemistry',p:15,a:6,u:'U/L',c:{'U/L':1}},
 {k:'tbil',n:['total bilirubin','bilirubin total','bilirubin'],g:'Routine chemistry',p:20,a:0.4,u:'mg/dL',c:{'mg/dL':1,'µmol/L':17.104,'umol/L':17.104}},
 {k:'pco2',n:['pco2'],g:'Routine chemistry',p:8,a:5,u:'mmHg',c:{'mmHg':1,'kPa':0.1333},d:['Blood Gas & Electrolytes']},
 {k:'po2',n:['po2'],g:'Routine chemistry',p:15,a:15,u:'mmHg',c:{'mmHg':1,'kPa':0.1333},d:['Blood Gas & Electrolytes']},
 {k:'ph',n:['ph'],g:'Routine chemistry',a:0.04,u:'pH units',c:{'':1,'pH':1},d:['Blood Gas & Electrolytes']},
 {k:'bnp',n:['bnp','nt probnp','probnp','pro bnp','nt pro bnp'],g:'Routine chemistry',p:30},
 {k:'ca',n:['calcium','total calcium','calcium total'],g:'Routine chemistry',a:1.0,u:'mg/dL',c:{'mg/dL':1,'mmol/L':0.2495}},
 {k:'co2',n:['co2','carbon dioxide','tco2','total co2','bicarbonate'],g:'Routine chemistry',p:20},
 {k:'cl',n:['chloride'],g:'Routine chemistry',p:5},
 {k:'chol',n:['total cholesterol','cholesterol','cholesterol total'],g:'Routine chemistry',p:10},
 {k:'hdl',n:['hdl cholesterol','hdl','cholesterol hdl'],g:'Routine chemistry',p:20,a:6,u:'mg/dL',c:{'mg/dL':1,'mmol/L':0.02586}},
 {k:'ldl',n:['ldl cholesterol','ldl','cholesterol ldl'],g:'Routine chemistry',p:20},
 {k:'ck',n:['ck','creatine kinase','cpk'],g:'Routine chemistry',p:20},
 {k:'ckmb',n:['ck mb','ck mb mass','ckmb','ck mb isoenzyme'],g:'Routine chemistry',p:25,a:3,u:'ng/mL',c:{'ng/mL':1,'µg/L':1,'ug/L':1}},
 {k:'crea',n:['creatinine'],g:'Routine chemistry',p:10,a:0.2,u:'mg/dL',c:{'mg/dL':1,'µmol/L':88.42,'umol/L':88.42}},
 {k:'ferr',n:['ferritin'],g:'Routine chemistry',p:20},
 {k:'ggt',n:['ggt','gamma glutamyl transferase','gamma gt'],g:'Routine chemistry',p:15,a:5,u:'U/L',c:{'U/L':1}},
 {k:'glu',n:['glucose'],g:'Routine chemistry',p:8,a:6,u:'mg/dL',c:{'mg/dL':1,'mmol/L':0.05551}},
 {k:'a1c',n:['hba1c','hemoglobin a1c','haemoglobin a1c','glycated hemoglobin'],g:'Routine chemistry',p:8},
 {k:'iron',n:['iron','iron total','total iron'],g:'Routine chemistry',p:15},
 {k:'ldh',n:['ldh','lactate dehydrogenase','ld'],g:'Routine chemistry',p:15},
 {k:'mg',n:['magnesium'],g:'Routine chemistry',p:15},
 {k:'phos',n:['phosphate','phosphorus','inorganic phosphate'],g:'Routine chemistry',p:10,a:0.3,u:'mg/dL',c:{'mg/dL':1,'mmol/L':0.3229}},
 {k:'k',n:['potassium'],g:'Routine chemistry',a:0.3,u:'mmol/L',c:{'mmol/L':1}},
 {k:'psa',n:['psa','prostate specific antigen'],g:'Routine chemistry',p:20,a:0.2,u:'ng/mL',c:{'ng/mL':1,'µg/L':1,'ug/L':1}},
 {k:'na',n:['sodium'],g:'Routine chemistry',a:4,u:'mmol/L',c:{'mmol/L':1}},
 {k:'tibc',n:['tibc','total iron binding capacity'],g:'Routine chemistry',p:20},
 {k:'tp',n:['total protein','protein total'],g:'Routine chemistry',p:8},
 {k:'tg',n:['triglycerides','triglyceride'],g:'Routine chemistry',p:15},
 {k:'tni',n:['troponin i','troponin i hs','hs troponin i'],g:'Routine chemistry',p:30,a:0.9,u:'ng/mL',c:{'ng/mL':1,'ng/L':1000,'µg/L':1,'ug/L':1}},
 {k:'tnt',n:['troponin t','troponin t hs','hs troponin t'],g:'Routine chemistry',p:30,a:0.2,u:'ng/mL',c:{'ng/mL':1,'ng/L':1000,'µg/L':1,'ug/L':1}},
 {k:'bun',n:['urea','urea nitrogen','bun'],g:'Routine chemistry',p:9,a:2,u:'mg/dL (urea nitrogen)',c:{'mg/dL':1,'mmol/L':0.357},note:'The fixed amount is for urea nitrogen. It is converted to urea in mmol/L.'},
 {k:'ua',n:['uric acid','urate'],g:'Routine chemistry',p:10},
 {k:'ca125',n:['ca 125'],g:'Endocrinology',p:20},
 {k:'cea',n:['cea'],g:'Endocrinology',p:15,a:1,u:'ng/mL',c:{'ng/mL':1,'µg/L':1,'ug/L':1}},
 {k:'cort',n:['cortisol'],g:'Endocrinology',p:20},
 {k:'e2',n:['estradiol'],g:'Endocrinology',p:30},
 {k:'fol',n:['folate','serum folate'],g:'Endocrinology',p:30,a:1,u:'ng/mL',c:{'ng/mL':1,'µg/L':1,'ug/L':1,'nmol/L':2.266}},
 {k:'fsh',n:['fsh'],g:'Endocrinology',p:18,a:2,u:'IU/L',c:{'IU/L':1,'mIU/mL':1}},
 {k:'ft4',n:['free t4','free thyroxine','ft4'],g:'Endocrinology',p:15,a:0.3,u:'ng/dL',c:{'ng/dL':1,'pmol/L':12.87}},
 {k:'hcg',n:['hcg','hcg serum quant','human chorionic gonadotropin'],g:'Endocrinology',p:18,a:3,u:'mIU/mL',c:{'mIU/mL':1,'IU/L':1,'mIU/L':1000}},
 {k:'lh',n:['lh','luteinizing hormone'],g:'Endocrinology',p:20},
 {k:'pth',n:['pth','parathyroid hormone'],g:'Endocrinology',p:30},
 {k:'prog',n:['progesterone'],g:'Endocrinology',p:25},
 {k:'prl',n:['prolactin'],g:'Endocrinology',p:20},
 {k:'test',n:['testosterone'],g:'Endocrinology',p:30,a:20,u:'ng/dL',c:{'ng/dL':1,'nmol/L':0.03467}},
 {k:'t3u',n:['t3 uptake','t uptake'],g:'Endocrinology',p:18},
 {k:'t3',n:['t3','triiodothyronine','free t3'],g:'Endocrinology',p:30,note:'The CLIA limit is for total T3. It is applied to free T3 here as a guide.'},
 {k:'tsh',n:['tsh'],g:'Endocrinology',p:20,a:0.2,u:'mIU/L',c:{'mIU/L':1}},
 {k:'t4',n:['t4','thyroxine','total t4'],g:'Endocrinology',p:20,a:1.0,u:'µg/dL',c:{'µg/dL':1,'ug/dL':1,'nmol/L':12.87}},
 {k:'b12',n:['vitamin b12','b12'],g:'Endocrinology',p:25,a:30,u:'pg/mL',c:{'pg/mL':1,'pmol/L':0.7378,'ng/L':1}},
 {k:'apap',n:['acetaminophen','paracetamol'],g:'Toxicology',p:15,a:3,u:'µg/mL',c:{'µg/mL':1,'mg/L':1,'µmol/L':6.615,'umol/L':6.615}},
 {k:'etoh',n:['alcohol','ethanol','blood alcohol'],g:'Toxicology',p:20},
 {k:'pb',n:['blood lead','lead'],g:'Toxicology',p:10,a:2,u:'µg/dL',c:{'µg/dL':1,'ug/dL':1}},
 {k:'cbz',n:['carbamazepine'],g:'Toxicology',p:20,a:1.0,u:'µg/mL',c:{'µg/mL':1,'mg/L':1,'µmol/L':4.234,'umol/L':4.234}},
 {k:'dig',n:['digoxin'],g:'Toxicology',p:15,a:0.2,u:'ng/mL',c:{'ng/mL':1,'µg/L':1,'nmol/L':1.281}},
 {k:'gent',n:['gentamicin'],g:'Toxicology',p:25},
 {k:'li',n:['lithium'],g:'Toxicology',p:15,a:0.3,u:'mmol/L',c:{'mmol/L':1}},
 {k:'pheno',n:['phenobarbital'],g:'Toxicology',p:15,a:2,u:'µg/mL',c:{'µg/mL':1,'mg/L':1,'µmol/L':4.31,'umol/L':4.31}},
 {k:'phen',n:['phenytoin'],g:'Toxicology',p:15,a:2,u:'µg/mL',c:{'µg/mL':1,'mg/L':1,'µmol/L':3.964,'umol/L':3.964}},
 {k:'sal',n:['salicylate'],g:'Toxicology',p:15,a:2,u:'µg/mL',c:{'µg/mL':1,'mg/L':1}},
 {k:'theo',n:['theophylline'],g:'Toxicology',p:20},
 {k:'tobra',n:['tobramycin'],g:'Toxicology',p:20},
 {k:'vpa',n:['valproic acid'],g:'Toxicology',p:20},
 {k:'vanc',n:['vancomycin'],g:'Toxicology',p:15,a:2,u:'µg/mL',c:{'µg/mL':1,'mg/L':1}},
 {k:'rbc',n:['rbc','erythrocyte count','red cell count','red blood cell count'],g:'Hematology',p:4},
 {k:'hct',n:['hematocrit','haematocrit','hct'],g:'Hematology',p:4},
 {k:'hb',n:['hemoglobin','haemoglobin','hb','hgb'],g:'Hematology',p:4},
 {k:'wbc',n:['wbc','leukocyte count','white cell count','white blood cell count'],g:'Hematology',p:10},
 {k:'plt',n:['platelets','platelet count','plt'],g:'Hematology',p:25},
 {k:'fib',n:['fibrinogen'],g:'Hematology',p:20},
 {k:'aptt',n:['aptt','ptt','partial thromboplastin time','activated partial thromboplastin time'],g:'Hematology',p:15},
 {k:'pt',n:['pt','prothrombin time','inr'],g:'Hematology',p:15},
 {k:'a1at',n:['alpha 1 antitrypsin'],g:'General immunology',p:20},
 {k:'afp',n:['afp','alpha fetoprotein'],g:'General immunology',p:20},
 {k:'c3',n:['c3','complement c3'],g:'General immunology',p:15},
 {k:'c4',n:['c4','complement c4'],g:'General immunology',p:20,a:5,u:'mg/dL',c:{'mg/dL':1,'g/L':0.01}},
 {k:'crp',n:['hs crp','crp hs','c reactive protein hs'],g:'General immunology',p:30,a:1,u:'mg/L',c:{'mg/L':1}},
 {k:'iga',n:['iga'],g:'General immunology',p:20},{k:'ige',n:['ige'],g:'General immunology',p:20},{k:'igg',n:['igg'],g:'General immunology',p:20},{k:'igm',n:['igm'],g:'General immunology',p:20}
 ]};
let CLIA_DATA=CLIA_BUILTIN,CLIA_STATE={src:'built-in',msg:''};
const cliaNorm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const cliaUnit=u=>String(u==null?'':u).trim();
/* what the CLIA limit means for one analyte, in that analyte's own units */
function cliaFor(a){
  if(!a)return null;const D=CLIA_DATA,dept=(deptOfA(a)||{}).dept||'';
  if((D.skipDepts||[]).includes(dept))return null;
  const nm=cliaNorm(a.name),e=(D.e||[]).find(x=>(x.n||[]).includes(nm)&&(!x.d||x.d.includes(dept)));
  if(!e)return null;
  const unit=cliaUnit(a.unit);let abs=null,absNote='';
  if(e.a!=null){const f=e.c?e.c[unit]:undefined;if(f!=null){abs=+(e.a*f).toPrecision(3)}else absNote=e.p!=null?'The fixed amount ('+e.a+' '+e.u+') is not in this test\'s units'+(unit?' ('+unit+')':'')+', so only the percentage is used.':'The CLIA limit is '+e.a+' '+e.u+', which cannot be converted to this test\'s units'+(unit?' ('+unit+')':'')+'.'}
  if(e.p==null&&abs==null)return {e,usable:false,text:'±'+e.a+' '+e.u,note:absNote};
  const mode=e.p!=null&&abs!=null?'both':e.p!=null?'pct':'abs';
  const u=unit||'units';
  const text=mode==='both'?'±'+e.p+'% or ±'+abs+' '+u+' (whichever is greater)':mode==='pct'?'±'+e.p+'%':'±'+abs+' '+u;
  const orig=e.a!=null?(e.p!=null?'±'+e.p+'% or ±'+e.a+' '+e.u+' (greater)':'±'+e.a+' '+e.u):'±'+e.p+'%';
  return {e,usable:true,mode,pct:e.p,abs,text,orig,note:[absNote,e.note].filter(Boolean).join(' '),group:e.g,key:e.k,src:D.version};
}
function cliaSettings(a,m){ // sigma settings that apply the CLIA limit to analyte a
  const cur=sgSet(a),o={...cur,mode:m.mode,tea:String(m.mode==='abs'?m.abs:m.pct),abs:m.mode==='both'?String(m.abs):'',src:CLIA_DATA.version,clia:m.e.k};
  return o;
}
function cliaTxt(){const D=CLIA_DATA;return D.version+', effective '+fmtDate(D.effective)+(D.ptStart?'; proficiency testing graded on it from '+fmtDate(D.ptStart):'')}
/* Try to load a newer table from the QCLens repository. The built-in table is used if this fails (offline, blocked, or no newer table). */
async function cliaRefresh(force){
  if(CLIA_STATE.tried&&!force)return;CLIA_STATE.tried=true;
  const urls=['https://raw.githubusercontent.com/qclensja/qclenja-UWI/main/clia.json'];
  try{
    const ctl=typeof AbortController!=='undefined'?new AbortController():null,to=ctl?setTimeout(()=>ctl.abort(),6000):null;
    const r=await fetch(urls[0]+'?t='+Date.now(),{cache:'no-store',signal:ctl?ctl.signal:undefined});if(to)clearTimeout(to);
    if(!r.ok)throw new Error('http '+r.status);const j=await r.json();
    if(!j||!Array.isArray(j.e)||!j.e.length||!j.updated)throw new Error('bad file');
    if(String(j.updated)>String(CLIA_BUILTIN.updated)||String(j.checked||j.updated)>String(CLIA_BUILTIN.checked)){CLIA_DATA=j;CLIA_STATE={src:'repo',tried:true,msg:'Newer table loaded from the QCLens repository.'}}
    else CLIA_STATE={src:'built-in',tried:true,msg:'Checked the QCLens repository: this is the latest table.'};
  }catch(e){CLIA_STATE={src:'built-in',tried:true,msg:'Could not check for a newer table right now, so the built-in table is used.'}}
  if(CU&&S.tab==='sigma'&&!UI.modal)render();
}
