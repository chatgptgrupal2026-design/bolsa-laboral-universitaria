/* Diseño compartido: menú lateral y paneles independientes por rol. */
(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
 inicio:'<path d="m3 10 9-7 9 7"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-8h6v8"/>',
 academico:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 profesional:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
 curriculum:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
 postulaciones:'<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>',
 seguridad:'<rect x="4" y="11" width="16" height="11" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4M12 16v2"/>',
 empresa:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M7 8V4h10v4M8 12h2M14 12h2M8 16h2M14 16h2"/>',
 ofertas:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
 pendientes:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 aprobadas:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 empresas:'<rect x="2" y="6" width="9" height="16" rx="1"/><rect x="13" y="2" width="9" height="20" rx="1"/><path d="M5 10h3M5 14h3M16 6h3M16 10h3M16 14h3"/>',
 revisores:'<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M18 8h4M18 12h4M18 16h4"/>',
 salir:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 chevron:'<path d="m9 18 6-6-6-6"/>'
};
function icon(name){
 return '<svg class="dash-icon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.inicio)+'</svg>';
}
function shell({items,active,person,identifier,role,title,description,contentId,messageId,routeName='perfil'}){
 const selected=items.find(x=>x.id===active)||items[0];
 const heading=title||selected.label;
 const nav=items.map(item=>
   '<button type="button" class="dashboard-nav-item'+(item.id===active?' is-active':'')+'" data-workspace-route="'+esc(item.id)+'" aria-current="'+(item.id===active?'page':'false')+'">'+
   icon(item.icon||item.id)+'<span>'+esc(item.label)+'</span>'+(item.id===active?'<span class="dashboard-active-line"></span>':'')+'</button>'
 ).join('');
 return '<div class="dashboard-shell">'+
  '<aside class="dashboard-sidebar" id="dashboard-sidebar" aria-label="Menú de mi espacio">'+
   '<div class="dashboard-side-brand"><span class="dashboard-brand-icon">FCT</span><div><strong>Mi espacio</strong><small>Bolsa Laboral Universitaria</small></div></div>'+
   '<div class="dashboard-identity"><span class="dashboard-avatar">'+esc((person||'U').trim().charAt(0).toUpperCase())+'</span><div><strong>'+esc(person||'Mi cuenta')+'</strong><small>'+esc(identifier||role||'Usuario')+'</small></div></div>'+
   '<div class="dashboard-nav-label">NAVEGACIÓN</div><nav class="dashboard-side-nav" aria-label="Secciones del panel">'+nav+'</nav>'+
   '<div class="dashboard-side-footer"><div class="dashboard-side-role">'+esc(role||'Bolsa Laboral')+'</div>'+
   '<button type="button" data-dashboard-logout class="dashboard-nav-item dashboard-logout">'+icon('salir')+'<span>Cerrar sesión</span></button></div>'+
  '</aside>'+
  '<section class="dashboard-main" aria-label="'+esc(heading)+'">'+
   '<div class="dashboard-main-top"><button type="button" data-dashboard-menu aria-expanded="false" aria-controls="dashboard-sidebar" class="dashboard-mobile-toggle">'+icon('menu')+'<span>Menú</span></button>'+
    '<div class="dashboard-breadcrumb">Mi espacio <span class="dashboard-crumb-divider">/</span> <strong>'+esc(selected.label)+'</strong></div>'+
    '<span class="dashboard-role-label">'+esc(role||'Área personal')+'</span></div>'+
   '<header class="dashboard-page-heading"><h1>'+esc(heading)+'</h1>'+(description?'<p>'+esc(description)+'</p>':'')+'</header>'+
   '<div id="'+esc(messageId)+'" class="alert hidden" role="status" aria-live="polite"></div>'+
   '<div id="'+esc(contentId)+'" class="dashboard-content"></div>'+
  '</section>'+
 '</div>';
}
document.addEventListener('click',e=>{
 const toggle=e.target.closest('[data-dashboard-menu]');
 if(toggle){const aside=document.getElementById('dashboard-sidebar');if(!aside)return;const open=aside.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));return;}
 const route=e.target.closest('[data-workspace-route]');
 if(route){navigate('perfil/'+route.dataset.workspaceRoute);return;}
 if(e.target.closest('[data-dashboard-logout]')){document.getElementById('logout')?.click();return;}
 if(!e.target.closest('.dashboard-sidebar')&&!e.target.closest('[data-workspace-route]')){
  document.getElementById('dashboard-sidebar')?.classList.remove('is-open');
  document.querySelector('[data-dashboard-menu]')?.setAttribute('aria-expanded','false');
 }
});
window.BolsaWorkspace={shell,icon};
})();