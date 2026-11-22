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
window.BolsaUI={notify,confirm:confirmAction};
})();
