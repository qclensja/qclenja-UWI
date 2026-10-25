import http from 'http';
import worker from './worker.mjs';
const store={files:{},n:0,get file(){return (store.files['qclens-data.json']||{}).content||null},get sha(){return +((store.files['qclens-data.json']||{}).sha||'s0').slice(1)}};const realFetch=globalThis.fetch;
globalThis.fetch=async(u,init={})=>{
  u=String(u);if(!u.startsWith('https://api.github.com/'))return realFetch(u,init);
  const m=(init.method||'GET').toUpperCase(),path=decodeURIComponent(u.replace(/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+\/contents\//,'').split('?')[0]);
  const raw=((init.headers||{}).Accept||'').includes('raw');
  if(m==='GET'){
    const f=store.files[path];
    if(f)return raw?new Response(Buffer.from(f.content,'base64').toString('utf8'),{status:200}):new Response(JSON.stringify({sha:f.sha,type:'file',size:f.content.length,encoding:'base64',content:f.content}),{status:200});
    const kids=Object.keys(store.files).filter(k=>k.startsWith(path+'/'));
    if(kids.length)return new Response(JSON.stringify(kids.map(k=>({name:k.split('/').pop(),type:'file',size:store.files[k].content.length,sha:store.files[k].sha}))),{status:200});
    return new Response('{}',{status:404});
  }
  const j=JSON.parse(init.body);const f=store.files[path];
  if(m==='DELETE'){if(!f||j.sha!==f.sha)return new Response('{}',{status:409});delete store.files[path];return new Response('{}',{status:200})}
  if(f&&j.sha!==f.sha)return new Response('{}',{status:409});
  if(!f&&j.sha)return new Response('{}',{status:422});
  const sha='s'+(++store.n);store.files[path]={content:j.content,sha};return new Response(JSON.stringify({content:{sha}}),{status:200});
};
const env={GH_TOKEN:'secret',GH_OWNER:'o',GH_REPO:'r'};
export function start(port=8787){
  return new Promise(res=>{const s=http.createServer(async(rq,rs)=>{
    const chunks=[];for await(const c of rq)chunks.push(c);
    const r=new Request('http://x'+rq.url,{method:rq.method,body:['GET','HEAD','OPTIONS'].includes(rq.method)?undefined:Buffer.concat(chunks)});
    const o=await worker.fetch(r,env);const h={};o.headers.forEach((v,k)=>h[k]=v);rs.writeHead(o.status,h);rs.end(Buffer.from(await o.arrayBuffer()));
  }).listen(port,()=>res({close:()=>s.close(),store}))});
}
if(process.argv[1].endsWith('devserver.mjs'))start().then(()=>console.log('up'));
