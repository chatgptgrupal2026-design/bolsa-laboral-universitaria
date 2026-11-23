/* =====================================================
   MÓDULO: APLICACIÓN PRINCIPAL (FRONTEND)
   Centraliza la navegación, el acceso a la API y las
   pantallas públicas de registro e inicio de sesión.
   ===================================================== */
'use strict';
// Dirección pública del servicio backend desplegado en Supabase.
const API = 'https://fxbhnyvlekulmuvvmrlr.supabase.co/functions/v1/bolsa-api';
const state = {screen: 'inicio', offers: [], profile: null, token: ''};
const $ = (selector) => document.querySelector(selector);
const screens = new Set(['inicio', 'ofertas', 'registro', 'login', 'perfil', 'compartir', 'recuperar', 'restablecer']);
const ROLES_PUEDEN_COMPARTIR = ['Empresa verificada','Secretaría Académica'];
const canShareOffer = () => !getToken() || ROLES_PUEDEN_COMPARTIR.includes(state.profile?.tipo);
// Recupera la sesión existente; no contiene la contraseña del usuario.
const getToken = () => sessionStorage.getItem('bolsa-token') || localStorage.getItem('bolsa-token') || '';
function clean(text) {return String(text ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function setAlert(id, message, success = false){const el = $(id);el.textContent = message;el.className = 'alert' + (success ? ' success' : '');}
function clearAlert(id){const el=$(id);el.textContent='';el.className='alert hidden';}
function setBusy(buttonId, busy, label){const el=$(buttonId);el.disabled=busy;el.textContent=busy?'Procesando...':label;}
/* =====================================================
   MÓDULO: COMUNICACIÓN CON EL BACKEND
   Envía solicitudes HTTP con una acción y sus datos.
   Adjunta el token únicamente cuando el módulo lo pide.
   ===================================================== */
async function request(action, extras={}, useToken=false){
  const headers = {'content-type':'application/json'};
  if (useToken && getToken()) headers.authorization = 'Bearer ' + getToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ['student-cv-upload','public-offer-submit'].includes(action)?60000:15000);
  try {
    const res=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,...extras}),signal:ctrl.signal});
    const json=await res.json().catch(()=>({ok:false,error:'No se recibió una respuesta válida del servidor.'}));
    if (!res.ok || !json.ok) throw new Error(json.error||'No fue posible realizar la operación.');
    return json;
  }catch(error){
    if(error.name==='AbortError') throw new Error('El servidor tardó demasiado en responder.');
    if(error instanceof TypeError) throw new Error('No fue posible conectar con el servidor.');
    throw error;
  }finally{clearTimeout(timer);}
}
function closeMobileNavigation(){
 const header=document.querySelector('.topbar');
 const trigger=$('#mobile-menu-toggle');
 header?.classList.remove('is-open');
 if(trigger){
  trigger.setAttribute('aria-expanded','false');
  trigger.setAttribute('aria-label','Abrir menú de navegación');
 }
}
/* =====================================================
   MÓDULO: NAVEGACIÓN Y CONTROL DE PANTALLAS
   Cambia de vista y limita las páginas que requieren sesión.
   La autorización definitiva siempre se valida en el backend.
   ===================================================== */
