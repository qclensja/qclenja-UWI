/* ===== Westgard rules tab: shows every rule applied to QC points; admin switches them on or off ===== */
function ruleCounts(){
  const c={};RORDER.forEach(k=>c[k]=0);const res=VR();
  VA().forEach(a=>{const f=evaluate(a,res);Object.values(f).forEach(l=>l.forEach(x=>{if(c[x.rule]!=null)c[x.rule]++}))});
  const p=VA().length;return c;
}
function renderRules(){
  const cnt=ruleCounts(),adm=isAdmin(),off=RORDER.filter(k=>!ruleOn(k)).length;
  const card=k=>{const R=RULES[k],on=ruleOn(k),rej=R.sev==='reject';
    return `<div class="panelcard" style="${on?'':'opacity:.65'}"><div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap;gap:12px">
     <div><div class="row" style="gap:8px"><b style="font-size:1.05em">${R.name}</b><span class="chip ${rej?'bad':'warn'}">${rej?'Rejection rule':'Warning rule'}</span><span class="chip ${on?'good':''}">${on?'On':'Off'}</span></div>
     <p class="small" style="margin:6px 0 0;max-width:80ch">${R.desc}</p>
     <p class="small muted" style="margin:6px 0 0">Flagged ${cnt[k]} time${cnt[k]===1?'':'s'} in the QC points you can see.</p>
     <details style="margin-top:6px"><summary class="small" style="cursor:pointer">What to do when it triggers</summary><ol class="small" style="margin:6px 0 0 18px;padding:0">${R.fix.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details></div>
     ${adm?`<label class="row" style="gap:8px;flex-wrap:nowrap;white-space:nowrap;font-weight:600"><input type="checkbox" data-rulet="${k}"${on?' checked':''} aria-label="Apply ${esc(R.name)}"> Apply</label>`:''}</div></div>`};
  return `<div class="stack"><div class="panel stack"><div><h2>Westgard rules</h2><p class="muted small" style="margin:4px 0 0;max-width:80ch">Every rule QCLens checks on each QC point, across all control levels and analytes.${adm?' As administrator you can switch a rule off for the whole laboratory. A rule that is off is not checked, shown on charts or counted in alerts, and the change is recorded in the audit log.':' Only an administrator can switch rules on or off.'}</p></div>
   ${off?`<div class="panelcard" style="border-color:var(--warn)"><b>${off} rule${off===1?' is':'s are'} switched off.</b> <span class="small">QC points are not being checked against ${RORDER.filter(k=>!ruleOn(k)).map(k=>RULES[k].name).join(', ')}.</span></div>`:''}
   <h3 style="margin:6px 0 0">Rejection rules</h3>${RORDER.filter(k=>RULES[k].sev==='reject').map(card).join('')}
   <h3 style="margin:6px 0 0">Warning rules</h3>${RORDER.filter(k=>RULES[k].sev!=='reject').map(card).join('')}</div></div>`;
}
