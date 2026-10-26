/* p17: comments on chart points (click a point on a Levey-Jennings chart) */
const ptNotes=r=>(r&&r.notes||[]).filter(n=>!n.del);
function mergeNotes(a,b){
  const m=new Map();[...(a||[]),...(b||[])].forEach(n=>{const o=m.get(n.id);m.set(n.id,o?(o.del||n.del?{...o,...n,del:o.del||n.del}:o):n)});
  return [...m.values()].sort((x,y)=>(x.at||'')<(y.at||'')?-1:1);
}
function ptMark(x,y,n){   /* small speech bubble with the number of comments, drawn beside a point */
  return `<g pointer-events="none"><path d="M${x+4},${y-19}h13a3,3 0 0 1 3,3v7a3,3 0 0 1 -3,3h-8l-4,4v-4h-1a3,3 0 0 1 -3,-3v-7a3,3 0 0 1 3,-3z" fill="#2f7fc4" stroke="#fff" stroke-width="1"/><text x="${x+11.5}" y="${y-11}" text-anchor="middle" style="fill:#fff;font-size:9px;font-weight:700">${n}</text></g>`;
}
function ptNotesHtml(r){
  const l=ptNotes(r);if(!l.length)return '';
  return `<div class="small" style="margin-top:6px"><b>Comments (${l.length}):</b>${l.slice(-3).map(n=>`<div class="muted">${esc(n.text)} <span style="opacity:.8">(${esc(n.byName||'')} · ${fmtTs(n.at)})</span></div>`).join('')}${l.length>3?`<div class="muted">and ${l.length-3} earlier. Click the point on the chart to read all.</div>`:''}</div>`;
}
function renderPtModal(){
  const r=S.results.find(x=>x.id===UI.modal.ptn),a=r&&anOf(r.aid);
  if(!r||!a||!canSee(a)){UI.modal=null;return ''}
  const flags=allFlags(),f=flags[r.id]||[],z=zOf(a,r),t=targetFor(a,r.date).levels[r.lv],dp=decs(a),notes=ptNotes(r),can=perm('e_override');
  const near=evNear(a,dAdd(r.date,-7),r.date);
  return `<div class="modalbg" data-act="mclose"><div class="modal" style="max-width:640px" role="dialog" aria-modal="true" aria-label="Comments on a QC point" data-stop>
   <h2>${esc(a.name)} · ${levelName(r.lv)}</h2>
   <p class="muted" style="margin:4px 0 8px">${fmtDate(r.date)} · <span class="mono">${fmt(r.value,dp+1)} ${esc(a.unit)}</span> (${z>=0?'+':''}${z.toFixed(2)} SD from mean ${fmt(t.mean,dp+1)})</p>
   <div class="row" style="gap:6px;margin-bottom:6px">${chipFor(r,flags)}</div>
   <div class="small muted">${byLine(r)}</div>
   ${r.ov?`<div class="small" style="margin-top:8px;padding:8px 10px;border-left:3px solid var(--accent);background:var(--surface2);border-radius:4px"><b>${f.some(x=>x.sev==='reject')?'Resolution comment':'Override note'}:</b> ${esc(r.ov.comment||'')}<div class="muted">${r.ov.byName?esc(r.ov.byName)+' · ':''}${fmtTs(r.ov.at)}</div></div>`:''}
   ${near}
   <h3 style="margin:14px 0 6px">Comments${notes.length?' ('+notes.length+')':''}</h3>
   ${notes.length?notes.map(n=>`<div class="panelcard" style="margin-bottom:6px"><div style="white-space:pre-wrap">${esc(n.text)}</div><div class="small muted" style="margin-top:4px">${esc(n.byName||'')} · ${fmtTs(n.at)}${n.by&&CU&&(n.by===CU.id||isAdmin())?` · <button class="btn sm" type="button" data-act="ptnotedel" data-id="${r.id}" data-n="${n.id}">Delete</button>`:''}</div></div>`).join(''):'<p class="small muted" style="margin:0 0 6px">No comments on this point yet.</p>'}
   ${can?`<label class="f">Add a comment<textarea id="pt-text" rows="3" maxlength="500" placeholder="e.g. New vial opened before this run. Repeat is in control."></textarea></label>
   <p id="pt-err" class="small" style="color:var(--bad);margin:6px 0 0" hidden></p>`:'<p class="small muted">Your access level can read comments but not add them.</p>'}
   <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-act="mclose">Close</button>${can?`<button class="btn primary" data-act="ptnoteadd" data-id="${r.id}">Add comment</button>`:''}</div>
  </div></div>`;
}
function ptAct(act,el){
  const id=el.dataset.id;
  if(act==='ptnote'){const r=S.results.find(x=>x.id===id);if(r){UI.modal={ptn:id};render()}return true}
  const r=S.results.find(x=>x.id===id);if(!r)return true;
  if(act==='ptnoteadd'){
    if(!perm('e_override'))return true;
    const box=document.getElementById('pt-text'),txt=(box&&box.value||'').trim();
    if(!txt){const e=document.getElementById('pt-err');if(e){e.textContent='Write a comment first.';e.hidden=false}return true}
    const a=anOf(r.aid),now=nowIso();
    (r.notes=r.notes||[]).push({id:uid(),text:txt,by:CU?CU.id:null,byName:CU?CU.name:'',at:now});r.noteAt=now;
    audit('Point comment added',(a?a.name:'')+' '+levelName(r.lv)+' '+fmtDate(r.date)+' value '+r.value+': '+(txt.length>120?txt.slice(0,120)+'…':txt),null,a?[a.dept]:[]);
    save();toast('Comment added.');render();return true}
  if(act==='ptnotedel'){
    const n=(r.notes||[]).find(x=>x.id===el.dataset.n);if(!n||!CU||!(n.by===CU.id||isAdmin()))return true;
    n.del={by:CU.id,at:nowIso()};r.noteAt=nowIso();const a=anOf(r.aid);
    audit('Point comment deleted',(a?a.name:'')+' '+levelName(r.lv)+' '+fmtDate(r.date),null,a?[a.dept]:[]);save();render();return true}
  return false;
}
