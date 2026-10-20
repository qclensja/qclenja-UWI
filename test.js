const fs=require('fs');eval(fs.readFileSync('p3.js','utf8')+`;globalThis.E={evaluate,isDue,zOf,statusOf,targetIndex}`);
const a={id:'a',name:'Na',targets:[{from:'2026-01-01',levels:[{mean:100,sd:2},{mean:200,sd:4}]}],schedule:{type:'weekdays',days:[1,3]}};
let id=0;const R=(date,lv,z)=>({id:'r'+(id++),aid:'a',lv,date,value:(lv?200:100)+z*(lv?4:2)});
const d=n=>'2026-02-'+String(n).padStart(2,'0');
const t=(name,rs,expect)=>{const f=E.evaluate(a,rs);const got=rs.map(r=>(f[r.id]||[]).map(x=>x.rule).join('+')||'-');const ok=JSON.stringify(got)===JSON.stringify(expect);console.log(ok?'PASS':'FAIL',name,ok?'':JSON.stringify(got))};
t('1-3s',[R(d(1),0,3.5)],['1-3s']);
t('1-2s',[R(d(1),0,2.5)],['1-2s']);
t('2-2s within level',[R(d(1),0,2.2),R(d(2),0,2.4)],['1-2s','1-2s+2-2s']);
t('2-2s across levels',[R(d(1),0,2.2),R(d(1),1,2.6)],['1-2s+2-2s','1-2s+2-2s']);
t('R-4s',[R(d(1),0,2.3),R(d(1),1,-2.3)],['1-2s+R-4s','1-2s+R-4s']);
t('4-1s',[0,1,2,3].map(i=>R(d(i+1),0,1.3)),['-','-','-','4-1s']);
t('10x',Array.from({length:10},(_,i)=>R(d(i+1),0,0.4)),['-','-','-','-','-','S6','S6','S6','S6','10x+S6']);
t('no flags',[R(d(1),0,0.5),R(d(2),0,-1.5),R(d(3),0,1.5),R(d(4),0,-.2)],['-','-','-','-']);
// lot change resets segment
const b=JSON.parse(JSON.stringify(a));b.targets.push({from:'2026-02-03',levels:[{mean:110,sd:2},{mean:200,sd:4}]});
const rs=[{id:'x1',aid:'a',lv:0,date:d(1),value:104.6},{id:'x2',aid:'a',lv:0,date:d(2),value:104.6},{id:'x3',aid:'a',lv:0,date:d(3),value:110.2}];
const f=E.evaluate(b,rs);console.log(Object.keys(f).length===2&&!f.x3?'PASS lot-change segment':'FAIL lot',JSON.stringify(f));
console.log(E.isDue(a,'2026-10-19'),E.isDue(a,'2026-10-20'));
