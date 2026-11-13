// Bolsa de Trabajo Universitaria · CU01/CU02 · versión académica
const BASE = Deno.env.get("SUPABASE_URL") || "";
const ADMIN_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization, apikey, x-client-info",
  "cache-control": "no-store"
};
// Registro académico simulado: todos los datos son ficticios.
// La validación del estudiante se realiza mediante el simulador
// académico privado en PostgreSQL, sin exponer cédulas en el código.
const studentMatriculaPattern = /^(?:[a-z][0-9]{5,7}|[0-9]{5,15})$/;
const normalizeMatricula = (value) => String(value ?? "").trim().toLowerCase();
const textEncoder = new TextEncoder();
function response(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });
}
function fail(message, status = 400) { return response({ ok: false, error: message }, status); }
function b64(bytes) {
  let bin = ""; for(const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function unb64(s) {
  const v = s.replace(/-/g,"+").replace(/_/g,"/");
  return Uint8Array.from(atob(v.padEnd(Math.ceil(v.length/4)*4,"=")), c => c.charCodeAt(0));
}
function equal(a,b) {
 if (a.length!==b.length) return false;
 let z=0;for(let i=0;i<a.length;i++)z |= a[i]^b[i];
 return z===0;
}
async function hmac(data) {
  const key = await crypto.subtle.importKey("raw", textEncoder.encode("bolsa-v1-session:"+ADMIN_KEY), {name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC",key,textEncoder.encode(data)));
}
async function makeSession(user) {
 const claims = { id: user.id_usuario, tipo: user.tipo_usuario, exp: Math.floor(Date.now()/1000)+8*3600 };
 const encoded = b64(textEncoder.encode(JSON.stringify(claims)));
 return encoded+"."+b64(await hmac(encoded));
}
async function sessionFrom(req) {
 const header = req.headers.get("authorization") || "";
 const token = header.startsWith("Bearer ") ? header.slice(7):"";
 const [payload,sig,extra] = token.split(".");
 if (!payload || !sig || extra) return null;
 try {
  if (!equal(await hmac(payload),unb64(sig))) return null;
  const claims=JSON.parse(new TextDecoder().decode(unb64(payload)));
  if (!Number.isSafeInteger(claims.id) || claims.exp<=Math.floor(Date.now()/1000)) return null;
  return claims;
 } catch {return null;}
}
async function passHash(password) {
 const salt = crypto.getRandomValues(new Uint8Array(16));
 const key = await crypto.subtle.importKey("raw",textEncoder.encode(password),"PBKDF2",false,["deriveBits"]);
 const hash = new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:180000,hash:"SHA-256"},key,256));
 return "pbkdf2_sha256$180000$"+b64(salt)+"$"+b64(hash);
}
async function matchPass(password, stored) {
 try {
  const [type,iterations,salt,expected] = stored.split("$");
  if(type!=="pbkdf2_sha256" || +iterations!==180000) return false;
  const key=await crypto.subtle.importKey("raw",textEncoder.encode(password),"PBKDF2",false,["deriveBits"]);
  const hash = new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt:unb64(salt),iterations:180000,hash:"SHA-256"},key,256));
  return equal(hash,unb64(expected));
 } catch { return false; }
}
async function db(table, filters = {}, body = null, method="GET") {
 const url = new URL(BASE+"/rest/v1/"+table);
 for(const [k,v] of Object.entries(filters)) url.searchParams.set(k,String(v));
 const r=await fetch(url,{method,headers:{"apikey":ADMIN_KEY,"authorization":"Bearer "+ADMIN_KEY,"content-type":"application/json","prefer":"return=representation"},body:body===null?undefined:JSON.stringify(body)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok) {
  console.error("Database operation failed:",table,r.status);
  throw new Error("No fue posible completar la operación con la base de datos.");
 }
 return data;
}
async function userProfile(user) {
 const result={usuario:user.nombre_usuario, tipo:user.tipo_usuario};
 if(user.tipo_usuario==="Estudiante"){
  const arr=await db("estudiante",{select:"nombre,apellido,matricula,semestre_actual,id_carrera",id_usuario:"eq."+user.id_usuario,limit:1});
  if(arr.length) result.estudiante=arr[0];
 }
 return result;
}
Deno.serve(async req => {
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(!BASE || !ADMIN_KEY) return fail("Configuración del servidor pendiente.",503);
 if(req.method==="GET") return response({ok:true,service:"Bolsa Laboral Universitaria",stage:"CU01-CU02"});
 if(req.method!=="POST")return fail("Método no permitido.",405);
 let input={};
 try{input=await req.json();}catch{return fail("JSON inválido.");}
 try{
 const action=String(input.action||"");
 if(action==="careers"){
  const items=await db("carrera",{select:"id_carrera,nombre",order:"nombre.asc"});
  return response({ok:true,items});
 }
 if(action==="offers"){
  const items=await db("oferta_laboral",{select:"id_oferta,titulo,tipo,descripcion,requisitos,estado,origen,fecha_publicacion,fecha_vencimiento,vigencia_indefinida",estado:"in.(Publicada,Vencida)",order:"fecha_publicacion.desc",limit:50});
  return response({ok:true,items});
 }
 if(action==="register"){
  const matricula=normalizeMatricula(input.matricula);
  const cedula=String(input.cedula||"").trim();
  const correo=String(input.correo||"").trim().toLowerCase();
  const password=String(input.password||"");
  const repeat=String(input.repeat||"");
  if(!studentMatriculaPattern.test(matricula)) return fail("Formato de matrícula inválido. Ejemplo: c06559.");
  if(!/^[0-9]{5,12}$/.test(cedula)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)||password.length<8||password.length>72||password!==repeat)
   return fail("Revisá matrícula, cédula, correo y contraseña (mínimo 8 caracteres).");
  const academicRows = await db(
    "rpc/consultar_estudiante_academico_simulado",
    {},
    { p_matricula: matricula, p_cedula: cedula },
    "POST"
  );
  const academic=academicRows[0];
  if(!academic) return fail("La matrícula y la cédula no coinciden con el registro académico simulado.");
  const dup=await db("usuario",{select:"id_usuario",or:"(nombre_usuario.eq."+matricula+",correo.eq."+correo+")",limit:1});
  if(dup.length) return fail("Ya existe una cuenta registrada con esa matrícula o correo.",409);
  const carreras=await db("carrera",{select:"id_carrera",nombre:"eq."+academic.carrera,limit:1});
  if(!carreras.length)return fail("La carrera académica no fue configurada.",503);
  const inserted=await db("usuario",{},[{nombre_usuario:matricula,correo,contrasena_hash:await passHash(password),tipo_usuario:"Estudiante",habilitado:true}], "POST");
  const u=inserted[0];
  try{
   await db("estudiante",{},[{id_usuario:u.id_usuario,id_carrera:carreras[0].id_carrera,matricula,cedula,nombre:academic.nombre,apellido:academic.apellido}],"POST");
  }catch(err){
   await db("usuario",{id_usuario:"eq."+u.id_usuario},null,"DELETE").catch(()=>{});
   throw err;
  }
  return response({ok:true,message:"Cuenta creada correctamente. Ya podés iniciar sesión."},201);
 }
 if(action==="login"){
  const username=String(input.usuario||"").trim();
  const lookupUsername=/^[a-zA-Z][0-9]{5,7}$/.test(username) ? normalizeMatricula(username) : username;
  const password=String(input.password||"");
  if(!/^[a-zA-Z0-9._-]{3,80}$/.test(username)||!password)return fail("Usuario o contraseña incorrectos.",401);
  const users=await db("usuario",{select:"id_usuario,nombre_usuario,contrasena_hash,tipo_usuario,habilitado",nombre_usuario:"eq."+lookupUsername,limit:1});
  const u=users[0];
  if(!u || !(await matchPass(password,u.contrasena_hash))) return fail("Usuario o contraseña incorrectos.",401);
  if(!u.habilitado) return fail("Tu cuenta está deshabilitada. Contactá con Secretaría Académica.",403);
  return response({ok:true,token:await makeSession(u),profile:await userProfile(u)});
 }
 if(action==="me"){
  const claims=await sessionFrom(req);
  if(!claims)return fail("La sesión no es válida. Iniciá sesión de nuevo.",401);
  const users=await db("usuario",{select:"id_usuario,nombre_usuario,tipo_usuario,habilitado",id_usuario:"eq."+claims.id,limit:1});
  if(!users[0]||!users[0].habilitado)return fail("La cuenta no está habilitada.",403);
  return response({ok:true,profile:await userProfile(users[0])});
 }
 return fail("Acción no reconocida.",404);
 }catch(err){console.error("API request error",err?.message);return fail("Ocurrió un error al procesar la solicitud.",500);}
});
