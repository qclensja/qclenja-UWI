/* ===== Excel export ===== */
const LIGHT={zone1:'#F2F6F7',zone2:'#FBF3DF',zone3:'#FBE6E3',accent:'#0B6E78',muted:'#55666F',ink:'#15222B',surface:'#FFFFFF',bad:'#BF3A2D',warn:'#A35F00',grid:'#E1E7EA'};
const EXCSS='text{font-family:Menlo,Consolas,monospace;font-size:11px;fill:#55666F}.mean{stroke:#0B6E78;stroke-width:1.6}.s1{stroke:#55666F;stroke-width:1;stroke-dasharray:2 4}.s2{stroke:#A35F00;stroke-width:1.2;stroke-dasharray:6 4}.s3{stroke:#BF3A2D;stroke-width:1.4}.line{stroke:#15222B;stroke-width:1.5;fill:none;opacity:.55}.pt{fill:#0B6E78;stroke:#fff;stroke-width:2}.pt.w{fill:#A35F00}.pt.r{fill:#BF3A2D}.pt.ov{fill:#fff;stroke:#BF3A2D;stroke-width:2.5}.ring{fill:none;stroke:#BF3A2D;stroke-width:2}.lotline{stroke:#0B6E78;stroke-width:1.2;stroke-dasharray:3 3}.sp-t{fill:#A35F00;opacity:.16;stroke:#A35F00;stroke-dasharray:4 3}.sp-s{fill:#BF3A2D;opacity:.1;stroke:#BF3A2D;stroke-dasharray:4 3}.spl{font-weight:600}.spl-t{fill:#A35F00}.spl-s{fill:#BF3A2D}text.lm{fill:#0B6E78}text.l3{fill:#BF3A2D}text.l2{fill:#A35F00}';
function svgToPng(svg){
  const body=svg.replace(/var\(--([a-z0-9]+)\)/g,(m,k)=>LIGHT[k]||'#000');
  const doc=`<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}"><style>${EXCSS}</style><rect width="${CW}" height="${CH}" fill="#fff"/>${body.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</svg>`;
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>{const c=document.createElement('canvas');c.width=CW*2;c.height=CH*2;const x=c.getContext('2d');x.scale(2,2);x.drawImage(img,0,0);
      c.toBlob(b=>b?b.arrayBuffer().then(res,rej):rej(new Error('png')),'image/png')};
    img.onerror=()=>rej(new Error('img'));
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(doc);
  });
}
async function buildWorkbook(list){
  if(!window.ExcelJS)throw new Error('The Excel library did not load. Check your connection and try again.');
  const wb=new ExcelJS.Workbook(),flags=allFlags(),names=new Set();
  const sn=s=>{let b=s.replace(/[\\\/?*\[\]:]/g,'').slice(0,28),n=b,i=2;while(names.has(n.toLowerCase()))n=b+' '+(i++);names.add(n.toLowerCase());return n};
  const hdr=(row)=>{row.font={bold:true,color:{argb:'FFFFFFFF'}};row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0B6E78'}};row.alignment={vertical:'middle',wrapText:true}};
  const sum=wb.addWorksheet(sn('Summary'));
  sum.addRow(['QCLens export']).font={bold:true,size:14};
  [['Laboratory',S.setup.lab],['Department'+(deptList().length>1?'s':''),deptList().map(d=>d.dept).join(', ')],['Sub-department',deptList().map(d=>d.sub).filter(Boolean).join(', ')||'None'],['Analyser'+(multiInst()?'s':''),analyserName()],['Exported',new Date().toLocaleString()],['Exported by',CU?CU.name:'']].forEach(r=>sum.addRow(r));
  sum.addRow([]);
  try{const lid=wb.addImage({base64:LOGO,extension:'png'});sum.addImage(lid,{tl:{col:5,row:0},ext:{width:160,height:120}})}catch(e){}
  for(const a of list){
    sum.addRow([a.name+' ('+a.unit+')',(deptList().length>1?deptOfA(a).dept+' · ':'')+(multiInst()?'Analyser: '+instLabel(a)+' · ':'')+'Schedule: '+scheduleText(a)]).font={bold:true};
    hdr(sum.addRow(['Effective from','QC material','Lot','Expiry','Reason','Level','Mean','SD','-3SD','-2SD','-1SD','+1SD','+2SD','+3SD','Comment']));
    a.targets.forEach(t=>t.levels.slice(0,a.nlev).forEach((l,i)=>sum.addRow([t.from,l.material||'',l.lot||'',l.exp||'',t.type||'Initial targets',levelName(i),l.mean,l.sd,...[-3,-2,-1,1,2,3].map(k=>+(l.mean+k*l.sd).toFixed(4)),t.comment||''])));
    S.skips.filter(s=>s.aid===a.id).sort((x,y)=>x.date<y.date?-1:1).forEach(s=>sum.addRow(['Not performed',s.date,s.reason||'',s.byName||'']));
    sum.addRow([]);
  }
  sum.columns.forEach(c=>c.width=15);sum.getColumn(1).width=26;sum.getColumn(2).width=26;sum.getColumn(15).width=50;
  for(const a of list){
    for(let lv=0;lv<a.nlev;lv++){
      const ws=wb.addWorksheet(sn(a.name+' '+levelName(lv)));
      let png=null;try{png=await svgToPng(ljSVG(a,lv,flags,0,true).svg)}catch(e){}
      if(png){const id=wb.addImage({buffer:png,extension:'png'});ws.addImage(id,{tl:{col:0,row:0},ext:{width:CW,height:CH}})}
      const start=png?21:1;
      ws.getCell(start-1,1).value=a.name+' · '+levelName(lv)+' · '+a.unit+(multiInst()?' · '+instLabel(a):'')+' · Levey-Jennings data';ws.getCell(start-1,1).font={bold:true};
      const h=ws.getRow(start);h.values=['Date','QC material','Lot','Value','Mean','SD','-3SD','-2SD','-1SD','+1SD','+2SD','+3SD','SD index (z)','Status','Rules','Override comment','Override by','Override at','Entered by','Entered at','Last edited by','Last edited at','Previous values'];hdr(h);
      S.results.filter(r=>r.aid===a.id&&r.lv===lv).sort((x,y)=>x.date<y.date?-1:1).forEach(r=>{
        const t=targetFor(a,r.date),l=t.levels[lv],f=flags[r.id]||[],st=statusOf(flags,r);
        const row=ws.addRow([r.date,l.material||'',l.lot||'',r.value,l.mean,l.sd,...[-3,-2,-1,1,2,3].map(k=>+(l.mean+k*l.sd).toFixed(4)),+zOf(a,r).toFixed(3),st==='ok'?'In control':st==='warn'?'Warning':st==='ov'?'Overridden':'Reject',f.map(x=>RULES[x.rule].name).join(', '),r.ov?r.ov.comment:'',r.ov?(r.ov.byName||''):'',r.ov?fmtTs(r.ov.at):'',r.byName||'',fmtTs(r.at),r.upd?r.upd.byName:'',r.upd?fmtTs(r.upd.at):'',(r.hist||[]).map(h=>h.value+' ('+(h.byName||'unknown')+' '+fmtTs(h.at)+(h.reason?'; changed because: '+h.reason:'')+')').join('; ')]);
        if(st==='rej')row.getCell(14).font={color:{argb:'FFBF3A2D'},bold:true};
      });
      ws.columns.forEach(c=>c.width=13);ws.getColumn(2).width=24;ws.getColumn(16).width=50;ws.getColumn(15).width=16;for(let c=17;c<=23;c++)ws.getColumn(c).width=20;ws.getColumn(23).width=50;
    }
  }
  return wb;
}
async function exportXlsx(list,filename){
  const dl=await getDl();
  if(!dl){toast('Saving files is not available in this view. Open the app in claude.ai to export.');return}
  toast('Preparing Excel file…');
  try{
    const wb=await buildWorkbook(list),buf=await wb.xlsx.writeBuffer();
    await dl.save({filename,data:buf});toast('Excel file ready.');
  }catch(e){toast(e&&e.code==='declined'?'Save cancelled.':(e&&e.message)||'Export failed.')}
}
async function backupJson(){
  const dl=await getDl();if(!dl){toast('Saving files is not available in this view.');return}
  try{await dl.save({filename:'qclens-backup-'+todayStr()+'.json',data:JSON.stringify(S,null,1)});toast('Backup saved.')}catch(e){toast(e&&e.code==='declined'?'Save cancelled.':'Backup failed.')}
}
