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
srv.close();
