/* ===== Catalogue: departments, analysers, modules, routine panels ===== */
const P=(name,r,list)=>({name,routine:!!r,items:list.split(';').map(s=>{const [n,u]=s.split('|');return {name:n.trim(),unit:(u||'').trim()}})});
const CAT={
 'Clinical Chemistry':{
  analysers:['Roche Cobas Pro','Roche cobas c 503','Roche cobas c 311','Roche cobas c 501','Roche cobas c 702','Abbott Alinity c','Abbott ARCHITECT c series','Siemens Atellica CH','Siemens Dimension EXL','Beckman Coulter AU480','Beckman Coulter AU680','Beckman Coulter AU5800','Mindray BS-2000M','Mindray BS-800M','Ortho Clinical Diagnostics VITROS','Randox RX series','Other'],
  subs:{
   'Routine Chemistry':[
    P('Renal function',1,'Urea|mmol/L;Creatinine|µmol/L;Uric acid|µmol/L;Sodium|mmol/L;Potassium|mmol/L;Chloride|mmol/L;Bicarbonate|mmol/L'),
    P('Liver function',1,'ALT|U/L;AST|U/L;ALP|U/L;GGT|U/L;Total bilirubin|µmol/L;Direct bilirubin|µmol/L;Albumin|g/L;Total protein|g/L'),
    P('Glucose & diabetes',1,'Glucose|mmol/L;HbA1c|%'),
    P('Lipid profile',1,'Total cholesterol|mmol/L;HDL cholesterol|mmol/L;LDL cholesterol|mmol/L;Triglycerides|mmol/L'),
    P('Bone & minerals',0,'Calcium|mmol/L;Phosphate|mmol/L;Magnesium|mmol/L'),
    P('Cardiac & muscle',0,'CK|U/L;CK-MB|U/L;LDH|U/L;Troponin I|ng/L'),
    P('Specific proteins',0,'CRP|mg/L;Rheumatoid factor|IU/mL;IgG|g/L;C3|g/L;C4|g/L')],
   'Electrolytes / ISE':[P('Electrolytes',1,'Sodium|mmol/L;Potassium|mmol/L;Chloride|mmol/L')],
   'Therapeutic drugs':[P('Drug monitoring',1,'Digoxin|nmol/L;Lithium|mmol/L;Phenytoin|µmol/L;Valproic acid|µmol/L;Paracetamol|µmol/L')]}},
 'Immunochemistry':{
  analysers:['Roche Cobas Pro','Roche cobas e 411','Roche cobas e 601','Roche cobas e 801','Abbott Alinity i','Abbott ARCHITECT i series','Siemens Atellica IM','Siemens ADVIA Centaur XP','Siemens ADVIA Centaur XPT','Beckman Coulter Access 2','Beckman Coulter DxI 800','Mindray CL-1200i','Mindray CL-2000i','Snibe MAGLUMI series','DiaSorin LIAISON XL','Ortho VITROS ECi','Other'],
  subs:{'Immunoassay / Endocrine':[
    P('Thyroid',1,'TSH|mIU/L;Free T4|pmol/L;Free T3|pmol/L'),
    P('Cardiac biomarkers',1,'Troponin T hs|ng/L;Troponin I|ng/L;NT-proBNP|pg/mL;CK-MB mass|µg/L'),
    P('Reproductive hormones',0,'FSH|IU/L;LH|IU/L;Prolactin|mIU/L;Estradiol|pmol/L;Progesterone|nmol/L;Testosterone|nmol/L;hCG|IU/L'),
    P('Tumour markers',0,'PSA|ng/mL;CEA|ng/mL;AFP|ng/mL;CA 125|U/mL;CA 19-9|U/mL'),
    P('Vitamins & iron',0,'Vitamin D|nmol/L;Vitamin B12|pmol/L;Folate|nmol/L;Ferritin|µg/L'),
    P('Other hormones',0,'Cortisol|nmol/L;PTH|pmol/L;Insulin|mIU/L'),
    P('Infectious disease markers',0,'HIV Ag/Ab|COI;HBsAg|COI;Anti-HCV|COI;Syphilis|COI')]}},
 'Haematology':{
  analysers:['Sysmex XN-1000','Sysmex XN-2000','Sysmex XN-3000','Sysmex XN-550','Sysmex XP-300','Beckman Coulter DxH 500','Beckman Coulter DxH 520','Beckman Coulter DxH 800','Beckman Coulter DxH 900','Abbott Alinity h','Mindray BC-6800','Mindray BC-7500','HORIBA Yumizen H series','Siemens ADVIA 2120i','Nihon Kohden Celltac series','Other'],
  subs:{'Full blood count':[
    P('Red cell indices',1,'WBC|×10⁹/L;RBC|×10¹²/L;Hemoglobin|g/dL;Hematocrit|%;MCV|fL;MCH|pg;MCHC|g/dL;RDW|%'),
    P('Platelets',1,'Platelets|×10⁹/L;MPV|fL'),
    P('Differential',0,'Neutrophils|%;Lymphocytes|%;Monocytes|%;Eosinophils|%;Basophils|%'),
    P('Reticulocytes',0,'Reticulocytes|%')]}},
 'Coagulation':{
  analysers:['Sysmex CS-2500','Sysmex CS-5100','Sysmex CN-3000','Sysmex CN-6000','Werfen ACL TOP 350','Werfen ACL TOP 550','Werfen ACL TOP 750','Stago STA Compact Max','Stago STA R Max','Stago STA Satellite','Siemens BCS XP','Helena C-2','Other'],
  subs:{'Coagulation':[
    P('Routine coagulation',1,'PT|s;INR|;APTT|s;Fibrinogen|g/L'),
    P('Special coagulation',0,'D-dimer|mg/L FEU;Thrombin time|s;Anti-Xa|IU/mL;Antithrombin|%;Factor VIII|%;Factor IX|%')]}},
 'Blood Gas & Electrolytes':{
  analysers:['Radiometer ABL90 FLEX','Radiometer ABL800 FLEX','Werfen GEM Premier 3500','Werfen GEM Premier 5000','Siemens RAPIDPoint 500','Siemens RAPIDPoint 500e','Roche cobas b 123','Nova Biomedical Stat Profile Prime Plus','Abbott i-STAT Alinity','Other'],
  subs:{'Blood gas':[P('Blood gas',1,'pH|;pCO2|mmHg;pO2|mmHg;Bicarbonate|mmol/L'),P('Electrolytes & metabolites',1,'Sodium|mmol/L;Potassium|mmol/L;Chloride|mmol/L;Ionised calcium|mmol/L;Glucose|mmol/L;Lactate|mmol/L'),P('Co-oximetry',0,'Total Hb|g/dL;SO2|%;COHb|%;MetHb|%;O2Hb|%;HHb|%')]}},
 'Microbiology':{
  analysers:['bioMérieux VITEK 2','bioMérieux VITEK 2 Compact','BD Phoenix M50','Beckman Coulter MicroScan WalkAway','bioMérieux BacT/ALERT','bioMérieux BacT/ALERT VIRTUO','BD BACTEC FX','Bruker MALDI Biotyper','bioMérieux BIOFIRE FilmArray','Other'],
  subs:{'Identification & AST':[P('AST quality control (MIC)',0,'E. coli ATCC 25922 MIC|µg/mL;S. aureus ATCC 29213 MIC|µg/mL;P. aeruginosa ATCC 27853 MIC|µg/mL;E. faecalis ATCC 29212 MIC|µg/mL')],
   'Blood culture':[P('Blood culture instrument',1,'Time to positivity|h')]}},
 'Molecular Diagnostics':{
  analysers:['Roche cobas 5800','Roche cobas 6800','Roche cobas 8800','Abbott m2000','Abbott Alinity m','Cepheid GeneXpert','Hologic Panther','BD MAX','Qiagen QIAsymphony','Bio-Rad CFX96','Applied Biosystems QuantStudio','Other'],
  subs:{'Viral load':[P('Viral load',1,'HIV-1 RNA|log copies/mL;HBV DNA|log IU/mL;HCV RNA|log IU/mL;CMV DNA|log IU/mL')],
   'Respiratory pathogens':[P('Respiratory panel',1,'SARS-CoV-2 Ct|Ct;Influenza A Ct|Ct;Influenza B Ct|Ct;RSV Ct|Ct')],
   'Other PCR':[P('Infectious disease PCR',0,'MTB Ct|Ct;Chlamydia/Gonorrhoea Ct|Ct;HPV Ct|Ct')]}},
 'Urinalysis':{
  analysers:['Sysmex UN-Series','Roche cobas u 601','Roche cobas u 701','Siemens CLINITEK Novus','Beckman Coulter iRICELL','Mindray EU-5600','ARKRAY AUTION MAX','Other'],
  subs:{'Urine chemistry':[P('Dipstick chemistry',1,'Protein|;Glucose|;Blood|;Leukocytes|;Nitrite|;Specific gravity|;pH|;Ketones|')],
   'Urine sediment':[P('Sediment',1,'RBC|/µL;WBC|/µL;Epithelial cells|/µL;Casts|/µL;Bacteria|/µL')]}},
 'Other Common Analysers':{
  analysers:['Other'],
  subAn:{'HbA1c':['Bio-Rad D-100','Tosoh HLC-723 series','Other'],'ESR':['Diesse Ves-Matic','Alifax Roller 20','Other'],'Immunohaematology':['Ortho Vision','Bio-Rad IH-1000','Grifols Erytra','Other'],
   'Therapeutic drug monitoring':['Roche cobas systems','Abbott ARCHITECT systems','Siemens systems','Other'],'Osmolality':['Advanced Instruments OsmoPRO','Advanced Instruments 3320','Other'],
   'Haemoglobin electrophoresis':['Sebia Capillarys','Bio-Rad Variant II','Other'],'Protein electrophoresis':['Sebia Capillarys','Sebia Hydrasys','Other'],
   'Faecal immunochemical testing (FIT)':['Automated FIT system','Other'],'Specialised proteins & inflammation':['Beckman Coulter systems','Siemens systems','Other chemistry / immunoassay platform','Other']},
  subs:{'HbA1c':[P('HbA1c',1,'HbA1c|%;HbA1c (IFCC)|mmol/mol')],
   'ESR':[P('Sedimentation',1,'ESR|mm/hr')],
   'Immunohaematology':[P('Blood grouping & compatibility',1,'ABO group|;Rh(D)|;Antibody screen|;Direct antiglobulin test|')],
   'Therapeutic drug monitoring':[P('Drug monitoring',1,'Digoxin|nmol/L;Lithium|mmol/L;Phenytoin|µmol/L;Valproic acid|µmol/L;Carbamazepine|µmol/L;Vancomycin|mg/L;Gentamicin|mg/L;Tacrolimus|µg/L;Cyclosporine|µg/L')],
   'Osmolality':[P('Osmolality',1,'Serum osmolality|mmol/kg;Urine osmolality|mmol/kg')],
   'Haemoglobin electrophoresis':[P('Haemoglobin fractions',1,'HbA|%;HbA2|%;HbF|%;HbS|%;HbC|%')],
   'Protein electrophoresis':[P('Serum protein fractions',1,'Albumin fraction|%;Alpha-1|%;Alpha-2|%;Beta|%;Gamma|%;M-protein|g/L')],
   'Faecal immunochemical testing (FIT)':[P('Occult blood',1,'Faecal haemoglobin|ng/mL')],
   'Specialised proteins & inflammation':[P('Inflammation markers',1,'CRP|mg/L;hs-CRP|mg/L;Procalcitonin|ng/mL'),P('Specific proteins',0,'IgG|g/L;IgA|g/L;IgM|g/L;C3|g/L;C4|g/L;Ceruloplasmin|g/L;Haptoglobin|g/L;Transferrin|g/L;Alpha-1 antitrypsin|g/L;Beta-2 microglobulin|mg/L;Cystatin C|mg/L')]}},
 'Other / Custom':{analysers:['Other'],subs:{'Custom':[]}}
};
const DEPTS=Object.keys(CAT);
const catOf=d=>CAT[d]||CAT['Other / Custom'];
const isBuiltin=d=>!!CAT[d]&&d!=='Other / Custom';
const dsub=s=>s?' · '+s:'';
const defSub=d=>isBuiltin(d)?Object.keys(CAT[d].subs)[0]:'';
/* modules installed on a analyser; the user can tick the ones fitted and add their own */
const AMODS={
 'Roche Cobas Pro':['ISE','c 503','c 703','e 801'],
 'Roche cobas c 311':['Photometric','ISE'],'Roche cobas c 501':['Photometric','ISE'],'Roche cobas c 702':['Photometric','ISE'],
 'Beckman Coulter AU480':['Photometric','ISE'],'Beckman Coulter AU680':['Photometric','ISE'],'Beckman Coulter AU5800':['Photometric','ISE'],
 'Radiometer ABL800 FLEX':['Blood gas','Electrolytes','Metabolites','Co-oximetry'],'Radiometer ABL90 FLEX':['Blood gas','Electrolytes','Metabolites','Co-oximetry'],
 'Sysmex UN-Series':['UC-3500 (chemistry)','UF-5000 (sediment)']
};
const anListFor=(dept,sub)=>{const d=CAT[dept]||{analysers:['Other']};return (d.subAn&&d.subAn[sub])||d.analysers};
/* dropdown: this department's analysers first, then every other analyser grouped by department */
function anOptions(dept,sub,selected){
  const mine=anListFor(dept,sub).filter(n=>n!=='Other'),seen=new Set(mine),opt=n=>`<option${n===selected?' selected':''}>${esc(n)}</option>`;
  let h=`<option value="">Choose analyser…</option><optgroup label="${esc(dept)}${CAT[dept]&&CAT[dept].subAn?' · '+esc(sub):''} (suggested)">${mine.map(opt).join('')}</optgroup>`;
  Object.entries(CAT).forEach(([d,v])=>{if(d==='Other / Custom')return;const names=[...new Set([...(v.analysers||[]),...Object.values(v.subAn||{}).flat()])].filter(n=>n!=='Other'&&!seen.has(n));
    if(names.length)h+=`<optgroup label="${esc(d)}">${names.map(opt).join('')}</optgroup>`});
  return h+`<option${selected==='Other'?' selected':''}>Other</option>`;
}
const baseName=n=>{n=String(n);const m=/^(.*) \(([^)]*)\)$/.exec(n);return m&&(/^\d+$/.test(m[2])||AMODS[m[1]]!==undefined)?m[1]:n};
/* departments/sub-departments renamed or moved since earlier versions */
const MIGRATE=[['Blood Gas & POCT',null,'Blood Gas & Electrolytes',null],['Haematology','Coagulation','Coagulation','Coagulation'],['Haematology','ESR','Other Common Analysers','ESR'],['Clinical Chemistry','Immunoassay / Endocrine','Immunochemistry','Immunoassay / Endocrine']];
function migDept(o){if(!o||!o.dept)return;for(const [d,s,nd,ns] of MIGRATE){if(o.dept===d&&(s===null||o.sub===s)){o.dept=nd;if(ns)o.sub=ns;break}}}

