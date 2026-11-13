'use strict';
const API = 'https://fxbhnyvlekulmuvvmrlr.supabase.co/functions/v1/bolsa-api';
const state = {screen: 'inicio', offers: [], profile: null, token: ''};
const $ = (selector) => document.querySelector(selector);
const screens = new Set(['inicio', 'ofertas', 'registro', 'login', 'perfil']);
const getToken = () => sessionStorage.getItem('bolsa-token') || localStorage.getItem('bolsa-token') || '';
function clean(text) {return String(text ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function setAlert(id, message, success = false){const el = $(id);el.textContent = message;el.className = 'alert' + (success ? ' success' : '');}
function clearAlert(id){const el=$(id);el.textContent='';el.className='alert hidden';}
function setBusy(buttonId, busy, label){const el=$(buttonId);el.disabled=busy;el.textContent=busy?'Procesando...':label;}
async function request(action, extras={}, useToken=false){
  const headers = {'content-type':'application/json'};
  if (useToken && getToken()) headers.authorization = 'Bearer ' + getToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
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
function navigate(to){
  if(!screens.has(to))to='inicio';
  // Un usuario con sesión activa no necesita ver registro ni acceso.
  if(getToken() && (to==='registro'||to==='login'))to='perfil';
  state.screen=to;
  for(const el of document.querySelectorAll('[data-screen]')) el.classList.toggle('hidden', el.dataset.screen!==to);
  for(const el of document.querySelectorAll('.nav [data-nav]')) el.classList.toggle('active',el.dataset.nav===to);
  history.replaceState(null,'','#'+to);
  window.scrollTo({top:0,behavior:'instant'});
  if(to==='ofertas') loadOffers();
  if(to==='perfil') {loadProfile();window.BolsaStudent?.open();}
}
function updateHeader(){
 const loggedIn=Boolean(getToken());
 const nav=$('#nav-session');
 nav.textContent=loggedIn?'Mi espacio':'Iniciar sesión';
 nav.dataset.nav=loggedIn?'perfil':'login';
 // Ocultar todos los accesos a Registrarse/Crear cuenta mientras haya sesión.
 for(const btn of document.querySelectorAll('[data-nav="registro"]')) btn.classList.toggle('hidden',loggedIn);
}
async function loadOffers(){
 const status=$('#offers-status'),list=$('#offers-list');
 status.classList.remove('hidden');status.textContent='Cargando ofertas...';list.innerHTML='';
 try{
   const [offerData,careerData]=await Promise.all([request('offers'),request('careers')]);
   state.offers=offerData.items||[];
   const select=$('#filter-career');
   const selected=select.value;
   select.innerHTML='<option value="">Todas las carreras</option>'+careerData.items.map(c=>'<option value="'+c.id_carrera+'">'+clean(c.nombre)+'</option>').join('');
   select.value=selected;
   renderOffers();
 }catch(err){status.textContent=err.message+' Intentá nuevamente.';}
}
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
async function loadProfile(){
 const card=$('#profile-card');
 if(!getToken()){navigate('login');return;}
 card.textContent='Cargando perfil...';
 try{const data=await request('me',{},true);state.profile=data.profile;
 const perfil=data.profile;const student=perfil.estudiante;
 card.innerHTML=`<span class="eyebrow dark">CU02 · SESIÓN ACTIVA</span><h2>¡Bienvenido${student?', '+clean(student.nombre):''}!</h2><p>Accediste correctamente como <strong>${clean(perfil.tipo)}</strong>.</p><p><strong>Usuario:</strong> ${clean(perfil.usuario)}</p>${student?`<p><strong>Nombre:</strong> ${clean(student.nombre)} ${clean(student.apellido)}</p><p><strong>Matrícula:</strong> ${clean(student.matricula)}</p>`:''}<div class="status-message">Módulos de perfil académico, CV y postulaciones: próximos casos de uso.</div>`;
 }catch(err){card.textContent=err.message; if(/sesión|cuenta/i.test(err.message)){logout(false);navigate('login');}}
}
function logout(navigateAway=true){localStorage.removeItem('bolsa-token');sessionStorage.removeItem('bolsa-token');state.token='';state.profile=null;window.BolsaStudent?.clear();updateHeader();if(navigateAway) navigate('inicio');}
for(const btn of document.querySelectorAll('[data-nav]')) btn.addEventListener('click',e=>{e.preventDefault();navigate(btn.dataset.nav);});
$('#filter-type').addEventListener('change',renderOffers);
$('#filter-career').addEventListener('change',renderOffers);
$('#clear-filters').addEventListener('click',()=>{$('#filter-type').value='';$('#filter-career').value='';renderOffers();});
$('#forgot-password').addEventListener('click',()=>setAlert('#login-alert','La recuperación de contraseña (CU18) se implementará en una siguiente etapa.'));
$('#logout').addEventListener('click',()=>logout());
$('#toggle-login-password').addEventListener('click',()=>{
 const input=$('#login-password');
 const showing=input.type==='password';
 input.type=showing?'text':'password';
 const toggle=$('#toggle-login-password');
 toggle.textContent=showing?'Ocultar contraseña':'Mostrar contraseña';
 toggle.setAttribute('aria-pressed',String(showing));
});
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
$('#login-form').addEventListener('submit',async e=>{
 e.preventDefault();clearAlert('#login-alert');
 const input=Object.fromEntries(new FormData(e.currentTarget));
 input.usuario=String(input.usuario||'').trim().toLowerCase();
 if(!input.usuario||!input.password){setAlert('#login-alert','Ingresá tu usuario y contraseña.');return;}
 setBusy('#submit-login',true,'Ingresar →');
 try{const data=await request('login',input);if($('#remember').checked)localStorage.setItem('bolsa-token',data.token);else sessionStorage.setItem('bolsa-token',data.token);state.profile=data.profile;$('#login-password').value='';updateHeader();navigate('perfil');}
 catch(err){
  const message=err.message==='Usuario o contraseña incorrectos.'
   ? 'Matrícula o contraseña incorrecta. Usá la contraseña que creaste al registrarte (no la cédula).'
   : err.message;
  setAlert('#login-alert',message);
 }
 finally{setBusy('#submit-login',false,'Ingresar →');}
});
updateHeader();navigate(location.hash.replace('#','')||'inicio');
