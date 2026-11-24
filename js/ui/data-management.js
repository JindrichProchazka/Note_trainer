import { TEXT } from './strings.js';
import { DATA } from './data-strings.js';
import { PWA_TEXT } from '../pwa.js';
import { createBackup,backupFilename,prepareImport,commitImport,prepareReset,commitReset,MAX_BACKUP_BYTES } from '../data/backup.js';
import { escapeHtml as h } from './html.js';
export function dataManagementMarkup(){
  return `<section class="card data-management" aria-labelledby="data-title">
    <h2 id="data-title">${DATA.title}</h2><p>${DATA.warning}</p>
    <div class="data-actions"><button class="button subtle" data-action="backup-export">${DATA.export}</button>
      <button class="button subtle" data-action="check-update">${PWA_TEXT.check}</button></div>
    <label class="form-field" for="backup-file">${DATA.import}
      <input id="backup-file" type="file" accept=".json,application/json"></label>
    <p id="data-status" role="status" aria-live="polite"></p><div id="backup-preview"></div>
    <button class="button subtle danger-button" data-action="statistics-reset">${DATA.reset}</button>
  </section>`;
}
export function createDataManager({root,storage,getSnapshot,getSettings,canModify,onCommitted,checkUpdate}){
  let plan=null,resetPlan=null,action=null,busy=false;
  const dialog=document.createElement('dialog');
  dialog.id='data-confirm-dialog';dialog.setAttribute('aria-labelledby','data-confirm-title');
  dialog.innerHTML=`<h2 id="data-confirm-title">${DATA.confirmTitle}</h2><p id="data-confirm-description"></p>
    <p class="muted">${DATA.tabs}</p>
    <label class="data-confirm-check"><input id="data-confirm-check" type="checkbox"> ${DATA.understand}</label>
    <div class="dialog-actions"><button class="button subtle" id="cancel-data-change">${DATA.cancel}</button>
      <button class="button primary" id="confirm-data-change" disabled>${DATA.confirm}</button></div>`;
  root.append(dialog);
  const message=(text,error=false)=>{
    const element=root.querySelector('#data-status');
    if(element){element.textContent=text;element.classList.toggle('data-error',error);}
  };
  function preview(){
    const target=root.querySelector('#backup-preview');if(!target)return;
    if(!plan){target.innerHTML='';return;}
    const p=plan.preview,b=plan.backup,prefs=b.data.preferences.settings;
    target.innerHTML=`<section class="backup-preview" aria-label="${DATA.preview}"><h3>${DATA.preview}</h3>
      <p>${h(b.exportedAt)} · v${h(b.appVersion)}</p>
      <p>${h(DATA.summary(p.sessions,p.attempts,p.completed))}</p>
      <p>${h(DATA.changes(p.newSessions,p.duplicateSessions,p.addedAttempts))}</p>
      <p>${DATA.preferences}: ${h(TEXT.themes[prefs.theme])} · ${h(TEXT.namingShort[prefs.naming])} · ${h(TEXT.presets[prefs.defaultPreset])} · ${h(TEXT.sessionTypes[prefs.defaultSessionType])}</p>
      <p>${DATA.interrupted}</p><p>${DATA.mergeWarning}</p><p>${DATA.replaceWarning}</p>
      ${plan.conflicts.length?`<p class="data-error">${DATA.conflicts}: ${plan.conflicts.map(h).join('; ')}</p>`:''}
      <div class="data-actions"><button class="button subtle" data-action="backup-merge"${plan.conflicts.length?' disabled':''}>${DATA.merge}</button>
        <button class="button subtle danger-button" data-action="backup-replace">${DATA.replace}</button>
        <button class="button subtle" data-action="backup-cancel">${DATA.cancel}</button></div></section>`;
  }
  const permitted=()=>{if(busy||!canModify()){message(DATA.finish,true);return false;}return true;};
  function confirm(kind){
    if(!permitted())return;
    action=kind;
    dialog.querySelector('#data-confirm-description').textContent=kind==='reset'?DATA.resetWarning:kind==='merge'?DATA.mergeWarning:DATA.replaceWarning;
    dialog.querySelector('#data-confirm-check').checked=false;
    dialog.querySelector('#confirm-data-change').disabled=true;
    dialog.showModal();
  }
  function errorMessage(error){
    message(error?.name==='QuotaExceededError'?DATA.full:(error?.message?DATA.failed+' '+error.message:DATA.failed),true);
  }
  root.addEventListener('change',async event=>{
    if(event.target.id!=='backup-file')return;
    const file=event.target.files?.[0];if(!file)return;
    plan=null;preview();
    if(!permitted())return;
    if(file.size>MAX_BACKUP_BYTES){message(DATA.large,true);return;}
    busy=true;
    try{plan=prepareImport(storage,await file.text(),getSnapshot());message('');preview();}
    catch(error){message(DATA.invalid+' '+(error.message??''),true);}
    finally{busy=false;event.target.value='';}
  });
  root.addEventListener('click',event=>{
    const control=event.target.closest('[data-action]');if(!control)return;
    const selected=control.dataset.action;
    if(selected==='check-update'){checkUpdate();return;}
    if(selected==='backup-cancel'){plan=null;preview();message('');return;}
    if(selected==='backup-export'){
      if(busy)return;
      try{
        const backup=createBackup(storage,getSnapshot(),getSettings());
        const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
        const link=document.createElement('a');link.href=url;link.download=backupFilename(backup);
        root.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
        message(DATA.exported);
      }catch(error){errorMessage(error);}return;
    }
    if(selected==='statistics-reset'){
      if(!permitted())return;
      try{resetPlan=prepareReset(storage);confirm('reset');}catch(error){errorMessage(error);}return;
    }
    if(selected==='backup-merge'&&plan&&!plan.conflicts.length)confirm('merge');
    if(selected==='backup-replace'&&plan)confirm('replace');
  });
  dialog.querySelector('#data-confirm-check').addEventListener('change',event=>{
    dialog.querySelector('#confirm-data-change').disabled=!event.target.checked;
  });
  dialog.querySelector('#cancel-data-change').addEventListener('click',()=>{action=null;resetPlan=null;dialog.close();});
  dialog.addEventListener('cancel',()=>{action=null;resetPlan=null;});
  dialog.querySelector('#confirm-data-change').addEventListener('click',()=>{
    if(!action||!dialog.querySelector('#data-confirm-check').checked||!permitted())return;
    busy=true;dialog.querySelector('#confirm-data-change').disabled=true;
    try{
      if(action==='reset')commitReset(storage,resetPlan);else commitImport(storage,plan,action);
      plan=null;resetPlan=null;dialog.close();message(DATA.success);onCommitted();
    }catch(error){dialog.close();errorMessage(error);}
    finally{busy=false;action=null;}
  });
  return {mount:preview,get busy(){return busy;},get hasPreview(){return !!plan||dialog.open;}};
}
