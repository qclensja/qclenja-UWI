/* p19: Other QC > All plotted QC (view every plotted point; admins and permitted users can edit or delete a point) */
const oaState=()=>{if(!UI.oa){const t=new Date();UI.oa={inst:'',aid:'',lv:'',from:dstr(new Date(t.getFullYear(),t.getMonth(),t.getDate()-30,12)),to:dstr(t),viol:false,q:'',lim:100}}return UI.oa};
function oaList(o,flags){
  const q=(o.q||'').trim().toLowerCase(),an=id=>anOf(id);
  return VR().filter(r=>{const a=an(r.aid);if(!a)return false;
    if(o.inst&&instOf(a)!==o.inst)return false;if(o.aid&&r.aid!==o.aid)return false;if(o.lv!==''&&r.lv!==+o.lv)return false;
    if(o.from&&r.date<o.from)return false;if(o.to&&r.date>o.to)return false;
    if(o.viol&&!(flags[r.id]||[]).length)return false;
    if(q&&![a.name,r.byName,r.upd&&r.upd.byName,fmtDate(r.date),r.date].filter(Boolean).join(' ').toLowerCase().includes(q))return false;
    return true}).sort((x,y)=>x.date<y.date?1:x.date>y.date?-1:((an(x.aid).name+x.lv)<(an(y.aid).name+y.lv)?-1:1));
}
function renderOtherAll(o){
  const s=oaState(),flags=allFlags(),A=VA(),insts=[...new Set(A.map(instOf).filter(Boolean))].sort(),
    an=A.filter(a=>!s.inst||instOf(a)===s.inst).sort((x,y)=>x.name.localeCompare(y.name)),
    list=oaList(s,flags),show=list.slice(0,s.lim),can=perm('e_ptedit'),maxL=Math.max(1,...an.map(a=>a.nlev));
  const rows=show.map(r=>{const a=anOf(r.aid),dp=decs(a);
    return `<tr><td style="white-space:nowrap"><b>${fmtDate(r.date)}</b></td><td><b>${esc(a.name)}</b> <span class="small muted">${esc(a.unit||'')}${instTag(a)}</span></td><td>${levelName(r.lv)}</td><td><span class="mono">${fmt(r.value,dp)}</span></td><td class="small">${chipFor(r,flags)}</td>
     <td class="small muted">${r.byName?esc(r.byName):'Before sign-in'}${r.upd?'<br>edited by '+esc(r.upd.byName||'')+' · '+fmtTs(r.upd.at):''}${r.backfill?'<br><span class="chip">Earlier day</span>':''}${r.hist&&r.hist.length?'<br>'+r.hist.length+' earlier value'+(r.hist.length>1?'s':''):''}</td>
     <td style="white-space:nowrap">${can?`<button class="btn sm" data-act="oaedit" data-id="${r.id}">Edit</button> <button class="btn sm danger" data-act="oadel" data-id="${r.id}">Delete</button>`:''}</td></tr>`}).join('');
  return `<div class="stack"><div class="panel stack"><div><h2>Other QC</h2>${obModeSw(o)}<p class="muted small" style="margin:8px 0 0;max-width:80ch">Every QC value that has been plotted, newest first. Filter by analyser, analyte, level or dates.${can?' You can correct or delete a point after it was plotted. A reason is required and both actions are recorded in the audit log.':''}</p></div>
   <div class="row" style="align-items:flex-end;gap:10px;flex-wrap:wrap">${insts.length>1?`<label class="f">Analyser<select id="oa-inst" style="width:auto"><option value="">All analysers</option>${insts.map(n=>`<option${n===s.inst?' selected':''}>${esc(n)}</option>`).join('')}</select></label>`:''}
    <label class="f">Analyte<select id="oa-aid" style="width:auto;min-width:180px"><option value="">All analytes</option>${an.map(a=>`<option value="${a.id}"${a.id===s.aid?' selected':''}>${esc(a.name)}${multiInst()?' · '+esc(instLabel(a)):''}</option>`).join('')}</select></label>
    <label class="f">Level<select id="oa-lv" style="width:auto"><option value="">All levels</option>${Array.from({length:maxL},(_,i)=>`<option value="${i}"${s.lv!==''&&+s.lv===i?' selected':''}>${levelName(i)}</option>`).join('')}</select></label>
    <label class="f">From<input type="date" id="oa-from" value="${s.from}" style="width:auto"></label><label class="f">To<input type="date" id="oa-to" value="${s.to}" style="width:auto"></label>
    <label class="f" style="flex:1 1 160px">Find<input type="search" id="oa-q" value="${esc(s.q||'')}" placeholder="Analyte or person" autocomplete="off"></label>
    <label class="f" style="flex-direction:row;align-items:center;gap:6px;font-weight:400"><input type="checkbox" id="oa-viol"${s.viol?' checked':''}> Only points with a rule violation</label></div>
   <p class="small muted" style="margin:0"><span id="oa-count">${list.length} plotted point${list.length===1?'':'s'}</span>${list.length>show.length?' · showing the newest '+show.length:''}</p></div>
   <div class="panel"><div class="scroll"><table class="t"><thead><tr><th>Date</th><th>Analyte</th><th>Level</th><th>Value</th><th>Status</th><th>Entered by</th><th></th></tr></thead><tbody id="oa-body">${rows||'<tr><td colspan="7" class="muted">No plotted points match these filters.</td></tr>'}</tbody></table></div>
   ${list.length>show.length?`<div class="row" style="margin-top:10px"><button class="btn" data-act="oamore">Show more (${list.length-show.length} left)</button></div>`:''}</div></div>`;
}
function renderOaModal(){
  const m=UI.modal.oa,r=S.results.find(x=>x.id===m.id),a=r&&anOf(r.aid);if(!r||!a)return '';
  const del=m.k==='del',desc=`${esc(a.name)} · ${levelName(r.lv)} · ${fmtDate(r.date)} · <span class="mono">${fmt(r.value,decs(a))} ${esc(a.unit||'')}</span>`;
  return `<div class="modalbg" data-act="mclose"><div class="modal" style="max-width:520px" role="dialog" aria-modal="true" data-stop>
   <h2>${del?'Delete this QC point':'Edit this QC point'}</h2><p style="margin:4px 0 10px">${desc}</p>
   ${del?'<p class="small muted">The point is removed from the chart and from every report. This cannot be undone, but the deletion is kept in the audit log.</p>':`<label class="f">Correct value<input type="number" step="any" inputmode="decimal" id="oa-val" value="${esc(r.value)}"></label>`}
   <label class="f" style="margin-top:8px">Reason (required)<textarea id="oa-why" rows="2" maxlength="300" placeholder="${del?'e.g. Entered on the wrong analyte':'e.g. Typing error, the printout reads 4.2'}"></textarea></label>
   <p class="small" id="oa-err" style="color:var(--bad,#b42318);margin:6px 0 0;min-height:1em"></p>
   <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn" data-act="mclose">Cancel</button><button class="btn ${del?'danger':'primary'}" data-act="${del?'oadelok':'oaeditok'}" data-id="${r.id}">${del?'Delete point':'Save change'}</button></div></div></div>`;
}
function oaAct(act,el){
  const id=el.dataset&&el.dataset.id;
  if(act==='oamore'){oaState().lim+=100;render();return true}
  if(!/^oa(edit|del|editok|delok)$/.test(act))return false;
  if(!perm('e_ptedit'))return true;
  const r=S.results.find(x=>x.id===id),a=r&&anOf(r.aid);if(!r||!a||!canSee(a))return true;
  if(act==='oaedit'||act==='oadel'){UI.modal={oa:{k:act==='oadel'?'del':'edit',id}};render();setTimeout(()=>{const i=document.getElementById(act==='oadel'?'oa-why':'oa-val');if(i)i.focus()},30);return true}
  const why=((document.getElementById('oa-why')||{}).value||'').trim(),err=m=>{const e=document.getElementById('oa-err');if(e)e.textContent=m};
  if(!why)return err('Write a reason first.'),true;
  const what=a.name+' '+levelName(r.lv)+' '+fmtDate(r.date);
  if(act==='oaeditok'){
    const v=num((document.getElementById('oa-val')||{}).value);if(v==null)return err('Enter a number.'),true;
    if(v===r.value)return err('The value is unchanged.'),true;
    const pr=r.upd||r,old=r.value;(r.hist||(r.hist=[])).push({value:old,by:pr.by||null,byName:pr.byName||'',at:pr.at||'',reason:why});
    r.value=v;r.upd={...stampNow(),reason:why};r.ov=null;
    audit('QC point edited',what+': '+old+' to '+v+' (reason: '+why+')',null,[a.dept]);save();UI.modal=null;toast('Point corrected and re-checked against the rules.');render();return true}
  tomb(id);S.results=S.results.filter(x=>x.id!==id);if(UI.report)UI.report=UI.report.filter(x=>x!==id);
  audit('QC point deleted',what+' value '+r.value+(r.byName?' (entered by '+r.byName+')':'')+' (reason: '+why+')',null,[a.dept]);save();UI.modal=null;toast('Point deleted.');render();return true;
}
document.addEventListener('change',e=>{const t=e.target;if(!t||!CU||!t.id||!/^oa-/.test(t.id)||t.id==='oa-q'||t.id==='oa-val'||t.id==='oa-why')return;
  const o=oaState(),k={'oa-inst':'inst','oa-aid':'aid','oa-lv':'lv','oa-from':'from','oa-to':'to'}[t.id];
  if(t.id==='oa-viol')o.viol=t.checked;else if(k){o[k]=t.value;if(k==='inst')o.aid=''}else return;o.lim=100;render()});
document.addEventListener('input',e=>{const t=e.target;if(!t||!CU||t.id!=='oa-q')return;const o=oaState();o.q=t.value;o.lim=100;render();const i=document.getElementById('oa-q');if(i){i.focus();try{i.setSelectionRange(t.value.length,t.value.length)}catch(x){}}});
