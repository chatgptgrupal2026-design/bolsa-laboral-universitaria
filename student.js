/* Interfaz de estudiante — CU03-CU09, CU19 y CU20 */
(function(){
'use strict';
const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const val=(o,k)=>H(o?.[k]??'');
let data=null;
let activeTab='inicio';
let loading=false;
let editing={};
const el=()=>document.getElementById('student-area');
function info(message,kind='success'){const m=document.getElementById('student-message');if(m){m.textContent=message;m.className='alert '+(kind==='success'?'success':'');m.scrollIntoView({block:'nearest',behavior:'smooth'});}}
async function load(){
 if(loading)return;loading=true;
 try{data=await request('student-dashboard',{},true);render();}
 catch(e){if(el())el().innerHTML='<div class="alert">'+H(e.message)+'</div>';}
 finally{loading=false;}
}
const sections=[
 {id:'inicio',label:'Inicio',icon:'inicio',description:'Un resumen de tu información y tus próximas oportunidades.'},
 {id:'academico',label:'Perfil académico',icon:'academico',description:'Consultá tus datos universitarios y actualizá tu información de contacto.'},
 {id:'profesional',label:'Perfil profesional',icon:'profesional',description:'Organizá tu experiencia, habilidades, idiomas y formación.'},
 {id:'curriculum',label:'Mi currículum',icon:'curriculum',description:'Gestioná tu CV en PDF de manera segura.'},
 {id:'postulaciones',label:'Mis postulaciones',icon:'postulaciones',description:'Seguí tus solicitudes y consultá su estado.'},
 {id:'seguridad',label:'Seguridad',icon:'seguridad',description:'Gestioná la contraseña de acceso a tu cuenta.'}
];
function select(tab){
 const next=sections.some(x=>x.id===tab)?tab:'inicio';
 if(activeTab!==next || !document.getElementById('student-content')){
  activeTab=next;
  if(data)render();
 }
}
function nav(tab){navigate('perfil/'+tab);}
function render(){
 const root=el();if(!root||!getToken()||!data)return;
 const section=sections.find(x=>x.id===activeTab)||sections[0];
 const student=data.student||{};
 root.innerHTML=window.BolsaWorkspace.shell({
   items:sections,active:section.id,
   person:[student.nombre,student.apellido].filter(Boolean).join(' ')||'Estudiante',
   identifier:student.matricula,role:'Estudiante',
   title:section.id==='inicio'?'Bienvenido a tu espacio':section.label,
   description:section.description,contentId:'student-content',messageId:'student-message'
 });
 const c=document.getElementById('student-content');
 if(activeTab==='inicio')c.innerHTML=home();
 if(activeTab==='academico')c.innerHTML=academic();
 if(activeTab==='profesional')c.innerHTML=professional();
 if(activeTab==='curriculum')c.innerHTML=curriculum();
 if(activeTab==='postulaciones'){c.innerHTML='<div class="status-message">Consultando tus postulaciones...</div>';fetchApplications();}
 if(activeTab==='seguridad')c.innerHTML=security();
}
function home(){
 const s=data.student||{},cv=data.cv,prof=data.professional||{};
 const complete=Boolean(prof.habilidades||prof.tecnologias||prof.disponibilidad_laboral);
 const count=(data.experiencias||[]).length;
 return '<section class="dashboard-welcome"><div><span class="dashboard-kicker">TU FUTURO PROFESIONAL EMPIEZA AQUÍ</span>'+
 '<h2>¡Hola, '+H(s.nombre||'estudiante')+'!</h2><p>Administrá tu perfil y preparate para nuevas oportunidades laborales y pasantías.</p>'+
 '<button type="button" class="btn btn-accent" data-go-offers>Explorar ofertas ↗</button></div>'+
 '<div class="dashboard-welcome-symbol" aria-hidden="true">✦</div></section>'+
 '<div class="dashboard-metrics">'+
 '<div class="dashboard-metric"><span>Perfil académico</span><strong>'+H(s.matricula||'Registrado')+'</strong><small>Información universitaria</small></div>'+
 '<div class="dashboard-metric"><span>Perfil profesional</span><strong>'+(complete?'En desarrollo':'Por completar')+'</strong><small>'+count+' experiencia(s) registrada(s)</small></div>'+
 '<div class="dashboard-metric"><span>Currículum vitae</span><strong>'+(cv?'PDF cargado':'Pendiente')+'</strong><small>'+(cv?H(cv.nombre_archivo):'Agregá tu archivo de hasta 5 MB')+'</small></div>'+
 '</div><div class="dashboard-section-heading"><h2>Accesos rápidos</h2><p>Continuá donde lo dejaste</p></div>'+
 '<div class="dashboard-quick-grid">'+
 '<button class="dashboard-quick-card" type="button" data-student-tab="academico"><span class="quick-icon">'+window.BolsaWorkspace.icon('academico')+'</span><strong>Actualizar perfil académico</strong><small>Datos personales y de la facultad</small><span class="quick-action">Abrir sección →</span></button>'+
 '<button class="dashboard-quick-card" type="button" data-student-tab="profesional"><span class="quick-icon">'+window.BolsaWorkspace.icon('profesional')+'</span><strong>Completar perfil profesional</strong><small>Experiencia, habilidades y cursos</small><span class="quick-action">Abrir sección →</span></button>'+
 '<button class="dashboard-quick-card" type="button" data-student-tab="curriculum"><span class="quick-icon">'+window.BolsaWorkspace.icon('curriculum')+'</span><strong>Gestionar mi currículum</strong><small>Cargá o reemplazá tu PDF</small><span class="quick-action">Abrir sección →</span></button>'+
 '</div>';
}
function field(id,label,value,opts={}){
 const extra=opts.readonly?' readonly':'';
 const type=opts.type||'text';
 const req=opts.required?' required':'';
 return '<div class="field"><label for="'+id+'">'+H(label)+'</label><input id="'+id+'" name="'+id+'" type="'+type+'" value="'+H(value)+'"'+extra+req+' /></div>';
}
function academic(){
 const s=data.student;
 return '<div class="dashboard-form-stack">'+
  '<section class="dashboard-detail-card">'+
   '<div class="dashboard-card-heading"><div><span class="dashboard-card-kicker">INFORMACIÓN VERIFICADA</span><h2>Datos universitarios</h2><p>Estos datos provienen del registro académico simulado y no se pueden modificar.</p></div><span class="dashboard-locked-pill">'+window.BolsaWorkspace.icon('seguridad')+' Verificados</span></div>'+
   '<div class="field-grid dashboard-readonly-grid">'+
    field('academico-matricula','Matrícula',s.matricula,{readonly:true})+
    field('academico-cedula','Cédula de identidad',s.cedula,{readonly:true})+
    field('academico-nombre','Nombre',s.nombre,{readonly:true})+
    field('academico-apellido','Apellido',s.apellido,{readonly:true})+
   '</div></section>'+
  '<section class="dashboard-detail-card">'+
   '<div class="dashboard-card-heading"><div><span class="dashboard-card-kicker">INFORMACIÓN EDITABLE</span><h2>Datos personales y académicos</h2><p>Mantené actualizados tus datos de contacto y tu situación académica.</p></div></div>'+
   '<form id="academic-form" class="student-form"><div class="field-grid">'+
    field('academico-email','Correo electrónico',s.correo,{type:'email',required:true})+
    field('academico-telefono','Teléfono',s.telefono,{type:'tel'})+
    field('academico-fecha','Fecha de nacimiento',s.fecha_nacimiento,{type:'date'})+
    '<div class="field"><label for="academico-carrera">Carrera</label><select id="academico-carrera" name="id_carrera" required>'+data.carreras.map(c=>'<option value="'+c.id_carrera+'" '+(c.id_carrera===s.id_carrera?'selected':'')+'>'+H(c.nombre)+'</option>').join('')+'</select></div>'+
   '</div><div class="dashboard-semester-field">'+
    '<div class="field"><label for="academico-semestre">Semestre actual</label><input id="academico-semestre" type="number" min="1" max="20" value="'+H(s.semestre_actual??'')+'" placeholder="Ej.: 5" /></div>'+
   '</div><div class="dashboard-form-actions"><span>Los cambios se guardarán en tu perfil.</span><button class="btn btn-primary" type="submit">Guardar cambios</button></div></form>'+
  '</section>'+
 '</div>';
}
function professional(){
 const p=data.professional||{};
 const collections=[
 ['experiencia','Experiencia laboral',data.experiencias,'id_experiencia',['empresa','cargo','fecha_inicio','fecha_fin']],
 ['idioma','Idiomas',data.idiomas,'id_idioma',['nombre','nivel']],
 ['capacitacion','Cursos y certificaciones',data.capacitaciones,'id_capacitacion',['tipo','nombre','institucion','anio']]
 ];
 return '<section class="dashboard-detail-card"><div class="dashboard-card-heading"><div><span class="dashboard-card-kicker">INFORMACIÓN PROFESIONAL</span><h2>Habilidades y disponibilidad</h2><p>Completá tu información para que las empresas la consulten cuando te postules.</p></div></div>'+
 '<form id="professional-form" class="student-form"><div class="field"><label for="prof-habilidades">Habilidades</label><textarea id="prof-habilidades" rows="3" maxlength="1500" placeholder="Comunicación, trabajo en equipo...">'+H(p.habilidades)+'</textarea></div>'+
 '<div class="field"><label for="prof-tecnologias">Tecnologías</label><textarea id="prof-tecnologias" rows="3" maxlength="1500" placeholder="Herramientas y tecnologías que manejás">'+H(p.tecnologias)+'</textarea></div>'+
 '<div class="field"><label for="prof-disponibilidad">Disponibilidad laboral</label><select id="prof-disponibilidad"><option value="">Seleccionar...</option>'+['Tiempo completo','Medio tiempo','Pasantía','Por horas','A convenir'].map(x=>'<option '+(x===p.disponibilidad_laboral?'selected':'')+'>'+x+'</option>').join('')+'</select></div>'+
 '<div class="dashboard-form-actions"><span>Actualizá esta información cuando lo necesites.</span><button class="btn btn-primary" type="submit">Guardar cambios</button></div></form></section>'+
 collections.map(([key,title,items,idField,fields])=>collection(key,title,items,idField,fields)).join('');
}
const names={empresa:'Empresa',cargo:'Cargo',fecha_inicio:'Fecha de inicio',fecha_fin:'Fecha de finalización',nombre:'Nombre',nivel:'Nivel',tipo:'Tipo',institucion:'Institución',anio:'Año'};
function collection(type,title,items,key,fields){
 const current=editing[type];
 return '<section class="student-collection"><div class="collection-title"><h3>'+title+'</h3><button class="btn btn-secondary" data-add-item="'+type+'">Agregar</button></div>'+
 (items.length?'<div class="compact-list">'+items.map(x=>'<div class="compact-item"><div><strong>'+H(x.empresa||x.nombre||'Registro')+'</strong><small>'+H(x.cargo||x.nivel||x.institucion||x.tipo||'')+'</small></div><div class="compact-actions"><button class="text-button" data-edit-item="'+type+'" data-item-id="'+x[key]+'">Editar</button><button class="text-button danger" data-delete-item="'+type+'" data-item-id="'+x[key]+'">Eliminar</button></div></div>').join('')+'</div>':'<p class="muted">Todavía no registraste información.</p>')+
 (current?'<form class="item-form student-form" data-item-form="'+type+'"><h4>'+(current.id?'Editar':'Agregar')+' '+title.toLowerCase()+'</h4><div class="field-grid">'+fields.map(f=>field('item-'+f,names[f],current.values?.[f]||'',{type:f.startsWith('fecha_')?'date':f==='anio'?'number':'text'})).join('')+'</div><div class="inline-actions"><button type="submit" class="btn btn-primary">Guardar</button><button type="button" class="btn btn-secondary" data-cancel-item="'+type+'">Cancelar</button></div></form>':'')+'</section>';
}
function curriculum(){
 const cv=data.cv;
 return '<section class="dashboard-detail-card"><div class="dashboard-card-heading"><div><span class="dashboard-card-kicker">CURRÍCULUM VITAE</span><h2>Tu documento profesional</h2><p>Podés subir o reemplazar tu CV en formato PDF (máximo 5 MB).</p></div></div>'+
 (cv?'<div class="compact-item"><div><strong>'+H(cv.nombre_archivo)+'</strong><small>Subido: '+new Date(cv.fecha_carga).toLocaleDateString('es-PY')+' · '+(cv.tamano_bytes/1024).toFixed(0)+' KB</small></div><button class="btn btn-secondary" id="view-cv">Ver PDF</button></div>':'<div class="status-message">Todavía no cargaste tu currículum.</div>')+
 '<form id="cv-form" class="student-form"><div class="field"><label for="cv-file">Seleccionar PDF</label><input id="cv-file" type="file" accept="application/pdf,.pdf" required /></div><button type="submit" class="btn btn-primary">'+(cv?'Reemplazar':'Cargar')+' currículum</button></form></section>';
}
function security(){
 return '<section class="dashboard-detail-card"><div class="dashboard-card-heading"><div><span class="dashboard-card-kicker">PROTECCIÓN DE LA CUENTA</span><h2>Cambiar contraseña</h2><p>Para proteger tu cuenta, ingresá la contraseña actual antes de guardar una nueva.</p></div></div>'+
 '<form id="password-form" class="student-form">'+field('actual-password','Contraseña actual','',{type:'password',required:true})+field('nueva-password','Nueva contraseña (mínimo 8 caracteres)','',{type:'password',required:true})+field('repetir-password','Confirmar nueva contraseña','',{type:'password',required:true})+'<button class="btn btn-primary" type="submit">Cambiar contraseña</button></form></section>';
}
async function fetchApplications(){
 try{
  const r=await request('student-applications',{},true);
  const c=document.getElementById('student-content');if(!c||activeTab!=='postulaciones')return;
  c.innerHTML='<div class="dashboard-section-heading"><h2>Historial de postulaciones</h2><p>Seguimiento de tus solicitudes</p></div>'+
  (r.items.length?'<div class="compact-list">'+r.items.map(a=>{
    const o=a.oferta_laboral||{};
    return '<article class="application-item"><div><strong>'+H(o.titulo||'Oferta')+'</strong><small>'+H(o.tipo||'')+' · '+new Date(a.fecha_postulacion).toLocaleDateString('es-PY')+'</small><span class="pill">'+H(a.estado)+'</span></div><div class="compact-actions"><button type="button" class="text-button" data-open-offer="'+a.id_oferta+'">Ver oferta</button>'+(a.estado==='Activa'?'<button class="text-button danger" data-withdraw="'+a.id_postulacion+'">Retirar</button>':'')+'</div></article>';
   }).join('')+'</div>':'<div class="status-message">Aún no te postulaste a ninguna oferta.</div>');
 }catch(e){const c=document.getElementById('student-content');if(c)c.innerHTML='<div class="alert">'+H(e.message)+'</div>';}
}
function rowHTML(label,value){return '<p><strong>'+label+':</strong> '+H(value||'No informado')+'</p>';}
async function showOffer(id){
 if(!getToken()){navigate('login');return;}
 const modal=document.getElementById('offer-modal');
 if(!modal)return;
 modal.innerHTML='<div class="modal-body"><p>Cargando detalle...</p><button class="btn btn-secondary" data-close-offer>Cerrar</button></div>';
 if(!modal.open)modal.showModal();
 try{
  const r=await request('offer-detail',{offer_id:Number(id)});
  const o=r.offer;
  const expired=o.estado!=='Publicada'||(!o.vigencia_indefinida&&o.fecha_vencimiento&&o.fecha_vencimiento<new Date().toISOString().slice(0,10));
  modal.innerHTML='<div class="modal-body"><button class="close-dialog" data-close-offer aria-label="Cerrar">×</button><span class="eyebrow dark">'+H(o.tipo)+'</span><h2>'+H(o.titulo)+'</h2>'+
  rowHTML('Empresa',o.empresa)+rowHTML('Carreras',o.carreras.map(x=>x.nombre).join(', '))+
  rowHTML('Estado',o.estado)+(o.vigencia_indefinida?rowHTML('Vigencia','Indefinida'):rowHTML('Fecha de vencimiento',o.fecha_vencimiento))+
  '<h3>Descripción</h3><p class="preserve-lines">'+H(o.descripcion)+'</p><h3>Requisitos</h3><p class="preserve-lines">'+H(o.requisitos||'No especificados')+'</p>'+
  (o.verificada?(expired?'<p class="alert">Esta oferta no admite postulaciones.</p>':'<button class="btn btn-primary" data-apply="'+o.id_oferta+'">Postularme</button>'):
  '<div class="info-card"><strong>Empresa no verificada</strong><p>Aprobada por: '+H(o.aprobada_por||'Instancia revisora')+'</p>'+o.medios.map(m=>{
    const val=String(m.valor||'');
    if(m.tipo==='Enlace' && /^https:\/\//i.test(val))return '<p><a href="'+H(val)+'" target="_blank" rel="noopener noreferrer">Abrir enlace externo de postulación</a></p>';
    if(m.tipo==='Correo' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))return '<p><a href="mailto:'+H(val)+'">Enviar correo de postulación: '+H(val)+'</a></p>';
    return rowHTML(H(m.tipo||'Medio de contacto'),val);
  }).join('')+'</div>')+
  '<button class="btn btn-secondary" data-close-offer>Cerrar</button></div>';
 }catch(e){modal.innerHTML='<div class="modal-body"><p class="alert">'+H(e.message)+'</p><button class="btn btn-secondary" data-close-offer>Cerrar</button></div>';}
}
async function perform(action,body,message){
 try{const result=await request(action,body,true);await load();info(result.message||message);return true;}
 catch(e){info(e.message,'error');return false;}
}
document.addEventListener('click',async e=>{
 const tab=e.target.closest('[data-student-tab]');if(tab){nav(tab.dataset.studentTab);return;}
 if(e.target.closest('[data-go-offers]')){navigate('ofertas');return;}
 const add=e.target.closest('[data-add-item]');if(add){editing[add.dataset.addItem]={id:null,values:{}};render();return;}
 const cancel=e.target.closest('[data-cancel-item]');if(cancel){delete editing[cancel.dataset.cancelItem];render();return;}
 const edit=e.target.closest('[data-edit-item]');if(edit){
   const type=edit.dataset.editItem;
   const config={experiencia:['experiencias','id_experiencia'],idioma:['idiomas','id_idioma'],capacitacion:['capacitaciones','id_capacitacion']}[type];
   const found=data[config[0]].find(x=>String(x[config[1]])===edit.dataset.itemId);
   if(found){editing[type]={id:found[config[1]],values:found};render();}
   return;
 }
 const del=e.target.closest('[data-delete-item]');if(del){
   if(confirm('¿Eliminar este registro?'))await perform('student-item-remove',{item_type:del.dataset.deleteItem,item_id:Number(del.dataset.itemId)},'Registro eliminado.');
   return;
 }
 const offer=e.target.closest('[data-open-offer]');if(offer){await showOffer(offer.dataset.openOffer);return;}
 if(e.target.closest('[data-close-offer]')){document.getElementById('offer-modal')?.close();return;}
 const view=e.target.closest('#view-cv');if(view){
   const pop=window.open('about:blank','_blank');
   try{const res=await request('student-cv-view',{},true);if(pop)pop.location.href=res.url;else info('Enlace del PDF (copiar y abrir): '+res.url);}
   catch(error){pop?.close();info(error.message,'error');}
   return;
 }
 const apply=e.target.closest('[data-apply]');if(apply){
   if(confirm('¿Confirmás tu postulación a esta oferta?')){
     const ok=await perform('student-apply',{offer_id:Number(apply.dataset.apply)},'Postulación registrada.');
     if(ok){document.getElementById('offer-modal')?.close();nav('postulaciones');}
   }return;
 }
 const withdraw=e.target.closest('[data-withdraw]');if(withdraw){
   if(confirm('¿Retirar tu postulación? No podrás postularte nuevamente a esta oferta.')){
     const ok=await perform('student-withdraw',{application_id:Number(withdraw.dataset.withdraw)},'Postulación retirada.');
     if(ok)nav('postulaciones');
   }return;
 }
});
document.addEventListener('submit',async e=>{
 const f=e.target;
 if(f.id==='academic-form'){
  e.preventDefault();
  await perform('student-academic-save',{
   correo:document.getElementById('academico-email').value,
   telefono:document.getElementById('academico-telefono').value,
   fecha_nacimiento:document.getElementById('academico-fecha').value,
   id_carrera:Number(document.getElementById('academico-carrera').value),
   semestre_actual:document.getElementById('academico-semestre').value
  },'Datos académicos guardados.');
 }else if(f.id==='professional-form'){
  e.preventDefault();await perform('student-professional-save',{
   habilidades:document.getElementById('prof-habilidades').value,
   tecnologias:document.getElementById('prof-tecnologias').value,
   disponibilidad_laboral:document.getElementById('prof-disponibilidad').value
  },'Perfil profesional guardado.');
 }else if(f.dataset.itemForm){
  e.preventDefault();const type=f.dataset.itemForm;const input=Object.fromEntries(new FormData(f));
  const values={};for(const [k,v] of Object.entries(input))values[k.replace('item-','')]=v;
  const entry=editing[type];
  const ok=await perform('student-item-save',{item_type:type,item_id:entry.id,...values},'Registro guardado.');
  if(ok){delete editing[type];render();}
 }else if(f.id==='password-form'){
  e.preventDefault();
  const current=document.getElementById('actual-password').value;
  const next=document.getElementById('nueva-password').value;
  const repeat=document.getElementById('repetir-password').value;
  if(next.length<8||next!==repeat){info('La nueva contraseña debe tener al menos 8 caracteres y coincidir con la confirmación.','error');return;}
  const ok=await perform('password-change',{current_password:current,new_password:next},'Contraseña actualizada.');
  if(ok)f.reset();
 }else if(f.id==='cv-form'){
  e.preventDefault();
  const file=document.getElementById('cv-file').files?.[0];
  if(!file){info('Seleccioná un PDF.','error');return;}
  if(file.size>5242880 || !/\.pdf$/i.test(file.name)){info('Seleccioná un archivo PDF de hasta 5 MB.','error');return;}
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(bytes[0]!==37||bytes[1]!==80||bytes[2]!==68||bytes[3]!==70||bytes[4]!==45){info('El archivo no es un PDF válido.','error');return;}
  let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
  await perform('student-cv-upload',{filename:file.name,file_base64:btoa(raw)},'Currículum cargado.');
 }
});
window.BolsaStudent={
 open(){
  if(!getToken())return;
  const root=el();if(!root)return;
  const route=location.hash.replace(/^#/,'').split('/');
  activeTab=sections.some(x=>x.id===route[1])?route[1]:'inicio';
  root.innerHTML='<div class="status-message">Cargando información del estudiante...</div>';
  load();
 },
 select,
 clear(){data=null;activeTab='inicio';editing={};if(el())el().innerHTML='';},
 showOffer
};

})();
