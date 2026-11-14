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
