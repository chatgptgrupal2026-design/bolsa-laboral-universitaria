// Auditoría funcional E2E — CU01 a CU09, CU18 a CU20.
// Solo usa cuentas ficticias de prueba a990105 / a990106 registradas en el
// simulador académico. NO usa credenciales reales ni claves administrativas.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';

const API='https://fxbhnyvlekulmuvvmrlr.supabase.co/functions/v1/bolsa-api';
const pass1='QA-'+randomBytes(20).toString('base64url');
const pass2='QA-'+randomBytes(20).toString('base64url');
const newPass='QB-'+randomBytes(20).toString('base64url');
const prefix='auditoria-20261114-017f96c';
const email1=prefix+'-uno@example.invalid';
const email2=prefix+'-dos@example.invalid';
const report=[];
let token1='',token2='',firstCv=null,offerId=0,applicationId=0;

async function call(action,data={},token=''){
 const res=await fetch(API,{
  method:'POST',
  headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
  body:JSON.stringify({action,...data}),
  signal:AbortSignal.timeout(action.includes('cv-upload')?60000:30000)
 });
 const body=await res.json().catch(()=>({}));
 return {status:res.status,body};
}
function expect(result,status,label){
 assert.equal(result.status,status,label+' — '+JSON.stringify(result.body));
 return result.body;
}
async function check(id,label,task){
 try{
  await task();
  report.push({caso:id,prueba:label,estado:'OK'});
  console.log('OK',id,label);
 }catch(error){
  report.push({caso:id,prueba:label,estado:'ERROR',detalle:String(error.message).slice(0,350)});
  console.error('ERROR',id,label,String(error.message).slice(0,600));
 }
}
function requireToken(token){
 assert.ok(token && token.split('.').length===2,'No hay una sesión válida para continuar.');
}
const first={matricula:'a990105',cedula:'9900105',correo:email1,password:pass1,repeat:pass1};
const second={matricula:'a990106',cedula:'9900106',correo:email2,password:pass2,repeat:pass2};
const bytes=Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');

