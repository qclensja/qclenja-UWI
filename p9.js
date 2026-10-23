/* ===== Westgard rules tab: shows every rule applied to QC points; admin switches them on or off ===== */
function rdeptList(){return isAdmin()?deptList():visDepts()}
function rdeptSel(){
  const L=rdeptList();if(!L.length)return '';
  if(isAdmin()){return UI.rdept&&L.some(d=>d.id===UI.rdept)?UI.rdept:''}
  return UI.rdept&&L.some(d=>d.id===UI.rdept)?UI.rdept:L[0].id;
}
const rdeptName=id=>{const d=deptList().find(x=>x.id===id);return d?d.dept:'this department'};
function rdTarget(){
  const d=rdeptSel();
  if(!d)return {obj:(S.rules=S.rules||{}),stamp:()=>{S.rulesAt=nowIso()},label:'the laboratory',depts:[]};
  if(!hasOwnRules(d))return null;
  return {obj:S.drules[d],stamp:()=>{S.drulesAt=S.drulesAt||{};S.drulesAt[d]=nowIso()},label:rdeptName(d),depts:[d]};
}
function ruleCounts(dept){
  const c={};RORDER.forEach(k=>c[k]=0);const res=VR();
  VA().filter(a=>!dept||a.dept===dept).forEach(a=>{const f=evaluate(a,res);Object.values(f).forEach(l=>l.forEach(x=>{if(c[x.rule]!=null)c[x.rule]++}))});
  const p=VA().length;return c;
}
function renderRules(){
  const D=rdeptSel(),own=hasOwnRules(D),cnt=ruleCounts(D),admAll=isAdmin(),adm=admAll&&(!D||own),off=RORDER.filter(k=>!ruleOn(k,D)).length,dl=rdeptList();
  const scopeOf2=k=>scopeOf(k,D),ruleOn2=k=>ruleOn(k,D);
  const card=k=>{const R=RULES[k],on=ruleOn2(k),rej=R.sev==='reject';
    return `<div class="panelcard" style="${on?'':'opacity:.65'}"><div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap;gap:12px">
     <div><div class="row" style="gap:8px"><b style="font-size:1.05em">${R.name}</b><span class="chip ${rej?'bad':'warn'}">${rej?'Rejection rule':'Warning rule'}</span><span class="chip ${on?'good':''}">${on?'On':'Off'}</span></div>
     <p class="small" style="margin:6px 0 0;max-width:80ch">${R.desc}</p>
     ${SCOPED.includes(k)?(adm?`<label class="f" style="margin-top:8px;max-width:560px">How this rule counts controls<select data-rscope="${k}">${Object.entries(SCOPE_TXT).map(([v,t])=>`<option value="${v}"${scopeOf2(k)===v?' selected':''}>${t}</option>`).join('')}</select></label>`:`<p class="small" style="margin:6px 0 0"><b>Counts controls:</b> ${SCOPE_TXT[scopeOf2(k)]}</p>`)+`<p class="small muted" style="margin:4px 0 0;max-width:80ch">${k==='10x'?'Example: with "across levels", 5 controls above the mean on Level 1 plus 5 on Level 2 count as 10. With "within each level", all 10 must be on one level.':k==='4-1s'?'Example: with "across levels", 2 on Level 1 and 2 on Level 2 beyond 1 SD on the same side count as 4.':'Example: with "across levels", Level 1 and Level 2 in the same run both beyond 2 SD on the same side trigger it. With "within each level", two consecutive runs of the same level must do so.'}</p>`:''}
     <p class="small muted" style="margin:6px 0 0">Flagged ${cnt[k]} time${cnt[k]===1?'':'s'} in the QC points you can see.</p>
     <details style="margin-top:6px"><summary class="small" style="cursor:pointer">What to do when it triggers</summary><ol class="small" style="margin:6px 0 0 18px;padding:0">${R.fix.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details></div>
     ${adm?`<label class="row" style="gap:8px;flex-wrap:nowrap;white-space:nowrap;font-weight:600"><input type="checkbox" data-rulet="${k}"${on?' checked':''} aria-label="Apply ${esc(R.name)}"> Apply</label>`:''}</div></div>`};
  const deptBar=dl.length>1||(dl.length===1&&admAll)?`<div class="row" style="align-items:flex-end;gap:10px"><label class="f">Rules for<select id="rdept" style="width:auto;min-width:240px">${admAll?`<option value=""${D?'':' selected'}>All departments (laboratory rules)</option>`:''}${dl.map(d=>`<option value="${d.id}"${d.id===D?' selected':''}>${esc(d.dept)}${hasOwnRules(d.id)?' (own rules)':''}</option>`).join('')}</select></label>
    ${D&&admAll?(own?`<button class="btn" data-act="rreset">Use the laboratory rules again</button>`:`<button class="btn primary" data-act="rcustom">Set own rules for ${esc(rdeptName(D))}</button>`):''}</div>
    ${D?`<p class="small" style="margin:0"><b>${esc(rdeptName(D))}</b> ${own?'has its own rules. Changes here apply to this department only.':'follows the laboratory rules.'}${admAll&&!own?' Press <b>Set own rules</b> to give it a separate set, starting from the laboratory rules.':''}</p>`:`<p class="small" style="margin:0">These are the laboratory rules. Departments that do not have their own rules follow them.</p>`}`:'';
  return `<div class="stack"><div class="panel stack"><div><h2>Westgard rules</h2><p class="muted small" style="margin:4px 0 0;max-width:80ch">Every rule QCLens checks on each QC point, across all control levels and analytes.${adm?' As administrator you can switch a rule off for the whole laboratory, or give a department its own set of rules. A rule that is off is not checked, shown on charts or counted in alerts, and the change is recorded in the audit log.':' Only an administrator can switch rules on or off.'}</p></div>
   ${deptBar}
   ${off?`<div class="panelcard" style="border-color:var(--warn)"><b>${off} rule${off===1?' is':'s are'} switched off.</b> <span class="small">QC points are not being checked against ${RORDER.filter(k=>!ruleOn2(k)).map(k=>RULES[k].name).join(', ')}.</span></div>`:''}
   <h3 style="margin:6px 0 0">Rejection rules</h3>${RORDER.filter(k=>RULES[k].sev==='reject').map(card).join('')}
   <h3 style="margin:6px 0 0">Warning rules</h3>${RORDER.filter(k=>RULES[k].sev!=='reject').map(card).join('')}</div></div>`;
}
