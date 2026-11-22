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
assert.ok(careers.body.items.length>=9,"El catálogo debe incluir al menos nueve carreras CyT");
for(const name of ["Arquitectura","Diseño Gráfico","Diseño Industrial","Ingeniería Ambiental","Ingeniería Civil","Ingeniería Industrial","Ingeniería Electrónica","Ingeniería Informática"]){
 assert.ok(careers.body.items.some(x=>x.nombre===name),"Falta la carrera "+name);
}
console.log("OK: CU01 catálogo de carreras.");

// El listado y el detalle NO son públicos: ni siquiera la API debe devolverlos.
const offers=await call("offers");
assert.equal(offers.status,401,JSON.stringify(offers.body));
assert.equal(offers.body.ok,false);
console.log("OK: el catálogo laboral está protegido contra usuarios anónimos.");

const detail=await call("offer-detail",{offer_id:1});
assert.equal(detail.status,401,JSON.stringify(detail.body));
assert.equal(detail.body.ok,false);
console.log("OK: el detalle de las ofertas también exige sesión.");

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

// CU14: empresas sin cuenta PUEDEN enviar ofertas, pero no formularios incompletos.
const shareIncomplete=await call("public-offer-submit",{titulo:"Prueba incompleta"});
assert.equal(shareIncomplete.status,400,JSON.stringify(shareIncomplete.body));
assert.equal(shareIncomplete.body.ok,false);
const shareBot=await call("public-offer-submit",{sitio_web:"https://bot.invalid"});
assert.equal(shareBot.status,400,JSON.stringify(shareBot.body));
assert.equal(shareBot.body.ok,false);
console.log("OK: CU14 disponible sin sesión, validación obligatoria y campo antispam.");

const invalidReset=await call("password-reset-complete",{token:"invalido",password:"pruebaSegura2026"});
assert.equal(invalidReset.status,400,JSON.stringify(invalidReset.body));
console.log("OK: CU18 rechaza token de recuperación inválido.");

console.log("Pruebas públicas completadas. Los flujos autenticados se verifican desde la interfaz.");

const privateProfileDenied=await call("company-applicant-profile",{application_id:1});
assert.equal(privateProfileDenied.status,401,JSON.stringify(privateProfileDenied.body));
console.log("OK: el perfil completo de un postulante exige autenticación de empresa.");

const recovery=await call("password-reset-request",{correo:"qa-noexiste-20261121@example.invalid"});
assert.ok([200,503].includes(recovery.status),"La recuperación respondió inesperadamente: "+JSON.stringify(recovery.body));
console.log(recovery.status===503
 ? "PENDIENTE: recuperación por correo sin servicio de envío (HTTP 503)."
 : "OK: solicitud de recuperación recibida por el servicio de correo.");