/* ===== State ===== */
const KEY='ljqc.v1';
let mem=null;
const blank=()=>({v:1,tab:'today',setup:{done:false,step:1,lab:'',dept:'Clinical Chemistry',sub:'Routine Chemistry',analyser:'',analyserOther:'',analysers:[],amods:{},cur:'',nlev:2,sel:{},selFor:'',units:{},cpanels:[],padd:{}},depts:[],analytes:[],events:[],trash:[],results:[],skips:[],lots:[],users:[],audit:[],est:[],tomb:[],requests:[],perms:{},permsAt:'',materials:[],drules:{},drulesAt:{}});
const UNITS=['mmol/L','µmol/L','mg/dL','mg/L','g/L','g/dL','U/L','IU/L','mIU/L','µIU/mL','ng/mL','ng/dL','ng/L','pg/mL','pmol/L','nmol/L','mEq/L','%','fL','pg','×10⁹/L','×10¹²/L','/µL','s','mm/hr','mmHg','kPa','mL/min','Ct','log copies/mL','log IU/mL','COI','h','µg/mL','µg/L','mmol/kg','mmol/mol','ng/mL','mg/L FEU'];
const emptyLevel=()=>({mean:null,sd:null,material:'',lot:'',exp:''});
/* change stamps: every analyte, department and limits set remembers when it last changed, so an out-of-date copy on another device can never overwrite a newer edit */
const canonS=v=>Array.isArray(v)?'['+v.map(canonS).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).filter(k=>k!=='_h'&&k!=='modAt').sort().map(k=>JSON.stringify(k)+':'+canonS(v[k])).join(',')+'}':JSON.stringify(v);
const shash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)+s.length.toString(36)};
function initHashes(o){['analytes','depts','est','materials','events'].forEach(k=>(o[k]||[]).forEach(x=>{if(x._h===undefined)x._h=shash(canonS(x))}));return o}
const ANMIG={'Roche cobas pro':'Roche Cobas Pro'};
function migAnalysers(o){
  const fx=n=>ANMIG[n]||n,fixRec=r=>{if(!r)return;if(Array.isArray(r.analysers))r.analysers=r.analysers.map(fx);if(r.analyser)r.analyser=fx(r.analyser);if(r.amods)Object.keys(r.amods).forEach(k=>{if(ANMIG[k]){if(!r.amods[ANMIG[k]])r.amods[ANMIG[k]]=r.amods[k];delete r.amods[k]}})};
  fixRec(o.setup);(o.depts||[]).forEach(fixRec);(o.analytes||[]).forEach(a=>{if(a&&ANMIG[a.inst])a.inst=ANMIG[a.inst]});
  (o.trash||[]).forEach(t=>{const d=t.data||{};fixRec(d.dept);(d.analytes||[]).forEach(a=>{if(a&&ANMIG[a.inst])a.inst=ANMIG[a.inst]})});
}
const APPV=1;
function norm(o){
  o.appv=Math.max(+o.appv||0,APPV);
  o.users=o.users||[];o.events=o.events||[];o.trash=o.trash||[];trashPurge(o);o.audit=o.audit||[];o.est=o.est||[];o.tomb=o.tomb||[];o.requests=o.requests||[];o.perms=o.perms||{};o.materials=o.materials||[];o.drules=o.drules||{};o.drulesAt=o.drulesAt||{};o.permsAt=o.permsAt||'';o.rules=o.rules||{};o.rulesAt=o.rulesAt||'';o.skips=o.skips||[];o.results=o.results||[];
  const st=o.setup||(o.setup={});
  st.amods=st.amods||{};migAnalysers(o);migDept(st);(o.depts||[]).forEach(d=>{migDept(d);d.amods=d.amods||{}});
  st.units=st.units||{};st.padd=st.padd||{};st.cpanels=st.cpanels||[];
  if(st.custom&&st.custom.length){st.cpanels.push({id:Math.random().toString(36).slice(2,9),name:'Custom analytes',items:st.custom.map(c=>({name:c.name,unit:c.unit||'',on:c.on}))});}
  delete st.custom;
  if(!Array.isArray(st.analysers)){const n=st.analyser==='Other'?(st.analyserOther||'Other analyser'):st.analyser;st.analysers=n?[n]:[]}
  o.depts=o.depts||[];
  if(!o.depts.length&&((o.analytes||[]).length||st.done)){const id=Math.random().toString(36).slice(2,9);st.cur=id;o.depts.push({id})}
  if(st.cur&&!o.depts.some(d=>d.id===st.cur))o.depts.push({id:st.cur});
  o.depts.forEach(d=>{if(d.id===st.cur&&d.dept===undefined)Object.assign(d,{dept:st.dept,sub:st.sub,analysers:st.analysers.slice(),amods:st.amods,sel:st.sel,selFor:st.selFor,cpanels:st.cpanels});d.analysers=d.analysers||[];d.sel=d.sel||{};d.cpanels=d.cpanels||[]});
  (o.analytes||[]).forEach(a=>{
    if(!a.dept)a.dept=st.cur;
    if(!a.inst)a.inst=st.analysers[0]||'';
    if(!a.nlev)a.nlev=(o.setup&&o.setup.nlev)||2;
    a.targets.forEach(t=>{t.levels.forEach(l=>{if(l.material==null)l.material=t.material||a.material||'';if(l.lot==null)l.lot=t.lot||'';if(l.exp==null)l.exp=''});while(t.levels.length<a.nlev)t.levels.push(emptyLevel())});
  });
  return initHashes(o);
}
function load(){
  try{const s=localStorage.getItem(KEY);if(s)return norm(JSON.parse(s))}catch(e){}
  return mem?norm(JSON.parse(mem)):blank();
}
let S=load();
function stampMods(){
  const now=new Date().toISOString();
  ['analytes','depts','est','materials','events'].forEach(k=>(S[k]||[]).forEach(x=>{const h=shash(canonS(x));if(x._h===undefined)x._h=h;else if(x._h!==h){x._h=h;x.modAt=now}}));
}
function save(){
  try{syncCtx()}catch(e){}
  try{stampMods()}catch(e){}
  const j=JSON.stringify(S);mem=j;
  try{localStorage.setItem(KEY,j)}catch(e){}
  try{ghQueue()}catch(e){}
}
/* file saving: claude.ai provides downloads; on a normal web page (for example GitHub Pages) fall back to a browser download */
async function getDl(){
  try{if(typeof claude!=='undefined'&&claude&&claude.use){const d=await claude.use('downloads');if(d)return d}}catch(e){}
  return {save:async({filename,data})=>{
    const t=/\.xlsx$/i.test(filename)?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':/\.json$/i.test(filename)?'application/json':'application/octet-stream';
    const u=URL.createObjectURL(new Blob([data],{type:t})),a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}};
}
const uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:null};
const fmt=(v,dp)=>{if(v==null||isNaN(v))return '–';const a=Math.abs(v);const d=dp!=null?dp:(a>=1000?0:a>=100?1:a>=10?2:3);return (+v).toFixed(d)};
const decs=a=>{const t=curTarget(a).levels[0];const m=Math.abs(t.mean||0),s=t.sd||1;const k=Math.max(0,1-Math.floor(Math.log10(s||1)));return Math.min(4,Math.max(0,k))};
const pickedName=()=>S.setup.analyser==='Other'?(S.setup.analyserOther||'').trim():S.setup.analyser;
const allInst=()=>{const out=[],cur=S.setup.cur;(S.depts||[]).forEach(d=>(d.id===cur?S.setup.analysers:d.analysers||[]).forEach(n=>out.push(n)));if(!(S.depts||[]).some(d=>d.id===cur))(S.setup.analysers||[]).forEach(n=>out.push(n));return out};
const analyserName=()=>{const l=allInst();return l.length?l.join(', '):(pickedName()||'No analyser')};
const multiInst=()=>allInst().length>1||S.analytes.some(a=>a.mod);
const ctxMulti=()=>(S.setup.analysers||[]).length>1||(S.setup.analysers||[]).some(n=>((S.setup.amods||{})[n]||[]).length>0);
const instLabel=a=>instOf(a)+(a.mod?' · '+a.mod:'');
function curId(){const st=S.setup;S.depts=S.depts||[];if(!st.cur||!S.depts.some(d=>d.id===st.cur)){if(!st.cur)st.cur=uid();S.depts.push({id:st.cur})}return st.cur}
function syncCtx(){const st=S.setup;if(!st.cur&&!S.analytes.length&&!st.done&&!S.depts.length)return;const id=curId(),r=S.depts.find(d=>d.id===id);Object.assign(r,{dept:st.dept,sub:st.sub,analysers:st.analysers,amods:st.amods,sel:st.sel,selFor:st.selFor,cpanels:st.cpanels})}
function loadCtx(id){const r=S.depts.find(d=>d.id===id);if(!r)return;Object.assign(S.setup,{cur:id,dept:r.dept,sub:r.sub,analysers:r.analysers||[],amods:r.amods||{},sel:r.sel||{},selFor:r.selFor||'',cpanels:r.cpanels||[],analyser:'',analyserOther:''})}
const DA=()=>S.analytes.filter(a=>a.dept===S.setup.cur);
const canSeeD=id=>!CU||CU.role==='admin'||!Array.isArray(CU.depts)||CU.depts.includes(id);
const canSee=a=>canSeeD(a.dept);
const VA=()=>S.analytes.filter(canSee);
const VAL=()=>VA().filter(a=>!a.off);   /* visible and not disabled */
const VR=()=>{const ok=new Set(VA().map(a=>a.id));return S.results.filter(r=>ok.has(r.aid))};
const deptList=()=>{syncCtx();return(S.depts||[]).filter(d=>d.dept)};
const visDepts=()=>deptList().filter(d=>canSeeD(d.id));
const analyserNameV=()=>{const l=visDepts().flatMap(d=>d.analysers||[]);return l.length?l.join(', '):analyserName()};
const deptOfA=a=>(S.depts||[]).find(d=>d.id===a.dept)||{};
const instOf=a=>a.inst||(S.setup.analysers||[])[0]||'';
const instTag=a=>multiInst()?` <span class="chip">${esc(instLabel(a))}</span>`:'';
function expInfo(exp,on){
  if(!exp)return {st:'none',days:null};
  const t=new Date((on||todayStr())+'T00:00:00'),e=new Date(exp+'T00:00:00'),d=Math.round((e-t)/864e5);
  return {st:d<0?'expired':d<=30?'soon':'ok',days:d};
}
function expChip(exp,on){
  const i=expInfo(exp,on);
  if(i.st==='none')return '<span class="chip warn">No expiry date</span>';
  const txt=i.st==='expired'?'Expired '+fmtDate(exp):i.st==='soon'?(i.days===0?'Expires today':'Expires in '+i.days+' day'+(i.days===1?'':'s'))+' · '+fmtDate(exp):'Expires '+fmtDate(exp);
  return `<span class="chip ${i.st==='expired'?'bad':i.st==='soon'?'warn':''}">${txt}</span>`;
}
const levelName=i=>'Level '+(i+1);
let toastT;
function toast(msg){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3500)}
