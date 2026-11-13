/* Portales de empresas, revisión académica y oferta sin registro — CU10-CU16, CU21-CU24 */
(function(){
'use strict';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const root=()=>document.getElementById('portal-area');
let role='',tab='',view=null,careers=[],editingOffer=null,reviewOffer=null,selectedApplicants=null;
const isCompany=()=>role==='Empresa verificada';
const isSecretary=()=>role==='Secretaría Académica';
const isReviewer=()=>['Centro de Estudiantes','Secretaría Académica'].includes(role);
const option=(id,name,chosen)=>'<option value="'+E(id)+'" '+(chosen?'selected':'')+'>'+E(name)+'</option>';
const input=(name,label,value='',type='text',required=false)=>'<div class="field"><label for="portal-'+name+'">'+E(label)+'</label><input id="portal-'+name+'" name="'+name+'" value="'+E(value)+'" type="'+type+'" '+(required?'required':'')+' /></div>';
const area=()=>document.getElementById('portal-content');
function message(text,error=false){
 const m=document.getElementById('portal-message');
 if(m){m.className='alert'+(error?'':' success');m.textContent=text;m.scrollIntoView({block:'nearest',behavior:'smooth'});}
}
async function ensureCareers(){
 if(careers.length)return careers;
 try{const r=await request('careers');careers=r.items;}catch{}
 return careers;
}
async function populateShareCareers(){
 await ensureCareers();
 const sel=document.getElementById('share-careers');if(!sel)return;
 const values=[...sel.selectedOptions].map(x=>x.value);
 sel.innerHTML=careers.map(c=>option(c.id_carrera,c.nombre,values.includes(String(c.id_carrera)))).join('');
}
async function load(){
 if(!root()||!getToken())return;
 try{
  await ensureCareers();
  if(isCompany())view=await request('company-dashboard',{},true);
  else if(isReviewer()){
    const [review,admin]=await Promise.all([
      request('reviewer-dashboard',{},true),
      isSecretary()?request('secretary-dashboard',{},true):Promise.resolve({})
    ]);
    view={...review,...admin};
  }
  render();
 }catch(e){root().innerHTML='<div class="alert">'+E(e.message)+'</div>';}
}
const menuForRole=()=>isCompany()?
 [
 {id:'inicio',label:'Inicio',icon:'inicio',description:'Información general y accesos rápidos de tu empresa.'},
 {id:'empresa',label:'Mi empresa',icon:'empresa',description:'Consultá y actualizá los datos de tu empresa verificada.'},
 {id:'ofertas',label:'Mis ofertas',icon:'ofertas',description:'Publicá y administrá ofertas y consultá postulantes.'},
 {id:'seguridad',label:'Seguridad',icon:'seguridad',description:'Actualizá la contraseña de tu cuenta.'}
 ]:[
 {id:'inicio',label:'Inicio',icon:'inicio',description:'Resumen de gestiones y ofertas del sistema.'},
 {id:'pendientes',label:'Ofertas pendientes',icon:'pendientes',description:'Revisá las ofertas remitidas por empresas sin cuenta.'},
 {id:'aprobadas',label:'Ofertas aprobadas',icon:'aprobadas',description:'Gestioná las ofertas aprobadas de empresas externas.'},
 ...(isSecretary()?[
 {id:'empresas',label:'Empresas verificadas',icon:'empresas',description:'Administrá las empresas habilitadas en la plataforma.'},
 {id:'revisores',label:'Usuarios revisores',icon:'revisores',description:'Gestioná los usuarios del Centro de Estudiantes y Secretaría.'}
 ]:[]),
 {id:'seguridad',label:'Seguridad',icon:'seguridad',description:'Actualizá la contraseña de tu cuenta.'}
 ];
function open(newRole){
 role=newRole;
 if(!isCompany()&&!isReviewer())return;
 const requested=location.hash.replace(/^#/,'').split('/')[1];
 tab=menuForRole().some(x=>x.id===requested)?requested:'inicio';
 root().innerHTML='<div class="status-message">Cargando panel...</div>';
 load();
}
function select(nextTab){
 if(!role||!view)return;
 const valid=menuForRole().some(x=>x.id===nextTab)?nextTab:'inicio';
 if(valid===tab && document.getElementById('portal-content'))return;
 tab=valid;editingOffer=null;reviewOffer=null;selectedApplicants=null;window._portalForm='';
 render();
}
function clear(){role='';tab='inicio';view=null;editingOffer=null;reviewOffer=null;selectedApplicants=null;window._portalForm='';if(root())root().innerHTML='';}
function go(t){navigate('perfil/'+t);}
function portalHome(){
 const label=isCompany()?'Gestión de empresa':'Gestión de revisión';
 const stats=isCompany()?[
  ['Ofertas publicadas',(view.offers||[]).filter(o=>o.estado==='Publicada').length,'Consultá y actualizá tus vacantes'],
  ['Ofertas registradas',(view.offers||[]).length,'Historial de publicaciones'],
  ['Estado de la empresa',view.company?.habilitada?'Habilitada':'Sin habilitar','Cuenta verificada en la plataforma']
 ]:[
  ['Pendientes',(view.pending||[]).length,'Esperan evaluación'],
  ['Ofertas aprobadas',(view.approved||[]).length,'Ofertas externas vigentes'],
  ['Instancia revisora',view.reviewer?.instancia||role,'Funciones según tus permisos']
 ];
 const shortcuts=isCompany()?[
  ['empresa','Perfil de empresa','Actualizá los datos de contacto','empresa'],
  ['ofertas','Administrar ofertas','Publicá empleos o pasantías','ofertas']
 ]:[
  ['pendientes','Revisar pendientes','Evaluá nuevas ofertas laborales','pendientes'],
  ['aprobadas','Ofertas aprobadas','Consultá las publicaciones revisadas','aprobadas']
 ];
 return '<section class="dashboard-welcome"><div><span class="dashboard-kicker">'+E(label.toUpperCase())+'</span>'+
 '<h2>Bienvenido a tu panel</h2><p>Realizá tus gestiones desde un solo lugar, con acceso directo a cada módulo.</p>'+
 '<button type="button" class="btn btn-accent" data-portal-tab="'+shortcuts[0][0]+'">Comenzar gestión ↗</button></div>'+
 '<div class="dashboard-welcome-symbol" aria-hidden="true">✦</div></section>'+
 '<div class="dashboard-metrics">'+stats.map(([name,value,hint])=>
 '<div class="dashboard-metric"><span>'+E(name)+'</span><strong>'+E(value)+'</strong><small>'+E(hint)+'</small></div>').join('')+'</div>'+
 '<div class="dashboard-section-heading"><h2>Accesos rápidos</h2><p>Elegí una sección para continuar</p></div>'+
 '<div class="dashboard-quick-grid">'+shortcuts.map(([id,name,description,icon])=>
 '<button class="dashboard-quick-card" type="button" data-portal-tab="'+E(id)+'"><span class="quick-icon">'+window.BolsaWorkspace.icon(icon)+'</span><strong>'+E(name)+'</strong><small>'+E(description)+'</small><span class="quick-action">Abrir sección →</span></button>').join('')+'</div>';
}
function render(){
 if(!root()||!view)return;
 const items=menuForRole();
 if(!items.some(x=>x.id===tab))tab='inicio';
 const section=items.find(x=>x.id===tab)||items[0];
 const person=isCompany()?(view.company?.razon_social||'Mi empresa'):
   ([view.reviewer?.nombre,view.reviewer?.apellido].filter(Boolean).join(' ')||'Revisor');
 root().innerHTML=window.BolsaWorkspace.shell({
  items,active:section.id,person,
  identifier:isCompany()?(view.company?.ruc||'Empresa verificada'):(view.reviewer?.instancia||role),
  role,title:section.id==='inicio'?'Panel de gestión':section.label,
  description:section.description,
  contentId:'portal-content',messageId:'portal-message'
 });
 if(tab==='inicio')area().innerHTML=portalHome();
 else if(isCompany()){
  if(tab==='empresa')area().innerHTML=company();
  if(tab==='ofertas')area().innerHTML=offers();
 }else{
  if(tab==='pendientes')area().innerHTML=reviewList(false);
  if(tab==='aprobadas')area().innerHTML=reviewList(true);
  if(tab==='empresas')area().innerHTML=adminCompanies();
  if(tab==='revisores')area().innerHTML=adminReviewers();
 }
 if(tab==='seguridad')area().innerHTML=security();
}
function company(){
 const c=view.company||{};
 return '<h2>Perfil de mi empresa</h2><p class="muted">El RUC fue verificado por Secretaría Académica y no puede modificarse.</p>'+
 '<form id="company-form" class="student-form">'+'<div class="field"><label for="portal-ruc">RUC (no editable)</label><input id="portal-ruc" name="ruc" value="'+E(c.ruc)+'" readonly /></div>'+input('razon_social','Razón social',c.razon_social,'text',true)+
 '<div class="field"><label for="portal-descripcion">Descripción</label><textarea id="portal-descripcion" name="descripcion" rows="4">'+E(c.descripcion)+'</textarea></div>'+
 '<div class="field-grid">'+input('persona_contacto','Persona de contacto',c.persona_contacto,'text',true)+input('correo_contacto','Correo de contacto',c.correo_contacto,'email',true)+input('telefono','Teléfono',c.telefono,'tel')+'</div>'+
 '<button class="btn btn-primary" type="submit">Guardar perfil</button></form>';
}
function careersPicker(chosen=[]){
 return '<div class="field"><label for="portal-carreras">Carreras relacionadas *</label><select id="portal-carreras" name="carreras" multiple size="4" required>'+careers.map(c=>option(c.id_carrera,c.nombre,chosen.includes(c.id_carrera))).join('')+'</select><small class="muted">Podés seleccionar varias carreras manteniendo pulsado Ctrl.</small></div>';
}
function offerForm(o={}){
 const edit=Boolean(o.id_oferta);
 const indefinite=o.vigencia_indefinida??true;
 return '<form id="company-offer-form" class="student-form item-form"><h3>'+(edit?'Editar':'Publicar nueva')+' oferta</h3>'+
 '<div class="field-grid">'+input('titulo','Título',o.titulo||'','text',true)+
 '<div class="field"><label for="portal-tipo">Tipo</label><select name="tipo" id="portal-tipo">'+['Empleo','Pasantía'].map(t=>option(t,t,o.tipo===t)).join('')+'</select></div></div>'+
 '<div class="field"><label for="portal-descripcion-oferta">Descripción</label><textarea name="descripcion" id="portal-descripcion-oferta" rows="4" required>'+E(o.descripcion)+'</textarea></div>'+
 '<div class="field"><label for="portal-requisitos">Requisitos</label><textarea name="requisitos" id="portal-requisitos" rows="3" required>'+E(o.requisitos)+'</textarea></div>'+careersPicker((o.carreras||[]).map(x=>x.id_carrera))+
 '<label class="checkbox-label"><input type="checkbox" id="portal-indefinida" name="vigencia_indefinida" '+(indefinite?'checked':'')+' /> Vigencia indefinida</label>'+
 '<div class="field"><label for="portal-fin">Fecha de vencimiento (si no es indefinida)</label><input name="fecha_vencimiento" id="portal-fin" type="date" value="'+E(o.fecha_vencimiento||'')+'" /></div>'+
 '<div class="inline-actions"><button class="btn btn-primary" type="submit">'+(edit?'Guardar cambios':'Publicar')+'</button><button class="btn btn-secondary" type="button" data-cancel-offer>Cancelar</button></div></form>';
}
function offers(){
 let html='<h2>Mis ofertas</h2><p class="muted">Publicá empleos o pasantías; las ofertas quedan visibles sin revisión previa.</p>';
 if(editingOffer!==null){html+=offerForm(editingOffer);return html;}
 html+='<button class="btn btn-primary" data-new-offer>Publicar oferta</button>';
 const list=view.offers||[];
 html+=list.length?'<div class="compact-list">'+list.map(o=>
  '<div class="compact-item"><div><strong>'+E(o.titulo)+'</strong><small>'+E(o.tipo)+' · '+E(o.estado)+(o.vigencia_indefinida?' · Indefinida':' · '+E(o.fecha_vencimiento||''))+'</small></div>'+
  '<div class="compact-actions"><button class="text-button" data-view-applicants="'+o.id_oferta+'">Postulantes</button>'+
  (o.estado==='Publicada'?'<button class="text-button" data-edit-offer="'+o.id_oferta+'">Editar</button><button class="text-button danger" data-drop-offer="'+o.id_oferta+'">Dar de baja</button>':'')+'</div></div>').join('')+'</div>':'<div class="status-message">Aún no publicaste ofertas.</div>';
 if(selectedApplicants)html+=applicantsHtml();
 return html;
}
function applicantsHtml(){
 const a=selectedApplicants;return '<div class="student-collection"><h3>Postulantes: '+E(a.title)+'</h3>'+
 (a.applicants?.length?'<div class="compact-list">'+a.applicants.map(p=>
  '<div class="compact-item"><div><strong>'+E(p.nombre)+' '+E(p.apellido)+'</strong><small>'+E(p.matricula)+' · '+E(p.estado)+' · '+new Date(p.fecha_postulacion).toLocaleDateString('es-PY')+'</small><small>Habilidades: '+E(p.perfil?.habilidades||'Sin cargar')+'</small></div>'+
  (p.cv?'<button class="btn btn-secondary" data-applicant-cv="'+p.id_postulacion+'">Ver CV</button>':'<span class="muted">Sin CV</span>')+'</div>').join('')+'</div>':'<div class="status-message">Esta oferta aún no tiene postulantes.</div>')+'</div>';
}
function reviewList(approved){
 const items=approved?view.approved:view.pending;
 let html='<h2>'+(approved?'Ofertas aprobadas de empresas no verificadas':'Ofertas pendientes')+'</h2>'+
 '<p class="muted">'+(approved?'Podés modificar o dar de baja una oferta aprobada sin prolongar su vencimiento.':'Revisá los datos antes de aprobar o rechazar.')+'</p>';
 if(!items?.length)return html+'<div class="status-message">No hay ofertas en esta sección.</div>';
 html+='<div class="compact-list">'+items.map(o=>
  '<article class="compact-item"><div><strong>'+E(o.titulo)+'</strong><small>'+E(o.tipo)+' · '+E(o.empresa?.razon_social||'Empresa remitente')+'</small></div><button class="btn btn-secondary" data-review-detail="'+o.id_oferta+'">Ver detalle</button></article>').join('')+'</div>';
 if(reviewOffer)html+=reviewDetail(approved);
 return html;
}
function reviewDetail(approved){
 const p=reviewOffer,o=p.offer,c=p.sender||{},media=p.media?.[0]||{};
 return '<div class="student-collection"><h3>Detalle: '+E(o.titulo)+'</h3>'+
 '<p><strong>Empresa:</strong> '+E(c.razon_social)+' · '+E(c.persona_contacto)+'</p><p><strong>Contacto:</strong> '+E(c.correo_contacto)+' · '+E(c.telefono_contacto)+'</p>'+
 '<p><strong>Tipo:</strong> '+E(o.tipo)+'</p><p><strong>Estado:</strong> '+E(o.estado)+'</p>'+
 '<p class="preserve-lines">'+E(o.descripcion)+'</p><p><strong>Requisitos:</strong> '+E(o.requisitos)+'</p>'+
 '<p><strong>Medio de postulación:</strong> '+E(media.tipo)+' — '+E(media.valor)+'</p>'+
 (p.attachments?.length?'<h4>Adjuntos</h4>'+p.attachments.map(x=>'<button class="btn btn-secondary" data-review-attachment="'+x.id_adjunto+'">'+E(x.nombre_archivo)+'</button>').join(''):'')+
 (approved?'<form id="approved-edit-form" class="student-form item-form">'+
 input('titulo','Título',o.titulo,'text',true)+
 '<div class="field"><label for="portal-aprobada-descripcion">Descripción</label><textarea name="descripcion" id="portal-aprobada-descripcion" rows="3" required>'+E(o.descripcion)+'</textarea></div>'+
 '<div class="field"><label for="portal-aprobada-requisitos">Requisitos</label><textarea name="requisitos" id="portal-aprobada-requisitos" rows="3" required>'+E(o.requisitos)+'</textarea></div>'+
 careersPicker((p.careers||[]).map(x=>x.id_carrera))+
 '<div class="field-grid"><div class="field"><label for="portal-medio_tipo">Medio</label><select name="medio_tipo" id="portal-medio_tipo">'+option('Correo','Correo',media.tipo==='Correo')+option('Enlace','Enlace',media.tipo==='Enlace')+'</select></div>'+input('medio_valor','Correo o enlace',media.valor||'','text',true)+'</div>'+
 '<div class="inline-actions"><button class="btn btn-primary" type="submit">Guardar cambios</button><button class="btn btn-secondary danger" type="button" data-review-drop="'+o.id_oferta+'">Dar de baja</button></div></form>':
 '<div class="inline-actions"><button class="btn btn-primary" data-review-approve="'+o.id_oferta+'">Aprobar y publicar</button><button class="btn btn-secondary danger" data-review-reject="'+o.id_oferta+'">Rechazar</button></div>')+
 '</div>';
}
function adminCompanies(){
 const list=view.companies||[];
 return '<h2>Empresas verificadas</h2><p class="muted">Secretaría Académica registra y habilita o deshabilita a las empresas.</p>'+
 '<button class="btn btn-primary" data-add-company>Registrar empresa</button>'+
 (list.length?'<div class="compact-list">'+list.map(c=>'<div class="compact-item"><div><strong>'+E(c.razon_social)+'</strong><small>RUC '+E(c.ruc)+' · '+E(c.usuario?.nombre_usuario)+' · '+(c.habilitada?'Habilitada':'Deshabilitada')+'</small></div><button class="text-button" data-edit-company="'+c.id_empresa+'">Modificar</button></div>').join('')+'</div>':'<div class="status-message">No hay empresas verificadas.</div>')+
 (window._portalForm?window._portalForm:'');
}
function adminReviewers(){
 const list=view.reviewers||[];
 return '<h2>Usuarios revisores</h2><p class="muted">Secretaría Académica administra los usuarios del Centro de Estudiantes y de Secretaría.</p>'+
 '<button class="btn btn-primary" data-add-reviewer>Registrar usuario</button>'+
 (list.length?'<div class="compact-list">'+list.map(x=>'<div class="compact-item"><div><strong>'+E(x.nombre)+' '+E(x.apellido)+'</strong><small>'+E(x.instancia)+' · '+E(x.usuario?.nombre_usuario)+' · '+(x.habilitado?'Habilitado':'Deshabilitado')+'</small></div><button class="text-button" data-edit-reviewer="'+x.id_revisor+'">Modificar</button></div>').join('')+'</div>':'<div class="status-message">No hay revisores.</div>')+
 (window._portalForm?window._portalForm:'');
}
function adminForm(kind,x){
 const isC=kind==='company',existing=Boolean(x);
 const mode=existing?(isC?'secretary-company-update':'secretary-reviewer-update'):(isC?'secretary-create-company':'secretary-create-reviewer');
 return '<form id="portal-admin-form" class="student-form item-form" data-admin-action="'+mode+'" data-admin-id="'+E(isC?x?.id_empresa:x?.id_revisor)+'">'+
 '<h3>'+(existing?'Modificar':'Crear')+' '+(isC?'empresa':'usuario revisor')+'</h3>'+
 (existing?'':input('usuario','Nombre de usuario','','text',true)+input('correo','Correo electrónico','','email',true))+
 (isC?input('razon_social','Razón social',x?.razon_social,'text',true)+(existing?'':input('ruc','RUC',x?.ruc,'text',true))+input('persona_contacto','Persona de contacto',x?.persona_contacto,'text',true)+input('telefono','Teléfono',x?.telefono,'tel')+(existing?input('correo_contacto','Correo de contacto',x?.correo_contacto,'email',true):''):
 input('nombre','Nombre',x?.nombre,'text',true)+input('apellido','Apellido',x?.apellido,'text',true)+
 '<div class="field"><label for="portal-instancia">Instancia</label><select name="instancia" id="portal-instancia">'+
 ['Centro de Estudiantes','Secretaría Académica'].map(t=>option(t,t,x?.instancia===t)).join('')+'</select></div>')+
 (existing?'<label class="checkbox-label"><input type="checkbox" name="habilitado" '+((isC?x?.habilitada:x?.habilitado)?'checked':'')+' /> Habilitado</label>':'')+
 '<div class="inline-actions"><button type="submit" class="btn btn-primary">Guardar</button><button type="button" class="btn btn-secondary" data-admin-cancel>Cancelar</button></div></form>';
}
function security(){
 return '<h2>Seguridad de la cuenta</h2><form id="portal-password-form" class="student-form">'+
 input('current_password','Contraseña actual','','password',true)+input('new_password','Nueva contraseña','','password',true)+input('repeat_password','Confirmar nueva contraseña','','password',true)+
 '<button class="btn btn-primary" type="submit">Cambiar contraseña</button></form>';
}
async function perform(action,payload){
 try{
  const resp=await request(action,payload,true);
  if(action==='company-offer-save')editingOffer=null;
  if(action==='reviewer-approved-save')reviewOffer=null;
  if(action.startsWith('secretary-'))window._portalForm='';
  await load();
  message(resp.temporary_password
   ?'Cuenta '+resp.username+' creada. Contraseña temporal (guardala ahora; no se envió por correo): '+resp.temporary_password
   :(resp.message||'Operación completada.'));
  return true;
 }catch(e){message(e.message,true);return false;}
}
async function readFile(file,limits=['pdf','png','jpg','jpeg']){
 if(!file)return {};
 if(file.size>5242880||!limits.some(ext=>file.name.toLowerCase().endsWith('.'+ext)))throw new Error('Adjunto no permitido o superior a 5 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 let bin='';for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return {filename:file.name,file_base64:btoa(bin)};
}
document.addEventListener('click',async e=>{
 const t=e.target.closest('[data-portal-tab]');if(t){window._portalForm='';go(t.dataset.portalTab);return;}
 if(e.target.closest('[data-new-offer]')){editingOffer={};render();return;}
 if(e.target.closest('[data-cancel-offer]')){editingOffer=null;render();return;}
 const edit=e.target.closest('[data-edit-offer]');
 if(edit){
  try{const d=await request('offer-detail',{offer_id:Number(edit.dataset.editOffer)});editingOffer=d.offer;render();}
  catch(err){message(err.message,true);}return;
 }
 const drop=e.target.closest('[data-drop-offer]');
 if(drop){
  if(confirm('¿Dar de baja esta oferta? Las postulaciones activas quedarán cerradas.'))await perform('company-offer-drop',{offer_id:Number(drop.dataset.dropOffer)});
  return;
 }
 const apps=e.target.closest('[data-view-applicants]');
 if(apps){
  try{selectedApplicants=await request('company-applicants',{offer_id:Number(apps.dataset.viewApplicants)},true);render();}
  catch(err){message(err.message,true);}return;
 }
 const cv=e.target.closest('[data-applicant-cv]');
 if(cv){const pop=window.open('about:blank','_blank');try{const r=await request('company-applicant-cv',{application_id:Number(cv.dataset.applicantCv)},true);if(pop)pop.location.href=r.url;else message('Enlace del CV (copiar y abrir): '+r.url);}catch(err){pop?.close();message(err.message,true);}return;}
 const review=e.target.closest('[data-review-detail]');
 if(review){
  try{reviewOffer=await request('reviewer-offer-detail',{offer_id:Number(review.dataset.reviewDetail)},true);render();}
  catch(err){message(err.message,true);}return;
 }
 const attachment=e.target.closest('[data-review-attachment]');
 if(attachment){const pop=window.open('about:blank','_blank');try{const r=await request('reviewer-attachment',{attachment_id:Number(attachment.dataset.reviewAttachment)},true);if(pop)pop.location.href=r.url;else message('Enlace del adjunto (copiar y abrir): '+r.url);}catch(err){pop?.close();message(err.message,true);}return;}
 const approve=e.target.closest('[data-review-approve]');
 if(approve){if(confirm('¿Confirmás la aprobación de esta oferta por 14 días?')){reviewOffer=null;await perform('reviewer-evaluate',{offer_id:Number(approve.dataset.reviewApprove),decision:'Aprobar'});}return;}
 const reject=e.target.closest('[data-review-reject]');
 if(reject){const motivo=prompt('Motivo del rechazo (obligatorio):');if(motivo?.trim()){reviewOffer=null;await perform('reviewer-evaluate',{offer_id:Number(reject.dataset.reviewReject),decision:'Rechazar',motivo});}return;}
 const reviewDrop=e.target.closest('[data-review-drop]');
 if(reviewDrop){if(confirm('¿Dar de baja esta oferta?')){reviewOffer=null;await perform('reviewer-approved-drop',{offer_id:Number(reviewDrop.dataset.reviewDrop)});}return;}
 if(e.target.closest('[data-add-company]')){window._portalForm=adminForm('company',null);render();return;}
 if(e.target.closest('[data-add-reviewer]')){window._portalForm=adminForm('reviewer',null);render();return;}
 const editC=e.target.closest('[data-edit-company]');
 if(editC){const row=view.companies.find(x=>String(x.id_empresa)===editC.dataset.editCompany);window._portalForm=adminForm('company',row);render();return;}
 const editR=e.target.closest('[data-edit-reviewer]');
 if(editR){const row=view.reviewers.find(x=>String(x.id_revisor)===editR.dataset.editReviewer);window._portalForm=adminForm('reviewer',row);render();return;}
 if(e.target.closest('[data-admin-cancel]')){window._portalForm='';render();}
});
document.addEventListener('submit',async e=>{
 const f=e.target;
 if(f.id==='share-offer-form'){
  e.preventDefault();
  const alert=document.getElementById('share-alert');
  try{
   const payload=Object.fromEntries(new FormData(f));
   payload.carreras=[...document.getElementById('share-careers').selectedOptions].map(x=>Number(x.value));
   if(!payload.carreras.length)throw new Error('Seleccioná una carrera.');
   Object.assign(payload,await readFile(document.getElementById('share-file').files?.[0]));
   const result=await request('public-offer-submit',payload);
   f.reset();
   alert.textContent=result.message;alert.className='alert success';
  }catch(err){alert.textContent=err.message;alert.className='alert';}
  return;
 }
 if(f.id==='company-form'){
  e.preventDefault();const d=Object.fromEntries(new FormData(f));delete d.ruc;await perform('company-profile-save',d);
 }else if(f.id==='company-offer-form'){
  e.preventDefault();
  const d=Object.fromEntries(new FormData(f));d.carreras=[...document.getElementById('portal-carreras').selectedOptions].map(o=>Number(o.value));
  d.vigencia_indefinida=document.getElementById('portal-indefinida').checked;
  d.offer_id=editingOffer?.id_oferta||null;
  await perform('company-offer-save',d);
 }else if(f.id==='approved-edit-form'){
  e.preventDefault();
  const d=Object.fromEntries(new FormData(f));
  d.offer_id=reviewOffer?.offer.id_oferta;
  d.carreras=[...document.getElementById('portal-carreras').selectedOptions].map(o=>Number(o.value));
  await perform('reviewer-approved-save',d);
 }else if(f.id==='portal-admin-form'){
  e.preventDefault();
  const d=Object.fromEntries(new FormData(f));
  const action=f.dataset.adminAction;d.id=Number(f.dataset.adminId);
  if(action.endsWith('-update'))d.habilitado=Boolean(f.querySelector('[name="habilitado"]').checked);
  await perform(action,d);
 }else if(f.id==='portal-password-form'){
  e.preventDefault();const d=Object.fromEntries(new FormData(f));
  if(d.new_password.length<8||d.new_password!==d.repeat_password){message('Las contraseñas no coinciden o son demasiado cortas.',true);return;}
  await perform('password-change',d);
 }
});
window.BolsaPortal={open,select,clear,populateShareCareers};
if(location.hash==='#compartir')populateShareCareers();
})();
