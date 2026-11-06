/* p20: keep every browser on the newest version. The page checks version.json (never cached) and reloads itself when it is safe. */
let UPD={build:null,timer:null,busy:false};
function updBar(show){
  let b=document.getElementById('updbar');
  if(!show){if(b)b.remove();return}
  if(!b){b=document.createElement('div');b.id='updbar';b.setAttribute('role','status');
    b.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99;background:#0B7A6F;color:#fff;padding:10px 16px;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;font-size:14px';
    b.innerHTML='<span>A new version of QCLens is ready. It will install by itself as soon as you are not in the middle of something.</span><button type="button" data-act="updnow" style="background:#fff;color:#0B7A6F;border:0;border-radius:6px;padding:6px 14px;font-weight:600;cursor:pointer">Update now</button>';
    document.body.appendChild(b)}
}
function updSafe(){
  if(UI.modal||UI.updBusy)return false;const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))return false;
  const full=o=>o&&Object.values(o).some(v=>String(v==null?'':v).trim()!=='');
  if(full(UI.draft)||full(UI.obd))return false;
  if(typeof ghOn==='function'&&ghOn()&&(GHS.timer||GHS.busy||GHS.st==='pending'))return false;
  return true;
}
async function updReload(){
  if(UPD.busy)return;UPD.busy=true;
  try{if(typeof ghOn==='function'&&ghOn()&&ghReady()&&ghHash(S)!==GHS.lastHash){await Promise.race([ghSync(),new Promise(r=>setTimeout(r,6000))])}}catch(e){}
  try{if('caches' in window){const k=await caches.keys();await Promise.all(k.map(x=>caches.delete(x)))}}catch(e){}
  try{if(navigator.serviceWorker){const r=await navigator.serviceWorker.getRegistrations();await Promise.all(r.map(x=>x.unregister()))}}catch(e){}
  const u=new URL(location.href);u.searchParams.set('b',UPD.build||Date.now());location.replace(u.toString());
}
async function updCheck(manual){
  if(!/^https?:$/.test(location.protocol))return manual&&toast('Update checks only work on the published site.');
  try{
    const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;const j=await r.json();
    if(!j||!j.build)throw 0;
    if(j.build!==BUILD){UPD.build=j.build;updBar(true);updTick()}
    else{updBar(false);if(manual)toast('QCLens is up to date (build '+BUILD+').')}
  }catch(e){if(manual)toast('Could not check for updates. Check your connection.')}
}
function updTried(){try{return new URL(location.href).searchParams.get('b')===String(UPD.build)}catch(e){return false}}
function updTick(){clearInterval(UPD.timer);if(updTried())return;UPD.timer=setInterval(()=>{if(updSafe()&&!updTried())updReload()},8000);if(updSafe())setTimeout(()=>{if(updSafe()&&!updTried())updReload()},1500)}
function updAct(act){if(act==='updcheck')return updCheck(true);if(act==='updnow')return updReload()}
(function(){if(!/^https?:$/.test(location.protocol))return;
  setTimeout(()=>updCheck(false),4000);setInterval(()=>updCheck(false),180000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')updCheck(false)});
})();