function navigate(target,fromHistory=false){
 const route=String(target||'inicio').replace(/^#/,'').split('/');
 let to=route[0],section=route[1]||'inicio';
 if(!screens.has(to))to='inicio';
 // La portada y el registro son públicos; el catálogo requiere una cuenta.
 if(to==='ofertas' && !getToken()){to='login';section='inicio';}
 if(getToken() && ['registro','login','recuperar','restablecer'].includes(to)){to='perfil';section='inicio';}
 // CU14: las empresas sin cuenta sí pueden compartir ofertas; los estudiantes autenticados no usan ese formulario.
 if(to==='compartir' && !canShareOffer()){
  if(!getToken()){to='login';}
  else if(!state.profile){
   request('me',{},true).then(result=>{
    state.profile=result.profile;
    updateHeader();
    navigate(canShareOffer()?'compartir':'perfil/inicio');
   }).catch(()=>{logout(false);navigate('login');});
   return;
  }else{to='perfil';section='inicio';}
 }
 const previous=state.screen;
 state.screen=to;
 closeMobileNavigation();
 const dest=to==='perfil'?'perfil/'+section:to;
 if(!fromHistory && location.hash!=='#'+dest)history.pushState(null,'','#'+dest);
 if(fromHistory && location.hash!=='#'+dest)history.replaceState(null,'','#'+dest);
 for(const el of document.querySelectorAll('[data-screen]'))el.classList.toggle('hidden',el.dataset.screen!==to);
 for(const el of document.querySelectorAll('.nav [data-nav]'))el.classList.toggle('active',el.dataset.nav===to||(to==='perfil'&&el.dataset.nav==='perfil'));
 window.scrollTo({top:0,behavior:'instant'});
 if(to==='ofertas'&&previous!=='ofertas')loadOffers();
 if(to==='perfil'){
  if(previous!=='perfil'||!state.profile)loadProfile();
  else if(state.profile.tipo==='Estudiante')window.BolsaStudent?.select(section);
  else window.BolsaPortal?.select(section);
 }
 if(to==='compartir')window.BolsaPortal?.populateShareCareers();
}
function updateHeader(){
 const loggedIn=Boolean(getToken());
 const nav=$('#nav-session');
 nav.textContent=loggedIn?'Mi espacio':'Iniciar sesión';
 nav.dataset.nav=loggedIn?'perfil':'login';
 // Ocultar todos los accesos a Registrarse/Crear cuenta mientras haya sesión.
 for(const btn of document.querySelectorAll('[data-nav="registro"]')) btn.classList.toggle('hidden',loggedIn);
 // El catálogo sigue siendo privado; el envío externo CU14 es público.
 const offerAccess=loggedIn&&Boolean(state.profile?.tipo);
 for(const btn of document.querySelectorAll('.nav [data-nav="ofertas"]'))btn.classList.toggle('hidden',!offerAccess);
 const heroCta=$('#hero-offers-cta');
 if(heroCta){heroCta.dataset.nav=loggedIn?'ofertas':'login';heroCta.innerHTML=loggedIn?'Explorar oportunidades <span aria-hidden="true">↗</span>':'Iniciar sesión para ver ofertas <span aria-hidden="true">↗</span>';}
 const shareVisible=canShareOffer();
 for(const btn of document.querySelectorAll('[data-nav="compartir"]'))btn.classList.toggle('hidden',!shareVisible);
 const panel=$('#company-share-panel');
 if(panel)panel.classList.toggle('hidden',!shareVisible);
}
// Solicita al backend las ofertas consultables por la sesión actual.
async function loadOffers(){
 if(!getToken()){navigate('login');return;}
 const token=getToken();
 const status=$('#offers-status'),list=$('#offers-list');
 status.classList.remove('hidden');status.textContent='Cargando ofertas...';list.innerHTML='';
 state.offers=[];
 try{
   const [offerData,careerData]=await Promise.all([request('offers',{},true),request('careers')]);
   // Una petición anterior no puede reinsertar ofertas después de cerrar sesión.
   if(token!==getToken()||state.screen!=='ofertas')return;
   state.offers=offerData.items||[];
   const select=$('#filter-career');
   const selected=select.value;
   select.innerHTML='<option value="">Todas las carreras</option>'+careerData.items.map(c=>'<option value="'+c.id_carrera+'">'+clean(c.nombre)+'</option>').join('');
   select.value=selected;
   renderOffers();
 }catch(err){
  if(token!==getToken())return;
  if(/iniciá sesión|cuenta habilitada|sesión inválida/i.test(err.message)){
   logout(false);navigate('login');setAlert('#login-alert','Ingresá con tu cuenta para consultar las ofertas laborales.');return;
  }
  status.textContent=err.message+' Intentá nuevamente.';
 }
}
// Aplica los filtros visibles por carrera y tipo a las ofertas recibidas.
function renderOffers(){
 const type=$('#filter-type').value,career=$('#filter-career').value;
 const results=state.offers.filter(o=>(!type||o.tipo===type)&&(!career||(o.carreras||[]).some(c=>String(c.id_carrera)===career)));
 const status=$('#offers-status'),list=$('#offers-list');
 if(!results.length){
  status.classList.remove('hidden');
  status.textContent=state.offers.length?'No se encontraron ofertas con los filtros seleccionados.':'Todavía no hay ofertas publicadas. Volvé a consultar más adelante.';
  list.innerHTML='';return;
 }
 status.classList.add('hidden');
 list.innerHTML=results.map(o=>{
 const expired=o.estado==='Vencida'||(o.fecha_vencimiento&&!o.vigencia_indefinida&&new Date(o.fecha_vencimiento+'T23:59:59')<new Date());
 return `<article class="offer"><div class="offer-meta"><span class="pill">${clean(o.tipo)}</span>${expired?'<span class="pill expired">Vencida</span>':''}</div><h3>${clean(o.titulo)}</h3><p>${clean(o.descripcion).slice(0,240)}</p><p><strong>Carrera(s):</strong> ${(o.carreras||[]).map(c=>clean(c.nombre)).join(', ')||'Todas'}</p><p><strong>Vigencia:</strong> ${o.vigencia_indefinida?'Indefinida':clean(o.fecha_vencimiento||'Sin definir')}</p><button class="btn btn-secondary" type="button" data-open-offer="${o.id_oferta}">Ver detalle</button></article>`;
 }).join('');
}
// Recupera el perfil y activa el panel correspondiente al rol autenticado.
async function loadProfile(){
 const card=$('#profile-card');
 if(!getToken()){navigate('login');return;}
 card.classList.remove('hidden');
 card.innerHTML='<p>Cargando tu espacio...</p>';
 try{
  const data=await request('me',{},true);
  state.profile=data.profile;
  updateHeader();
  const perfil=data.profile;
  if(perfil.tipo==='Estudiante'){
   window.BolsaPortal?.clear();
   window.BolsaStudent?.open();
  }else{
   window.BolsaStudent?.clear();
   window.BolsaPortal?.open(perfil.tipo);
  }
  card.classList.add('hidden');
 }catch(err){
  card.classList.remove('hidden');
  card.textContent=err.message;
  if(/sesión|cuenta/i.test(err.message)){logout(false);navigate('login');}
 }
}
function logout(navigateAway=true){localStorage.removeItem('bolsa-token');sessionStorage.removeItem('bolsa-token');state.token='';state.profile=null;state.offers=[];const list=$('#offers-list');if(list)list.innerHTML='';const status=$('#offers-status');if(status)status.textContent='Iniciá sesión para consultar las ofertas laborales.';document.getElementById('offer-modal')?.close();window.BolsaStudent?.clear();window.BolsaPortal?.clear();updateHeader();if(navigateAway) navigate('inicio');}
for(const btn of document.querySelectorAll('[data-nav]')) btn.addEventListener('click',e=>{e.preventDefault();navigate(btn.dataset.nav);});
const mobileToggle=$('#mobile-menu-toggle');
mobileToggle?.addEventListener('click',()=>{
 const open=document.querySelector('.topbar')?.classList.toggle('is-open')||false;
 mobileToggle.setAttribute('aria-expanded',String(open));
 mobileToggle.setAttribute('aria-label',open?'Cerrar menú de navegación':'Abrir menú de navegación');
});
document.addEventListener('click',e=>{
 if(!e.target.closest('.topbar'))closeMobileNavigation();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileNavigation();});
window.addEventListener('resize',()=>{if(window.innerWidth>800)closeMobileNavigation();});
$('#filter-type').addEventListener('change',renderOffers);
$('#filter-career').addEventListener('change',renderOffers);
$('#clear-filters').addEventListener('click',()=>{$('#filter-type').value='';$('#filter-career').value='';renderOffers();});
$('#forgot-password').addEventListener('click',()=>navigate('recuperar'));
$('#logout').addEventListener('click',()=>logout());
$('#toggle-login-password').addEventListener('click',()=>{
 const input=$('#login-password');
 const showing=input.type==='password';
 input.type=showing?'text':'password';
 const toggle=$('#toggle-login-password');
 toggle.textContent=showing?'Ocultar contraseña':'Mostrar contraseña';
 toggle.setAttribute('aria-pressed',String(showing));
});
/* =====================================================
   CU01 - REGISTRO DE ESTUDIANTES
   Comprueba el formulario y solicita el registro al backend.
   Allí se verifica la matrícula contra el padrón simulado.
   ===================================================== */
$('#register-form').addEventListener('submit',async e=>{
 e.preventDefault();clearAlert('#register-alert');
 const form=e.currentTarget;const input=Object.fromEntries(new FormData(form));
 input.matricula=String(input.matricula||'').trim().toLowerCase();
 if(!input.matricula||!input.cedula||!input.correo||!input.password||!input.repeat){setAlert('#register-alert','Completá todos los campos obligatorios.');return;}
 if(input.password.length<8){setAlert('#register-alert','La contraseña debe tener al menos 8 caracteres.');return;}
 if(input.password!==input.repeat){setAlert('#register-alert','Las contraseñas no coinciden.');return;}
 setBusy('#submit-register',true,'Crear cuenta →');
 try{
  const data=await request('register',input);
  form.reset();
  $('#login-user').value=input.matricula;
  $('#login-password').value='';
  navigate('login');
  clearAlert('#login-alert');
  setAlert('#login-alert',(data.message||'Cuenta creada correctamente.')+' Ingresá con la contraseña que acabás de elegir.',true);
 }
 catch(err){setAlert('#register-alert',err.message);}
 finally{setBusy('#submit-register',false,'Crear cuenta →');}
});
/* =====================================================
   MÓDULO: INICIO DE SESIÓN (CU02)
   1. Evita recargar la página al enviar el formulario.
   2. Obtiene el usuario y la contraseña ingresados.
   3. Solicita al backend la validación de credenciales.
   4. Guarda el token recibido y abre el panel del usuario.
   ===================================================== */
$('#login-form').addEventListener('submit',async e=>{
 e.preventDefault();clearAlert('#login-alert');
 // Se leen los datos del formulario sin guardar la contraseña permanentemente.
 const input=Object.fromEntries(new FormData(e.currentTarget));
 input.usuario=String(input.usuario||'').trim().toLowerCase();
 if(!input.usuario||!input.password){setAlert('#login-alert','Ingresá tu usuario y contraseña.');return;}
 setBusy('#submit-login',true,'Ingresar →');
 // La validación real de usuario, contraseña y habilitación ocurre en Supabase.
 try{const data=await request('login',input);localStorage.removeItem('bolsa-token');sessionStorage.removeItem('bolsa-token');if($('#remember').checked)localStorage.setItem('bolsa-token',data.token);else sessionStorage.setItem('bolsa-token',data.token);state.profile=data.profile;$('#login-password').value='';updateHeader();navigate('perfil');}
 catch(err){
  const message=err.message==='Usuario o contraseña incorrectos.'
   ? 'Matrícula o contraseña incorrecta. Usá la contraseña que creaste al registrarte (no la cédula).'
   : err.message;
  setAlert('#login-alert',message);
 }
 finally{setBusy('#submit-login',false,'Ingresar →');}
});

/* =====================================================
   CU18 - RECUPERACIÓN DE CONTRASEÑA
   Solicita al backend un enlace de recuperación por correo.
   ===================================================== */
$('#recover-form').addEventListener('submit',async e=>{
 e.preventDefault();clearAlert('#recover-alert');
 const correo=$('#recover-email').value.trim().toLowerCase();
 const button=$('#submit-recover');
 button.disabled=true;button.textContent='Enviando...';
 try{const res=await request('password-reset-request',{correo});setAlert('#recover-alert',res.message,true);}
 catch(error){setAlert('#recover-alert',error.message);}
 finally{button.disabled=false;button.textContent='Enviar enlace';}
});
// Utiliza el token temporal del enlace para establecer una nueva contraseña.
$('#reset-form').addEventListener('submit',async e=>{
 e.preventDefault();clearAlert('#reset-alert');
 const token=new URLSearchParams(location.search).get('token')||'';
 const password=$('#reset-password').value;
 const repeat=$('#reset-repeat').value;
 if(!token){setAlert('#reset-alert','No se encontró un enlace de recuperación válido.');return;}
 if(password.length<8||password!==repeat){setAlert('#reset-alert','Las contraseñas no coinciden o son demasiado cortas.');return;}
 const button=$('#submit-reset');button.disabled=true;button.textContent='Guardando...';
 try{
  const res=await request('password-reset-complete',{token,password});
  history.replaceState(null,'',location.pathname+'#login');
  $('#login-password').value='';
  navigate('login');
  setAlert('#login-alert',res.message,true);
 }catch(error){setAlert('#reset-alert',error.message);}
 finally{button.disabled=false;button.textContent='Restablecer contraseña';}
});

window.addEventListener('popstate',()=>navigate(location.hash.slice(1)||'inicio',true));
window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)||'inicio',true));
updateHeader();
navigate(location.hash.slice(1)||'inicio',true);
// Si se conservó la sesión al recargar una página pública, recuperar
// el rol desde el servidor antes de revelar acciones privilegiadas.
if(getToken() && !state.profile && !['perfil','compartir'].includes(state.screen)){
 request('me',{},true).then(result=>{state.profile=result.profile;updateHeader();})
 .catch(()=>logout(false));
}
