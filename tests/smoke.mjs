import assert from "node:assert/strict";

const API="https://fxbhnyvlekulmuvvmrlr.supabase.co/functions/v1/bolsa-api";

async function call(action, payload={}){
 const response=await fetch(API,{
  method:"POST",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({action,...payload}),
  signal:AbortSignal.timeout(20000)
 });
 const body=await response.json();
 return {status:response.status,body};
}

const careers=await call("careers");
assert.equal(careers.status,200,JSON.stringify(careers.body));
assert.equal(careers.body.ok,true);
assert.ok(careers.body.items.some(x=>x.nombre==="Análisis de Sistemas"));
console.log("OK: CU01 catálogo de carreras.");

const offers=await call("offers");
assert.equal(offers.status,200,JSON.stringify(offers.body));
assert.equal(offers.body.ok,true);
assert.ok(Array.isArray(offers.body.items));
const demo=offers.body.items.find(x=>x.titulo==="DEMO · Pasantía de Desarrollo de Software");
assert.ok(demo,"No se publicó la oferta de prueba.");
assert.ok(demo.carreras.some(x=>x.nombre==="Análisis de Sistemas"));
console.log("OK: CU06 ofertas y filtro por carrera.");

const detail=await call("offer-detail",{offer_id:demo.id_oferta});
assert.equal(detail.status,200,JSON.stringify(detail.body));
assert.equal(detail.body.offer.verificada,true);
assert.equal(detail.body.offer.tipo,"Pasantía");
console.log("OK: CU07 detalle de oferta.");

const badLogin=await call("login",{usuario:"cuenta_inexistente_2026",password:"no-valida"});
assert.equal(badLogin.status,401,JSON.stringify(badLogin.body));
assert.equal(badLogin.body.ok,false);
console.log("OK: CU02 credenciales incorrectas rechazadas.");

const withoutSession=await call("student-dashboard");
assert.equal(withoutSession.status,401,JSON.stringify(withoutSession.body));
console.log("OK: CU03 protección de perfiles sin sesión.");

const companyDenied=await call("company-dashboard");
assert.equal(companyDenied.status,401,JSON.stringify(companyDenied.body));
const reviewerDenied=await call("reviewer-dashboard");
assert.equal(reviewerDenied.status,401,JSON.stringify(reviewerDenied.body));
const secretaryDenied=await call("secretary-dashboard");
assert.equal(secretaryDenied.status,401,JSON.stringify(secretaryDenied.body));
console.log("OK: CU10-CU24, módulos de empresa, revisión y Secretaría requieren sesión.");

// CU14: una persona sin sesión nunca puede enviar ofertas al backend.
const shareDenied=await call("public-offer-submit",{titulo:"Prueba sin permisos"});
assert.equal(shareDenied.status,401,JSON.stringify(shareDenied.body));
assert.equal(shareDenied.body.ok,false);
console.log("OK: compartir ofertas exige autenticación antes de validar los datos.");

const invalidReset=await call("password-reset-complete",{token:"invalido",password:"pruebaSegura2026"});
assert.equal(invalidReset.status,400,JSON.stringify(invalidReset.body));
console.log("OK: CU18 rechaza token de recuperación inválido.");

console.log("Pruebas públicas completadas. Los flujos autenticados se verifican desde la interfaz.");
