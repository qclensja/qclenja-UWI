/* QCLens sync service (Cloudflare Worker). Holds the GitHub token as a secret so devices never need one.
   Secrets / variables: GH_TOKEN (secret), GH_OWNER, GH_REPO, GH_PATH (default qclens-data.json), GH_BRANCH (default main). */
const enc=new TextEncoder(),dec=new TextDecoder();
const b64e=t=>{const b=enc.encode(t);let s='';for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s)};
const b64d=t=>{const s=atob(t.replace(/\s/g,'')),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return dec.decode(b)};
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'};
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'Content-Type':'application/json',...CORS}});
const gh=(env,q,init)=>fetch('https://api.github.com/repos/'+env.GH_OWNER+'/'+env.GH_REPO+'/contents/'+(env.GH_PATH||'qclens-data.json')+(q||''),{...init,headers:{Authorization:'Bearer '+env.GH_TOKEN,Accept:'application/vnd.github+json','User-Agent':'qclens-sync','X-GitHub-Api-Version':'2022-11-28',...((init&&init.headers)||{})}});
async function load(env){
  const q='?ref='+encodeURIComponent(env.GH_BRANCH||'main');
  const r=await gh(env,q);if(r.status===404)return {data:null,sha:null};if(!r.ok)throw new Error('GitHub '+r.status);
  const j=await r.json();let t;
  if(j.content&&j.encoding==='base64')t=b64d(j.content);else{const r2=await gh(env,q,{headers:{Accept:'application/vnd.github.raw+json'}});if(!r2.ok)throw new Error('GitHub '+r2.status);t=await r2.text()}
  return {data:JSON.parse(t),sha:j.sha};
}
async function store(env,data,sha,msg){
  const body={message:msg||'QCLens data '+new Date().toISOString(),content:b64e(JSON.stringify(data)),branch:env.GH_BRANCH||'main'};if(sha)body.sha=sha;
  const r=await gh(env,'',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(r.status===409||r.status===422)return {conflict:true};
  if(!r.ok)throw new Error('GitHub '+r.status);const j=await r.json();return {sha:j.content&&j.content.sha};
}
const hasUsers=d=>!!(d&&Array.isArray(d.users)&&d.users.length);
const same=(a,b)=>{a=String(a||'');b=String(b||'');if(a.length!==b.length||!a)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0};
const findUser=(d,u)=>{u=String(u||'').trim().toLowerCase();return (d.users||[]).find(x=>x.username===u||String(x.email||'').toLowerCase()===u)};
const authUser=(d,u,hash)=>{const x=findUser(d,u);return x&&x.active!==false&&x.pw&&same(x.pw.hash,hash)?x:null};
async function fakeSalt(env,u){const h=await crypto.subtle.digest('SHA-256',enc.encode('salt|'+u+'|'+env.GH_TOKEN));let s='';new Uint8Array(h).slice(0,16).forEach(c=>s+=String.fromCharCode(c));return btoa(s)}
const strip=d=>({...d,users:(d.users||[]).map(u=>{const o={...u};delete o.pw;delete o.rec;delete o.fails;delete o.lockUntil;return o})});
const rank=x=>x.status&&x.status!=='pending'?1:0;
const unionReq=(a,b)=>{const m=new Map();(a||[]).forEach(x=>m.set(x.id,x));(b||[]).forEach(x=>{const o=m.get(x.id);m.set(x.id,o&&rank(o)>rank(x)?o:x)});return [...m.values()]};
const unionBy=(a,b,k)=>{const m=new Map();(a||[]).forEach(x=>m.set(k(x),x));(b||[]).forEach(x=>m.set(k(x),x));return [...m.values()]};
export function applyRules(R,C,caller,pwset){
  const pw={};(pwset||[]).forEach(x=>{if(x&&x.id&&x.pw&&x.pw.hash&&x.pw.salt)pw[x.id]=x});
  const rm=new Map((R.users||[]).map(u=>[u.id,u]));let users;
  if(caller.role==='admin'){
    users=(C.users||[]).map(cu=>{const ru=rm.get(cu.id),o={...cu};delete o.pw;delete o.rec;
      if(ru){o.pw=ru.pw;if(ru.rec)o.rec=ru.rec}
      if(pw[cu.id])o.pw=pw[cu.id].pw;
      return o.pw?o:null}).filter(Boolean);
    const dead=new Set(C.tomb||[]);
    rm.forEach((ru,id)=>{if(!dead.has(id)&&!users.some(u=>u.id===id))users.push(ru)});
    if(!users.some(u=>u.role==='admin'&&u.active!==false))users=R.users;
  }else{
    users=(R.users||[]).map(ru=>{if(ru.id!==caller.id)return ru;const cu=(C.users||[]).find(u=>u.id===ru.id)||{},o={...ru,lastLogin:cu.lastLogin||ru.lastLogin};
      if(pw[ru.id]){o.pw=pw[ru.id].pw;o.mustChange=false;o.mod=new Date().toISOString()}return o});
  }
  let out;
  if(caller.role==='admin')out={...C,users,requests:unionReq(R.requests,C.requests)};
  else if(caller.role==='sup')out={...C,users,requests:R.requests||[],rules:R.rules,rulesAt:R.rulesAt,drules:R.drules,drulesAt:R.drulesAt,perms:R.perms,permsAt:R.permsAt,tomb:unionBy(R.tomb,C.tomb,x=>x)};
  else out={...R,users,results:unionBy(R.results,C.results,x=>x.id),skips:unionBy(R.skips,C.skips,x=>x.aid+'|'+x.date),audit:unionBy(R.audit,C.audit,x=>x.id)};
  delete out.tab;return out;
}
const rnd=()=>Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>b.toString(16).padStart(2,'0')).join('');
async function route(req,env){
  const path=new URL(req.url).pathname.replace(/\/+$/,'')||'/';
  let b={};try{b=JSON.parse(await req.text()||'{}')}catch(e){return J({error:'Bad request'},400)}
  if(path==='/ping'){const {data}=await load(env);return J({ok:true,empty:!hasUsers(data)})}
  if(path==='/salt'){const {data}=await load(env),u=findUser(data||{},b.u);return J({salt:u&&u.pw?u.pw.salt:await fakeSalt(env,String(b.u||'').toLowerCase())})}
  if(path==='/request'){
    const name=String(b.name||'').trim().slice(0,80),email=String(b.email||'').trim().toLowerCase().slice(0,120);
    if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return J({error:'Enter your full name and a valid email address.'},400);
    for(let i=0;i<4;i++){
      const {data,sha}=await load(env),d=data||{users:[],requests:[]};d.requests=d.requests||[];
      if(d.requests.some(r=>r.email===email&&(!r.status||r.status==='pending')))return J({ok:true,duplicate:true});
      if(d.requests.filter(r=>!r.status||r.status==='pending').length>=200)return J({error:'Too many pending requests. Please contact the administrator.'},429);
      d.requests.push({id:'rq'+rnd(),name,email,at:new Date().toISOString(),status:'pending'});
      const r=await store(env,d,sha,'QCLens access request');if(!r.conflict)return J({ok:true});
    }
    return J({error:'Busy, try again.'},503);
  }
  if(path==='/pull'){
    const {data,sha}=await load(env);
    if(!hasUsers(data))return J({empty:true,sha,data});
    if(!authUser(data,b.u,b.hash))return J({error:'Username or password is incorrect.'},401);
    return J({sha,me:authUser(data,b.u,b.hash).id,data:strip(data)});
  }
  if(path==='/push'){
    const {data:R,sha}=await load(env),C=b.data;
    if(!C||typeof C!=='object'||!Array.isArray(C.users))return J({error:'Bad data'},400);
    if(sha&&b.sha!==sha)return J({conflict:true},409);
    let out;
    if(!hasUsers(R)){
      if(!b.boot||!C.users.some(u=>u.role==='admin'&&u.pw))return J({error:'The first upload must come from the administrator.'},403);
      out={...C,requests:unionReq(R&&R.requests,C.requests)};delete out.tab;
    }else{
      const me=authUser(R,b.u,b.hash);if(!me)return J({error:'Username or password is incorrect.'},401);
      out=applyRules(R,C,me,b.pwset);
    }
    const r=await store(env,out,sha);if(r.conflict)return J({conflict:true},409);
    return J({ok:true,sha:r.sha});
  }
  return J({error:'Not found'},404);
}
export default {async fetch(req,env){
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  if(req.method!=='POST')return J({ok:true,service:'QCLens sync'});
  try{return await route(req,env)}catch(e){return J({error:'Sync service error: '+(e&&e.message||e)},500)}
}};
