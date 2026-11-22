/* Confirmaciones y avisos propios de la Bolsa Laboral — accesibles y responsive */
(function(){
'use strict';
let timer=null;
function notify(message,kind='success'){
 const toast=document.getElementById('toast');
 if(!toast)return;
 if(timer)clearTimeout(timer);
 toast.replaceChildren();
 const icon=document.createElement('span');icon.className='ux-toast-symbol';icon.textContent=kind==='error'?'!':'✓';icon.setAttribute('aria-hidden','true');
 const text=document.createElement('span');text.className='ux-toast-text';text.textContent=String(message||'Operación completada.');
 const close=document.createElement('button');close.type='button';close.className='ux-toast-close';close.setAttribute('aria-label','Cerrar mensaje');close.textContent='×';
 close.addEventListener('click',()=>toast.classList.add('hidden'));
 toast.append(icon,text,close);
 toast.className='toast ux-toast '+(kind==='error'?'ux-toast-error':'ux-toast-success');
 toast.setAttribute('role',kind==='error'?'alert':'status');
 timer=setTimeout(()=>{toast.classList.add('hidden');timer=null;},6000);
}
function confirmAction(message,{title='¿Confirmar acción?',confirmLabel='Confirmar',danger=false}={}){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');
  dialog.className='ux-dialog';
  dialog.setAttribute('aria-labelledby','ux-confirm-heading');
  dialog.innerHTML='<div class="ux-dialog-content"><div class="ux-dialog-emblem" aria-hidden="true">?</div><h2 id="ux-confirm-heading"></h2><p class="ux-dialog-copy"></p><div class="ux-dialog-actions"><button type="button" class="btn btn-secondary" data-ux-cancel>Cancelar</button><button type="button" class="btn btn-primary" data-ux-accept></button></div></div>';
  dialog.querySelector('h2').textContent=title;
  dialog.querySelector('.ux-dialog-copy').textContent=message;
  const accept=dialog.querySelector('[data-ux-accept]');accept.textContent=confirmLabel;
  if(danger)accept.classList.add('ux-danger-action');
  const previous=document.activeElement;
  let settled=false;
  function finish(ok){if(settled)return;settled=true;if(dialog.open)dialog.close();dialog.remove();if(previous?.isConnected)previous.focus();resolve(ok);}
  dialog.querySelector('[data-ux-cancel]').addEventListener('click',()=>finish(false));
  accept.addEventListener('click',()=>finish(true));
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
  dialog.addEventListener('click',event=>{if(event.target===dialog)finish(false);});
  document.body.append(dialog);
  if(typeof dialog.showModal==='function'){dialog.showModal();dialog.querySelector('[data-ux-cancel]').focus();}
  else{finish(window.confirm(message));}
 });
}
function reason(message,{title='Motivo del rechazo'}={}){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='ux-dialog';
  dialog.setAttribute('aria-labelledby','ux-reason-heading');
  dialog.innerHTML='<form class="ux-dialog-content" method="dialog" id="ux-reason-form"><div class="ux-dialog-emblem" aria-hidden="true">!</div><h2 id="ux-reason-heading"></h2><p class="ux-dialog-copy"></p><label class="ux-reason-label" for="ux-reason-input">Motivo de rechazo *</label><textarea id="ux-reason-input" class="ux-reason-input" rows="4" maxlength="1500" required placeholder="Indicá los motivos para que la empresa pueda corregir su oferta."></textarea><span class="ux-reason-error" role="alert" hidden>Ingresá el motivo del rechazo.</span><div class="ux-dialog-actions"><button type="button" class="btn btn-secondary" data-ux-cancel>Cancelar</button><button type="submit" class="btn btn-primary ux-danger-action">Rechazar oferta</button></div></form>';
  dialog.querySelector('h2').textContent=title;
  dialog.querySelector('.ux-dialog-copy').textContent=message;
  const input=dialog.querySelector('textarea'),form=dialog.querySelector('form');
  const previous=document.activeElement;let settled=false;
  function finish(value){if(settled)return;settled=true;if(dialog.open)dialog.close();dialog.remove();if(previous?.isConnected)previous.focus();resolve(value);}
  dialog.querySelector('[data-ux-cancel]').addEventListener('click',()=>finish(null));
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);});
  form.addEventListener('submit',e=>{e.preventDefault();const value=input.value.trim();if(!value){dialog.querySelector('.ux-reason-error').hidden=false;input.focus();return;}finish(value);});
  document.body.append(dialog);
  if(typeof dialog.showModal==='function'){dialog.showModal();input.focus();}
  else{finish(null);}
 });
}
window.BolsaUI={notify,confirm:confirmAction,reason};
})();
