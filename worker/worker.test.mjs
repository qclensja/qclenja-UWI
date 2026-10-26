import {start} from './devserver.mjs';
const srv=await start(8788);const U='http://localhost:8788';
const post=async(p,b)=>{const r=await fetch(U+p,{method:'POST',body:JSON.stringify(b)});return {s:r.status,j:await r.json()}};
const ok=(n,c)=>console.log((c?'PASS':'FAIL'),n);
let r=await post('/request',{name:'Ann',email:'ann@x.com'});ok('anon request on empty store',r.s===200);
r=await post('/request',{name:'Ann',email:'ann@x.com'});ok('duplicate ignored',r.j.duplicate===true);
r=await post('/request',{name:'',email:'bad'});ok('invalid rejected',r.s===400);
r=await post('/pull',{});ok('empty pull',r.j.empty===true&&r.j.data.requests.length===1);
const adm={id:'a1',username:'jaba',name:'J',role:'admin',active:true,pw:{salt:'SALT1',hash:'H1'}};
r=await post('/push',{data:{users:[adm]},sha:r.j.sha,boot:true});ok('boot push',r.s===200);
r=await post('/pull',{u:'jaba',hash:'bad'});ok('bad hash 401',r.s===401);
r=await post('/pull',{u:'jaba',hash:'H1'});ok('good pull, no hashes, request kept',r.s===200&&!r.j.data.users[0].pw&&r.j.data.requests.length===1&&r.j.me==='a1');
let sha=r.j.sha;
const tech={id:'t1',username:'tim',name:'Tim',email:'tim@x.com',role:'tech',active:true,mustChange:true};
const sal=await post('/salt',{u:'nobody'});ok('fake salt for unknown',typeof sal.j.salt==='string');
r=await post('/push',{u:'jaba',hash:'H1',sha,data:{users:[{...adm,pw:undefined},tech],results:[]},pwset:[{id:'t1',pw:{salt:'S2',hash:'H2'}}]});ok('admin creates user',r.s===200);
r=await post('/pull',{u:'tim@x.com',hash:'H2'});ok('tech logs in by email',r.s===200&&r.j.me==='t1');sha=r.j.sha;
// tech tries to make self admin and edit setup
r=await post('/push',{u:'tim@x.com',hash:'H2',sha,data:{users:[{...tech,role:'admin'},{...adm,role:'tech'}],results:[{id:'r1',aid:'x'}],setup:{done:true},rules:{'1-3s':false}}});ok('tech push ok',r.s===200);
r=await post('/pull',{u:'jaba',hash:'H1'});sha=r.j.sha;
ok('tech cannot change roles/setup/rules, results kept',r.j.data.users.find(u=>u.id==='t1').role==='tech'&&r.j.data.users.find(u=>u.id==='a1').role==='admin'&&!r.j.data.setup&&!r.j.data.rules&&r.j.data.results.length===1);
// stale sha
r=await post('/push',{u:'jaba',hash:'H1',sha:'old',data:{users:[adm]}});ok('stale sha 409',r.s===409);
// tech changes own password
r=await post('/push',{u:'tim@x.com',hash:'H2',sha,data:{users:[]},pwset:[{id:'t1',pw:{salt:'S3',hash:'H3'}},{id:'a1',pw:{salt:'X',hash:'HACK'}}]});ok('tech own pw change',r.s===200);
r=await post('/pull',{u:'jaba',hash:'HACK'});ok('tech cannot set admin pw',r.s===401);
r=await post('/pull',{u:'tim',hash:'H3'});ok('new pw works',r.s===200);
r=await post('/pull',{u:'tim',hash:'H2'});ok('old pw rejected',r.s===401);
r=await post('/pull',{u:'jaba',hash:'H1'});sha=r.j.sha;
r=await post('/push',{u:'jaba',hash:'H1',sha,data:{users:[{...adm,pw:undefined}],tomb:['t1']}});ok('admin deletes user',r.s===200);
r=await post('/pull',{u:'tim',hash:'H3'});ok('deleted user cannot sign in',r.s===401);
// ---- backups ----
r=await post('/backups',{u:'jaba',hash:'H1'});ok('backups list empty',r.s===200&&r.j.list.length===0);
r=await post('/backup-now',{u:'jaba',hash:'H1'});ok('backup now',r.s===200&&r.j.ok&&r.j.list.length===1&&/^qclens-backup-\d{4}-\d{2}-\d{2}\.json$/.test(r.j.name));
const bname=r.j.name;
r=await post('/backup-now',{u:'jaba',hash:'H1'});ok('same day overwrites',r.s===200&&r.j.list.length===1);
r=await post('/backup-get',{u:'jaba',hash:'H1',name:bname});ok('backup get strips hashes',r.s===200&&r.j.data.users.length===1&&!r.j.data.users[0].pw);
r=await post('/backup-get',{u:'jaba',hash:'H1',name:'../x.json'});ok('bad name rejected',r.s===400);
await post('/push',{u:'jaba',hash:'H1',sha:(await post('/pull',{u:'jaba',hash:'H1'})).j.sha,data:{users:[{...adm,pw:undefined},{id:'t9',username:'zed',name:'Z',role:'tech',active:true}]},pwset:[{id:'t9',pw:{salt:'S9',hash:'H9'}}]});
r=await post('/backups',{u:'zed',hash:'H9'});ok('non-admin refused',r.s===403);
r=await post('/backups',{u:'jaba',hash:'bad'});ok('bad password refused',r.s===401);
// retention: seed old files
const store=srv.store;
for(let i=1;i<=40;i++){const d='2026-0'+(i<=20?'1':'2')+'-'+String(i<=20?i:i-20).padStart(2,'0');store.files['backups/qclens-backup-'+d+'.json']={content:store.files['backups/'+bname].content,sha:'x'+i}}
r=await post('/backup-now',{u:'jaba',hash:'H1'});
const names=Object.keys(store.files).filter(k=>k.startsWith('backups/'));
ok('retention prunes to ~keep + monthly firsts',r.j.deleted>0&&names.length<=33&&names.includes('backups/qclens-backup-2026-01-01.json')&&names.includes('backups/qclens-backup-2026-02-01.json'));
ok('newest kept',names.includes('backups/'+bname));
// ---- quality manager: can save analyte changes like a supervisor, cannot change roles/rules ----
await post('/push',{u:'jaba',hash:'H1',sha:(await post('/pull',{u:'jaba',hash:'H1'})).j.sha,data:{users:[{...adm,pw:undefined},{id:'q1',username:'quin',name:'Q',role:'qm',active:true}],analytes:[{id:'an1',name:'X'}]},pwset:[{id:'q1',pw:{salt:'SQ',hash:'HQ'}}]});
r=await post('/pull',{u:'quin',hash:'HQ'});ok('qm signs in',r.s===200&&r.j.me==='q1');
r=await post('/push',{u:'quin',hash:'HQ',sha:r.j.sha,data:{users:[{id:'q1',username:'quin',name:'Q',role:'admin',active:true}],analytes:[{id:'an1',name:'X',sigma:{tea:10}}],rules:{'1-3s':false}}});ok('qm push ok',r.s===200);
r=await post('/pull',{u:'jaba',hash:'H1'});ok('qm analyte edit kept, role/rules not changed',r.j.data.analytes[0].sigma&&r.j.data.analytes[0].sigma.tea===10&&r.j.data.users.find(u=>u.id==='q1').role==='qm'&&!r.j.data.rules);
r=await post('/backups',{u:'quin',hash:'HQ'});ok('qm cannot use backups',r.s===403);
// ---- events: technologist can log and delete events but not delete anything else ----
await post('/push',{u:'jaba',hash:'H1',sha:(await post('/pull',{u:'jaba',hash:'H1'})).j.sha,data:{users:[{...adm,pw:undefined},{id:'t9',username:'zed',name:'Z',role:'tech',active:true}],analytes:[{id:'an1',name:'X'}],events:[{id:'ev0',type:'cal',date:'2026-10-01',dept:'d'}]},pwset:[{id:'t9',pw:{salt:'S9',hash:'H9'}}]});
r=await post('/pull',{u:'zed',hash:'H9'});
r=await post('/push',{u:'zed',hash:'H9',sha:r.j.sha,data:{users:[],events:[{id:'ev0',type:'cal',date:'2026-10-01',dept:'d'},{id:'ev1',type:'reg',date:'2026-10-02',dept:'d'}],analytes:[],tomb:['an1']}});ok('tech push with events',r.s===200);
r=await post('/pull',{u:'jaba',hash:'H1'});ok('tech event saved, tomb for analyte ignored',r.j.data.events.length===2&&r.j.data.analytes.length===1&&!(r.j.data.tomb||[]).includes('an1'));
const shE=r.j.sha;
r=await post('/push',{u:'zed',hash:'H9',sha:shE,data:{users:[],events:[{id:'ev1',type:'reg',date:'2026-10-02',dept:'d'}],tomb:['ev0']}});
r=await post('/pull',{u:'jaba',hash:'H1'});ok('tech can delete an event entry',r.j.data.events.length===1&&r.j.data.events[0].id==='ev1'&&r.j.data.tomb.includes('ev0'));
srv.close();
