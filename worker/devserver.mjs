import http from 'http';
import worker from './worker.mjs';
const store={file:null,sha:0};const realFetch=globalThis.fetch;
globalThis.fetch=async(u,init={})=>{
  if(!String(u).startsWith('https://api.github.com/'))return realFetch(u,init);
  const m=(init.method||'GET').toUpperCase();
  if(m==='GET'){if(!store.file)return new Response('{}',{status:404});return new Response(JSON.stringify({sha:'s'+store.sha,encoding:'base64',content:store.file}),{status:200})}
  const j=JSON.parse(init.body);if(store.file&&j.sha!=='s'+store.sha)return new Response('{}',{status:409});
  store.file=j.content;store.sha++;return new Response(JSON.stringify({content:{sha:'s'+store.sha}}),{status:200});
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