await check('CU01','Rechazar matrícula con cédula incorrecta',async()=>{
 const r=await call('register',{...first,cedula:'1234567',correo:'invalido-'+email1});
 expect(r,400,'El simulador debe rechazar cédula no coincidente');
});
await check('CU01','Registrar estudiante ficticio uno',async()=>{
 expect(await call('register',first),201,'Registro estudiante uno');
});
await check('CU01','Registrar estudiante ficticio dos',async()=>{
 expect(await call('register',second),201,'Registro estudiante dos');
});
await check('CU01','Impedir registro duplicado',async()=>{
 expect(await call('register',first),409,'No se permite otra cuenta con la misma matrícula');
});
await check('CU02','Rechazar contraseña incorrecta',async()=>{
 expect(await call('login',{usuario:first.matricula,password:'credencial_incorrecta'}),401,'Login inválido');
});
await check('CU02','Iniciar sesión de estudiante uno',async()=>{
 const r=expect(await call('login',{usuario:first.matricula,password:pass1}),200,'Iniciar sesión estudiante');
 token1=r.token;requireToken(token1);
 assert.equal(r.profile.tipo,'Estudiante');
});
await check('CU02','Iniciar sesión de estudiante dos',async()=>{
 const r=expect(await call('login',{usuario:second.matricula,password:pass2}),200,'Iniciar sesión estudiante 2');
 token2=r.token;requireToken(token2);
});
await check('CU02','Rechazar sesión falsa y permitir sesión válida',async()=>{
 requireToken(token1);
 expect(await call('me',{},'test.invalid'),401,'Token falso');
 const r=expect(await call('me',{},token1),200,'Token válido');
 assert.equal(r.profile.estudiante.matricula,first.matricula);
});
await check('CU03','Guardar y leer perfil académico',async()=>{
 requireToken(token1);
 expect(await call('student-academic-save',{
  correo:email1,telefono:'0981000101',fecha_nacimiento:'2002-01-01',
  semestre_actual:5,id_carrera:1,cedula:'0000000',matricula:'falsa'
 },token1),200,'Guardar perfil');
 const r=expect(await call('student-dashboard',{},token1),200,'Leer perfil');
 assert.equal(r.student.telefono,'0981000101');
 assert.equal(r.student.matricula,first.matricula);
 assert.equal(r.student.cedula,first.cedula);
 assert.equal(r.student.semestre_actual,5);
});
await check('CU03','Rechazar correo inválido',async()=>{
 requireToken(token1);
 expect(await call('student-academic-save',{correo:'correo-invalido',id_carrera:1},token1),400,'Correo inválido');
});
await check('CU04','Guardar habilidades, tecnologías y disponibilidad',async()=>{
 requireToken(token1);
 expect(await call('student-professional-save',{habilidades:'Trabajo en equipo',tecnologias:'JavaScript, Oracle',disponibilidad_laboral:'Medio tiempo'},token1),200,'Perfil profesional');
 const r=expect(await call('student-dashboard',{},token1),200,'Leer perfil profesional');
 assert.match(r.professional.habilidades,/Trabajo en equipo/);
});
await check('CU04','Agregar experiencia, idioma y capacitación',async()=>{
 requireToken(token1);
 const items=[
  {item_type:'experiencia',empresa:'Empresa Ficticia QA',cargo:'Practicante',fecha_inicio:'2025-01-01'},
  {item_type:'idioma',nombre:'Inglés',nivel:'Intermedio'},
  {item_type:'capacitacion',tipo:'Curso',nombre:'Curso QA',institucion:'FCT',anio:2026}
 ];
 for(const item of items)expect(await call('student-item-save',item,token1),200,'Agregar '+item.item_type);
 const d=expect(await call('student-dashboard',{},token1),200,'Leer listas');
 assert.equal(d.experiencias.length,1);assert.equal(d.idiomas.length,1);assert.equal(d.capacitaciones.length,1);
});
await check('CU04','Editar y eliminar registros profesionales',async()=>{
 requireToken(token1);
 let d=expect(await call('student-dashboard',{},token1),200,'Obtener ítems');
 const exp=d.experiencias[0],idioma=d.idiomas[0];
 assert.ok(exp&&idioma);
 expect(await call('student-item-save',{item_type:'experiencia',item_id:exp.id_experiencia,empresa:'Empresa Ficticia QA',cargo:'Analista Junior',fecha_inicio:'2025-01-01'},token1),200,'Editar experiencia');
 expect(await call('student-item-remove',{item_type:'idioma',item_id:idioma.id_idioma},token1),200,'Eliminar idioma');
 d=expect(await call('student-dashboard',{},token1),200,'Verificar ítems');
 assert.equal(d.experiencias[0].cargo,'Analista Junior');
 assert.equal(d.idiomas.length,0);
});
await check('CU05','Rechazar archivo no PDF',async()=>{
 requireToken(token1);
 expect(await call('student-cv-upload',{filename:'cv.doc',file_base64:Buffer.from('Falso').toString('base64')},token1),400,'Formato inválido');
});
await check('CU05','Subir currículum PDF privado',async()=>{
 requireToken(token1);
 expect(await call('student-cv-upload',{filename:'QA-CV-Inicial.pdf',file_base64:bytes.toString('base64')},token1),200,'Subida de CV');
 const d=expect(await call('student-dashboard',{},token1),200,'CV en perfil');
 assert.equal(d.cv.nombre_archivo,'QA-CV-Inicial.pdf');firstCv=d.cv;
});
await check('CU05','Abrir CV por enlace firmado',async()=>{
 requireToken(token1);
 const d=expect(await call('student-cv-view',{},token1),200,'Generar enlace');
 assert.ok(d.url.startsWith('https://'),'Enlace no HTTPS');
 const file=await fetch(d.url,{signal:AbortSignal.timeout(30000)});
 assert.equal(file.status,200,'El PDF debe ser descargable con URL firmada');
 const content=Buffer.from(await file.arrayBuffer());
 assert.ok(content.toString('utf8',0,5)==='%PDF-','El archivo descargado debe comenzar con %PDF-');
});
await check('CU05','Reemplazar currículum sin duplicar',async()=>{
 requireToken(token1);
 expect(await call('student-cv-upload',{filename:'QA-CV-Actualizado.pdf',file_base64:bytes.toString('base64')},token1),200,'Reemplazo de CV');
 const d=expect(await call('student-dashboard',{},token1),200,'Leer CV reemplazado');
 assert.equal(d.cv.nombre_archivo,'QA-CV-Actualizado.pdf');
 assert.equal(d.cv.id_cv,firstCv.id_cv,'El CV reemplazado conserva el mismo registro.');
});
await check('CU06','Obtener carrera y listado público de ofertas',async()=>{
 const careers=expect(await call('careers'),200,'Carreras');
 assert.ok(careers.items.some(c=>c.nombre==='Análisis de Sistemas'));
 const offers=expect(await call('offers'),200,'Ofertas');
 assert.ok(Array.isArray(offers.items));
 const demo=offers.items.find(o=>o.titulo==='DEMO · Pasantía de Desarrollo de Software'&&o.estado==='Publicada');
 assert.ok(demo,'No se encontró oferta DEMO publicada');
 offerId=demo.id_oferta;
 assert.ok(demo.carreras.some(c=>c.nombre==='Análisis de Sistemas'));
});
await check('CU07','Ver detalle de oferta verificada',async()=>{
 assert.ok(offerId);
 const d=expect(await call('offer-detail',{offer_id:offerId}),200,'Detalle');
 assert.equal(d.offer.verificada,true);
 assert.equal(d.offer.id_oferta,offerId);
});
await check('CU08','Impedir postulación sin CV',async()=>{
 requireToken(token2);assert.ok(offerId);
 expect(await call('student-apply',{offer_id:offerId},token2),409,'CV obligatorio');
});
await check('CU08','Postularse y rechazar duplicados',async()=>{
 requireToken(token1);assert.ok(offerId);
 expect(await call('student-apply',{offer_id:offerId},token1),200,'Postulación');
 expect(await call('student-apply',{offer_id:offerId},token1),409,'No repetir postulación');
});
await check('CU09','Consultar mis postulaciones',async()=>{
 requireToken(token1);
 const d=expect(await call('student-applications',{},token1),200,'Historial');
 const app=d.items.find(p=>p.id_oferta===offerId);
 assert.ok(app,'La postulación debe estar en historial');
 assert.equal(app.estado,'Activa');applicationId=app.id_postulacion;
});
await check('CU20','Retirar postulación y prohibir re-postulación',async()=>{
 requireToken(token1);assert.ok(applicationId);
 expect(await call('student-withdraw',{application_id:applicationId},token1),200,'Retirar');
 const d=expect(await call('student-applications',{},token1),200,'Ver retiro');
 assert.equal(d.items.find(a=>a.id_postulacion===applicationId)?.estado,'Retirada');
 expect(await call('student-apply',{offer_id:offerId},token1),409,'No volver a postular');
});
await check('CU19','Cambiar contraseña y verificar nuevo inicio',async()=>{
 requireToken(token1);
 expect(await call('password-change',{current_password:pass1,new_password:newPass},token1),200,'Cambiar contraseña');
 expect(await call('login',{usuario:first.matricula,password:pass1}),401,'Contraseña antigua debe rechazarse');
 const d=expect(await call('login',{usuario:first.matricula,password:newPass}),200,'Nueva contraseña');
 assert.ok(d.token);
});
await check('CU18','Rechazar token de recuperación inválido',async()=>{
 expect(await call('password-reset-complete',{token:'no-es-valido',password:'test-Password-2026'}),400,'Token inválido');
});
await check('Permisos','Bloquear acciones privilegiadas al estudiante',async()=>{
 requireToken(token1);
 const actions=['company-dashboard','reviewer-dashboard','secretary-dashboard'];
 for(const action of actions){
  const r=await call(action,{},token1);
  assert.ok([401,403].includes(r.status),action+' permitió acceso a estudiante '+r.status);
 }
 const denied=await call('public-offer-submit',{titulo:'No autorizado'},token1);
 assert.equal(denied.status,403);
});
await check('CU05','Eliminar PDF del almacenamiento privado',async()=>{
 requireToken(token1);
 expect(await call('student-cv-remove',{},token1),200,'Eliminar CV');
 const d=expect(await call('student-dashboard',{},token1),200,'Verificar eliminación');
 assert.equal(d.cv,null);
});

const failed=report.filter(r=>r.estado==='ERROR');
console.log('AUDITORIA_RESULTADOS_JSON='+JSON.stringify(report));
console.log('TOTAL='+report.length+' OK='+(report.length-failed.length)+' ERROR='+failed.length);
if(failed.length)process.exitCode=1;
