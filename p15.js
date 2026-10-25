/* p15: Recently deleted (30-day holding area for departments, panels, tests and QC materials) */
const TRASH_DAYS=30;
const clone=o=>JSON.parse(JSON.stringify(o));
function trashAdd(kind,label,detail,data){
  S.trash=S.trash||[];const now=Date.now();
  S.trash.push({id:uid(),kind,label,detail:detail||'',at:new Date(now).toISOString(),by:CU?CU.id:null,byName:CU?CU.name:'',exp:new Date(now+TRASH_DAYS*864e5).toISOString(),data:clone(data)});
}
function trashPurge(o){o=o||S;if(Array.isArray(o.trash)){const n=new Date().toISOString();o.trash=o.trash.filter(t=>!t.exp||t.exp>n)}}
/* what a set of analytes carries with it */
function trashPack(ids){
  const set=new Set(ids);
  return {analytes:S.analytes.filter(a=>set.has(a.id)),results:S.results.filter(r=>set.has(r.aid)),skips:S.skips.filter(s=>set.has(s.aid)),est:[]};
}
function trashDept(id){   /* call BEFORE the department is removed */
  syncCtx();const rec=S.depts.find(d=>d.id===id);if(!rec)return;
  const ids=S.analytes.filter(a=>a.dept===id).map(a=>a.id),set=new Set(ids),pk=trashPack(ids);
  pk.est=(S.est||[]).filter(e=>set.has(e.aid));
  trashAdd('dept',rec.dept,ids.length+' tests, '+pk.results.length+' QC results',{...pk,dept:rec,drules:(S.drules||{})[id]||null,userIds:S.users.filter(u=>Array.isArray(u.depts)&&u.depts.includes(id)).map(u=>u.id)});
}
function trashTests(ids,kind,label,panelName){   /* call BEFORE removeAnalyte */
  const pk=trashPack(ids),st=S.setup,cp=st.cpanels.find(c=>c.name===panelName);
  const first=anOf(ids[0]);
  trashAdd(kind,label,(kind==='panel'?ids.length+' tests, ':'')+pk.results.length+' QC results · '+(st.dept||''),{...pk,deptId:st.cur,deptName:st.dept,panel:panelName,customPanel:!!cp,unit:first?first.unit:''});
}
/* ---- restore ---- */
function trashRestore(tid,intoDept){
  const t=(S.trash||[]).find(x=>x.id===tid);if(!t)return false;
  const d=clone(t.data),now=nowIso(),map={};
  const fresh=(x)=>{delete x._h;x.modAt=now;return x};
  if(t.kind==='material'){
    const m=fresh(d.material);m.id=uid();S.materials.push(m);
  }else if(t.kind==='dept'){
    const rec=fresh(d.dept),oldId=rec.id,newId=uid();rec.id=newId;S.depts.push(rec);
    d.analytes.forEach(a=>{map[a.id]=uid();a.id=map[a.id];a.dept=newId;fresh(a)});
    d.results.forEach(r=>{r.id=uid();r.aid=map[r.aid]});
    d.skips.forEach(s=>{s.aid=map[s.aid];if(s.id)s.id=uid()});
    d.est.forEach(e=>{e.aid=map[e.aid];e.id=uid();fresh(e)});
    S.analytes.push(...d.analytes);S.results.push(...d.results);S.skips.push(...d.skips);S.est.push(...d.est);
    if(d.drules!=null){S.drules=S.drules||{};S.drulesAt=S.drulesAt||{};S.drules[newId]=d.drules;S.drulesAt[newId]=now}
    (d.userIds||[]).forEach(uid_=>{const u=S.users.find(x=>x.id===uid_);if(u&&Array.isArray(u.depts)&&!u.depts.includes(newId)){u.depts=[...u.depts,newId];u.mod=now}});
  }else{   /* panel or test: goes back into a department (original one, or one chosen) */
    const target=S.depts.find(x=>x.id===(intoDept||d.deptId));if(!target)return false;
    const keepCtx=S.setup.cur;syncCtx();loadCtx(target.id);
    try{
      if(d.customPanel&&!S.setup.cpanels.some(c=>c.name===d.panel))S.setup.cpanels.push({id:uid(),name:d.panel,items:[]});
      d.analytes.forEach(a=>{
        const old=a.id;map[old]=uid();a.id=map[old];a.dept=target.id;fresh(a);
        try{a.name=registerSrc(a.panel,a.name,a.unit)}catch(e){}
      });
      d.results.forEach(r=>{r.id=uid();r.aid=map[r.aid]});
      d.skips.forEach(s=>{s.aid=map[s.aid];if(s.id)s.id=uid()});
      S.est.forEach(e=>{if(map[e.aid]){e.aid=map[e.aid];e.modAt=now}});
      S.analytes.push(...d.analytes);S.results.push(...d.results);S.skips.push(...d.skips);
      syncCtx();
    }finally{if(keepCtx&&keepCtx!==target.id&&S.depts.some(x=>x.id===keepCtx))loadCtx(keepCtx)}
  }
  tomb(tid);S.trash=S.trash.filter(x=>x.id!==tid);
  audit('Restored from recently deleted',({dept:'Department',panel:'Panel',test:'Test',material:'QC material'})[t.kind]+' '+t.label);
  save();return true;
}
function trashDays(t){return Math.max(0,Math.ceil((new Date(t.exp)-Date.now())/864e5))}
function trashAct(act,el){
  if(!isAdmin())return false;
  const id=el.dataset.id;
  if(act==='trrestore'){
    const t=(S.trash||[]).find(x=>x.id===id);if(!t)return true;
    const sel=document.getElementById('trinto-'+id);
    if(!trashRestore(id,sel?sel.value:undefined)){toast('Choose a department to restore it into.');return true}
    toast(t.label+' restored.');render();return true;
  }
  if(act==='trpurge'){
    if(UI.trconf!==id){UI.trconf=id;render();return true}
    UI.trconf=null;const t=(S.trash||[]).find(x=>x.id===id);tomb(id);S.trash=(S.trash||[]).filter(x=>x.id!==id);
    if(t)audit('Deleted permanently',t.label);save();toast('Deleted permanently.');render();return true;
  }
  if(act==='trpurgeno'){UI.trconf=null;render();return true}
  return false;
}
const KIND_TXT={dept:'Department',panel:'Panel',test:'Test',material:'QC material'};
function renderTrash(){
  if(!isAdmin())return '';
  trashPurge();const list=(S.trash||[]).slice().sort((x,y)=>x.at<y.at?1:-1);
  const depts=(S.depts||[]).filter(d=>d.dept);
  return `<div class="panel stack"><div><h3>Recently deleted</h3><p class="small muted" style="margin:4px 0 0;max-width:80ch">Departments, panels, tests and QC materials that were deleted stay here for ${TRASH_DAYS} days so they can be restored with their QC results. After that they are removed for good. Only administrators can see this list.</p></div>
   ${list.length?`<div class="scroll"><table class="t small"><thead><tr><th>Deleted item</th><th>Type</th><th>Deleted</th><th>Left</th><th></th></tr></thead><tbody>${list.map(t=>{
     const needSel=(t.kind==='panel'||t.kind==='test')&&!depts.some(d=>d.id===t.data.deptId);
     const sel=(t.kind==='panel'||t.kind==='test')?`<label class="f small" style="margin:0">${needSel?'Original department was deleted. Restore into':'Restore into'}<select id="trinto-${t.id}" style="width:auto">${depts.map(d=>`<option value="${d.id}"${d.id===t.data.deptId?' selected':''}>${esc(d.dept)}</option>`).join('')}</select></label>`:'';
     return `<tr><td><b>${esc(t.label)}</b><div class="muted">${esc(t.detail)}</div></td><td>${KIND_TXT[t.kind]||t.kind}</td><td>${fmtTs(t.at)}${t.byName?'<div class="muted">'+esc(t.byName)+'</div>':''}</td><td>${trashDays(t)} day${trashDays(t)===1?'':'s'}</td><td><div class="row" style="gap:6px;align-items:flex-end">${sel}<button class="btn sm primary" data-act="trrestore" data-id="${t.id}">Restore</button>${UI.trconf===t.id?`<button class="btn sm danger" data-act="trpurge" data-id="${t.id}">Yes, delete for good</button><button class="btn sm" data-act="trpurgeno">Cancel</button>`:`<button class="btn sm" data-act="trpurge" data-id="${t.id}">Delete for good</button>`}</div></td></tr>`}).join('')}</tbody></table></div>`:'<p class="small muted" style="margin:0">Nothing has been deleted recently.</p>'}</div>`;
}
