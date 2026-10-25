/* p14: automatic backups (sync service keeps dated copies in the private data repository) */
function restoreData(o,from){
  if(!o||!Array.isArray(o.analytes)||!o.setup)throw new Error('bad');
  const kU=S.users,kA=S.audit;S=norm(o);if(!S.users.length)S.users=kU;if(!S.audit.length)S.audit=kA;UI.editing=false;
  CU=S.users.find(u=>u.id===(SESS&&SESS.uid)&&u.active!==false)||null;
  if(!CU){SESS=null;writeSess()}else audit('Backup restored','Data restored from '+from);
  save();render();toast('Backup restored.');
}
const bkDate=d=>{const m=String(d||'').match(/(\d{4})-(\d{2})-(\d{2})/);return m?new Date(+m[1],+m[2]-1,+m[3]).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'}):d};
async function bkpLoad(){
  if(!svcOn()||!CU||CU.role!=='admin')return;
  UI.bk=UI.bk||{};UI.bk.busy=true;UI.bk.msg='';render();
  try{const j=await svcCall('/backups');UI.bk.list=j.list;UI.bk.keep=j.keep}
  catch(e){UI.bk.msg=e.message}
  UI.bk.busy=false;try{render()}catch(e){}
}
async function bkpAct(act,el){
  UI.bk=UI.bk||{};
  if(act==='bkpload'){bkpLoad();return true}
  if(act==='bkpnow'){
    UI.bk.busy=true;UI.bk.msg='';render();
    try{const j=await svcCall('/backup-now');UI.bk.list=j.list;UI.bk.msg=j.skipped||('Backup saved: '+bkDate(j.date)+'.');if(!j.skipped)audit('Backup created','Backup made on the sync service')}
    catch(e){UI.bk.msg=e.message}
    UI.bk.busy=false;render();return true;
  }
  if(act==='bkpdl'||act==='bkprestore'){
    const name=el.dataset.n;
    try{
      if(act==='bkprestore'&&!confirm('Restore the backup from '+bkDate(name)+'?\n\nThis device will switch to that copy. Because QCLens merges with the cloud, anything newer that exists in the cloud may be added back. Download a backup of the current data first if unsure.'))return true;
      const j=await svcCall('/backup-get',{name});
      if(act==='bkpdl'){const dl=await getDl();if(!dl){toast('Saving files is not available in this view.');return true}await dl.save({filename:name,data:JSON.stringify(j.data,null,1)});toast('Backup downloaded.')}
      else restoreData(j.data,'the automatic backup of '+bkDate(name));
    }catch(e){UI.bk.msg=(e&&e.code==='declined')?'':(e&&e.message)||'That backup could not be read.';render()}
    return true;
  }
  return false;
}
function renderBackups(){
  if(!svcOn()||!CU||CU.role!=='admin')return '';
  const b=UI.bk||{},list=b.list;
  if(!list&&!b.busy&&!b.msg&&!b.auto){UI.bk=b;b.auto=true;setTimeout(bkpLoad,0)}
  const latest=list&&list[0],age=latest?Math.floor((Date.now()-new Date(latest.date+'T12:00:00').getTime())/864e5):null;
  const status=!list?'<p class="small muted" style="margin:0">'+(b.busy?'Checking backups…':'Backups not loaded yet.')+'</p>'
    :!list.length?'<p class="amsg" role="alert" style="margin:0">No backups yet. If you just updated, redeploy the sync service and add a nightly Cron Trigger (see the worker README), or press Back up now.</p>'
    :age>2?'<p class="amsg" role="alert" style="margin:0">The last backup was '+esc(bkDate(latest.date))+' ('+age+' days ago). Check that the nightly Cron Trigger is still enabled.</p>'
    :'<p class="small" style="margin:0">Last backup: <b>'+esc(bkDate(latest.date))+'</b>. '+list.length+' kept.</p>';
  return `<div class="panel stack"><div><h3>Automatic backups</h3><p class="small muted" style="margin:4px 0 0;max-width:80ch">The sync service saves a dated copy of all QCLens data every night in the private data repository, so recovery never depends on someone remembering to download one. The newest ${b.keep||30} are kept, plus the first of each of the last 12 months.</p></div>
   ${status}${b.msg?`<p class="small" role="status" style="margin:0">${esc(b.msg)}</p>`:''}
   <div class="row"><button class="btn" data-act="bkpnow"${b.busy?' disabled':''}>Back up now</button><button class="btn" data-act="bkpload"${b.busy?' disabled':''}>Refresh list</button></div>
   ${list&&list.length?`<div style="max-height:260px;overflow:auto"><table class="t small"><thead><tr><th>Backup</th><th>Size</th><th></th></tr></thead><tbody>${list.map(x=>`<tr><td>${esc(bkDate(x.date))}</td><td>${Math.max(1,Math.round(x.size/1024))} KB</td><td class="row" style="gap:6px"><button class="btn small" data-act="bkpdl" data-n="${esc(x.name)}">Download</button><button class="btn small danger" data-act="bkprestore" data-n="${esc(x.name)}">Restore</button></td></tr>`).join('')}</tbody></table></div>`:''}
  </div>`;
}
