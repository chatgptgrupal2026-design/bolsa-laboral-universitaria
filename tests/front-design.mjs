import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const theme=readFileSync(new URL('../theme-indigo.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const workspace=readFileSync(new URL('../workspace.js',import.meta.url),'utf8');

assert.match(html,/href="\.\/styles\.css"/);
assert.match(html,/href="\.\/theme-indigo\.css"/);
assert.ok(html.indexOf('href="./styles.css"')<html.indexOf('href="./theme-indigo.css"'),'El tema debe cargarse después del CSS base.');
assert.match(html,/id="mobile-menu-toggle"/);
assert.match(html,/aria-controls="main-navigation"/);
assert.match(html,/id="main-navigation"/);
assert.match(html,/id="student-area"/);
assert.match(html,/id="portal-area"/);
assert.match(html,/nav-link hidden">Compartir oferta/);
console.log('OK: estructura, scripts, paneles y enlaces del tema.');

for(const bp of [1180,920,800,700,520,360]){
 assert.ok(theme.includes('max-width:'+bp+'px'),'Falta adaptar el ancho '+bp+'px');
}
for(const rule of ['--indigo-deep:#27235B','--purple:#7C3AED','.topbar.is-open .nav','.dashboard-sidebar.is-open + .dashboard-scrim','.offer-grid','.register-layout','.dashboard-metrics','.auth-shell']){
 assert.ok(theme.includes(rule),'Falta la regla '+rule);
}
console.log('OK: tokens índigo y ajustes responsive.');

assert.match(app,/mobileToggle\.setAttribute\('aria-expanded'/);
assert.match(app,/closeMobileNavigation\(\)/);
assert.match(app,/const canShareOffer =/);
assert.match(workspace,/data-dashboard-scrim/);
assert.match(workspace,/data-workspace-route/);
console.log('OK: navegación móvil, menú lateral y control visual por rol.');

const portal=readFileSync(new URL('../portal.js',import.meta.url),'utf8');
const brand=readFileSync(new URL('../assets/uc-logo.svg',import.meta.url),'utf8');
assert.match(html,/id="share-career-options"/);
assert.doesNotMatch(html,/<select id="share-careers"/);
assert.match(portal,/function careerCheckboxes\(/);
assert.match(portal,/chosenCareers\('share-careers'\)/);
assert.match(portal,/chosenCareers\('portal-carreras'\)/);
assert.match(portal,/request\('public-offer-submit',payload,true\)/);
assert.match(html,/src="\.\/assets\/uc-logo\.svg"/);
assert.match(html,/rel="icon" type="image\/svg\+xml" href="\.\/assets\/uc-logo\.svg"/);
assert.match(workspace,/src="\.\/assets\/uc-logo\.svg"/);
assert.match(brand,/data:image\/png;base64,/);
assert.match(theme,/\.career-option:has\(input:checked\)/);
console.log('OK: casillas de carrera, logo UC y envío externo.');

const student=readFileSync(new URL('../student.js',import.meta.url),'utf8');
const backend=readFileSync(new URL('../supabase/functions/bolsa-api/index.ts',import.meta.url),'utf8');
const feedback=readFileSync(new URL('../ux-feedback.js',import.meta.url),'utf8');
assert.match(html,/src="\.\/ux-feedback\.js"/);
assert.match(student,/item-actualmente_trabajo/);
assert.match(student,/prof-disponibilidad" required/);
assert.match(student,/window\.BolsaUI\.confirm/);
assert.match(portal,/data-applicant-profile/);
assert.match(portal,/company-applicant-profile/);
assert.match(backend,/if\(action==="company-applicant-profile"\)/);
assert.match(backend,/Completá habilidades y disponibilidad laboral/);
assert.match(backend,/Solo podés retirar postulaciones mientras la oferta esté vigente/);
assert.match(feedback,/window\.BolsaUI=\{notify,confirm:confirmAction\}/);
assert.match(theme,/\.applicant-profile-details/);
console.log('OK: incidencias estudiantiles y perfil privado de postulantes cubiertos por pruebas de código.');



const api=readFileSync(new URL('../supabase/functions/bolsa-api/index.ts',import.meta.url),'utf8');
assert.match(api,/if\(action==="offers"\)\{\s*if\(!\(await canViewOffers\(req\)\)\)/);
assert.match(api,/if\(action==="offer-detail"\)\{\s*if\(!\(await canViewOffers\(req\)\)\)/);
assert.match(app,/if\(to==='ofertas' && !getToken\(\)\)/);
assert.match(app,/request\('offers',\{\},true\)/);
assert.match(html,/data-nav="ofertas" class="nav-link hidden"/);
assert.match(html,/id="hero-offers-cta" data-nav="login"/);
assert.match(portal,/request\('offer-detail',\{offer_id:Number\(edit\.dataset\.editOffer\)\},true\)/);
assert.match(student,/request\('offer-detail',\{offer_id:Number\(id\)\},true\)/);
console.log('OK: listado, detalle y navegación de ofertas protegidos para invitados.');

assert.match(app,/const canShareOffer = \(\) => !getToken\(\)/);
assert.match(html,/class="secondary-panel" id="company-share-panel"/);
assert.match(html,/data-nav="compartir" class="nav-link"/);
assert.match(html,/EMPRESAS SIN CUENTA/);
assert.match(html,/name="sitio_web"/);
assert.match(theme,/\.share-honeypot/);
assert.match(backend,/if\(action==="public-offer-submit"\)\{[\s\S]*?const claims=await sessionFrom\(req\);/);
assert.match(backend,/input\.sitio_web/);
console.log('OK: CU14 puede recibir propuestas externas sin sesión y las ofertas siguen privadas.');
