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



async function mail(to,subject,body){
 const key=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("RESEND_FROM");
 if(!key||!from)return false;
 try{
  const res=await fetch("https://api.resend.com/emails",{
   method:"POST",
   headers:{"authorization":"Bearer "+key,"content-type":"application/json","user-agent":"bolsa-universitaria/1.0"},
   body:JSON.stringify({from,to:[to],subject,text:body})
  });
  if(!res.ok)console.error("Error al notificar correo",res.status);
  return res.ok;
 }catch(e){console.error("Servidor de correo no disponible.");return false;}
}
async function sha256B64(raw){
 const result=new Uint8Array(await crypto.subtle.digest("SHA-256",textEncoder.encode(raw)));
 return b64(result);
}

async function actorFor(req,acceptedRoles){
 const session=await sessionFrom(req);if(!session)return null;
 const found=await db("usuario",{select:"id_usuario,nombre_usuario,tipo_usuario,correo,habilitado",id_usuario:"eq."+session.id,limit:1});
 const user=found[0];if(!user||!user.habilitado||!acceptedRoles.includes(user.tipo_usuario))return null;
 if(user.tipo_usuario==="Empresa verificada"){
   const rows=await db("empresa_verificada",{select:"*",id_usuario:"eq."+user.id_usuario,habilitada:"eq.true",limit:1});
   if(!rows.length)return null;return {user,company:rows[0]};
 }
 const rows=await db("revisor",{select:"*",id_usuario:"eq."+user.id_usuario,habilitado:"eq.true",limit:1});
 if(!rows.length)return null;return {user,reviewer:rows[0]};
}
function careersInput(value){
 if(!Array.isArray(value))return [];
 return [...new Set(value.map(numberId).filter(Boolean))].slice(0,30);
}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);}
function pyDate(){
 return new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Asuncion",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
async function checkCareers(ids){
 if(!ids.length)throw new Error("Debés seleccionar al menos una carrera.");
 const rows=await db("carrera",{select:"id_carrera",id_carrera:"in.("+ids.join(",")+")"});
 if(rows.length!==ids.length)throw new Error("Se seleccionó una carrera inválida.");
}
async function setOfferCareers(offerId,careerIds){
 await db("oferta_carrera",{id_oferta:"eq."+offerId},null,"DELETE");
 if(careerIds.length)await db("oferta_carrera",{},careerIds.map(id_carrera=>({id_oferta:offerId,id_carrera})),"POST");
}
async function signedAssetUrl(bucket,path,expires=180){
 const url=BASE+"/storage/v1/object/sign/"+bucket+"/"+path;
 const reply=await fetch(url,{method:"POST",headers:{"apikey":ADMIN_KEY,"authorization":"Bearer "+ADMIN_KEY,"content-type":"application/json"},body:JSON.stringify({expiresIn:expires})});
 const signed=await reply.json().catch(()=>({}));
 if(!reply.ok||!signed.signedURL)throw new Error("No se pudo abrir el adjunto.");
 const raw=String(signed.signedURL);
 return new URL(/^https?:\/\//.test(raw)?raw:"/storage/v1/"+raw.replace(/^\/?storage\/v1\//,"").replace(/^\//,""),BASE).href;
}

async function studentForRequest(req) {
 const claims=await sessionFrom(req);
 if(!claims) return null;
 const users=await db("usuario",{select:"id_usuario,nombre_usuario,correo,contrasena_hash,tipo_usuario,habilitado",id_usuario:"eq."+claims.id,limit:1});
 const user=users[0];
 if(!user || !user.habilitado || user.tipo_usuario!=="Estudiante") return null;
 const students=await db("estudiante",{select:"*",id_usuario:"eq."+user.id_usuario,limit:1});
 if(!students.length)return null;
 return {user,student:students[0]};
}
function safeField(v,len=250) {return String(v??"").trim().slice(0,len);}
function numberId(v) { const n=Number(v);return Number.isSafeInteger(n) && n>0?n:null; }
const itemTables={
 experiencia:{table:"experiencia_laboral",key:"id_experiencia",fields:["empresa","cargo","fecha_inicio","fecha_fin"]},
 idioma:{table:"idioma",key:"id_idioma",fields:["nombre","nivel"]},
 capacitacion:{table:"capacitacion",key:"id_capacitacion",fields:["tipo","nombre","institucion","anio"]}
};

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
  if(items.length){
   const links=await db("oferta_carrera",{select:"id_oferta,id_carrera,carrera(nombre)",id_oferta:"in.("+items.map(o=>o.id_oferta).join(",")+")"});
   for(const item of items)item.carreras=links.filter(x=>x.id_oferta===item.id_oferta).map(x=>({id_carrera:x.id_carrera,nombre:x.carrera?.nombre||""}));
  }
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


 if(action==="offer-detail"){
  const id=numberId(input.offer_id);if(!id)return fail("Oferta inválida.");
  const offers=await db("oferta_laboral",{select:"*",id_oferta:"eq."+id,estado:"in.(Publicada,Vencida)",limit:1});
  const offer=offers[0];if(!offer)return fail("Oferta no disponible.",404);
  const [careers,media,reviews,employers,senders]=await Promise.all([
   db("oferta_carrera",{select:"id_carrera,carrera(nombre)",id_oferta:"eq."+id}),
   db("medio_postulacion",{select:"tipo,valor",id_oferta:"eq."+id}),
   db("revision_oferta",{select:"decision,revisor(instancia)",id_oferta:"eq."+id,order:"fecha_revision.desc",limit:1}),
   offer.id_empresa?db("empresa_verificada",{select:"razon_social",id_empresa:"eq."+offer.id_empresa,limit:1}):Promise.resolve([]),
   offer.id_remitente?db("empresa_remitente",{select:"razon_social",id_remitente:"eq."+offer.id_remitente,limit:1}):Promise.resolve([])
  ]);
  return response({ok:true,offer:{
   id_oferta:offer.id_oferta,titulo:offer.titulo,tipo:offer.tipo,descripcion:offer.descripcion,requisitos:offer.requisitos,
   estado:offer.estado,origen:offer.origen,fecha_publicacion:offer.fecha_publicacion,
   fecha_vencimiento:offer.fecha_vencimiento,vigencia_indefinida:offer.vigencia_indefinida,
   verificada:Boolean(offer.id_empresa),empresa:employers[0]?.razon_social||senders[0]?.razon_social||"",
   carreras:careers.map(c=>({id_carrera:c.id_carrera,nombre:c.carrera?.nombre||""})),
   medios:media,aprobada_por:reviews[0]?.revisor?.instancia||""
  }});
 }



 if(action==="secretary-dashboard"){
  const actor=await actorFor(req,["Secretaría Académica"]);if(!actor)return fail("Acceso de Secretaría requerido.",401);
  const [companies,reviewers]=await Promise.all([
    db("empresa_verificada",{select:"id_empresa,id_usuario,ruc,razon_social,persona_contacto,correo_contacto,telefono,habilitada",order:"id_empresa.desc"}),
    db("revisor",{select:"id_revisor,id_usuario,nombre,apellido,instancia,habilitado",order:"id_revisor.desc"})
  ]);
  const userIds=[...new Set([...companies,...reviewers].map(x=>x.id_usuario))];
  const users=userIds.length?await db("usuario",{select:"id_usuario,nombre_usuario,correo,habilitado",id_usuario:"in.("+userIds.join(",")+")"}):[];
  const mapped=new Map(users.map(x=>[x.id_usuario,x]));
  return response({ok:true,companies:companies.map(x=>({...x,usuario:mapped.get(x.id_usuario)||null})),reviewers:reviewers.map(x=>({...x,usuario:mapped.get(x.id_usuario)||null}))});
 }
 if(action==="secretary-create-company"||action==="secretary-create-reviewer"){
  const actor=await actorFor(req,["Secretaría Académica"]);if(!actor)return fail("Acceso de Secretaría requerido.",401);
  const isCompany=action==="secretary-create-company";
  const username=safeField(input.usuario,80).toLowerCase(),
   email=safeField(input.correo,160).toLowerCase(),
   name=safeField(isCompany?input.razon_social:input.nombre,160),
   last=safeField(input.apellido,120),
   ruc=safeField(input.ruc,25),
   contact=safeField(input.persona_contacto,120),
   instance=safeField(input.instancia,60);
  if(!/^[a-z0-9._-]{3,80}$/.test(username)||!validEmail(email)||!name)return fail("Completá nombre, usuario y correo válido.");
  if(isCompany&&(!ruc||!contact))return fail("Completá el RUC y el contacto de la empresa.");
  if(!isCompany&&(!last||!["Centro de Estudiantes","Secretaría Académica"].includes(instance)))return fail("Completá apellido e instancia del revisor.");
  const duplicated=await db("usuario",{select:"id_usuario",or:"(nombre_usuario.eq."+username+",correo.eq."+email+")",limit:1});
  if(duplicated.length)return fail("Usuario o correo ya registrado.",409);
  const raw=crypto.getRandomValues(new Uint8Array(18));
  const temporary="BLU-"+b64(raw);
  const user=(await db("usuario",{},[{nombre_usuario:username,correo:email,contrasena_hash:await passHash(temporary),tipo_usuario:isCompany?"Empresa verificada":instance,habilitado:true}],"POST"))[0];
  try{
   if(isCompany)await db("empresa_verificada",{},[{id_usuario:user.id_usuario,ruc,razon_social:name,persona_contacto:contact,correo_contacto:email,telefono:safeField(input.telefono,30)||null,habilitada:true}],"POST");
   else await db("revisor",{},[{id_usuario:user.id_usuario,nombre:name,apellido:last,instancia:instance,habilitado:true}],"POST");
  }catch(e){
   await db("usuario",{id_usuario:"eq."+user.id_usuario},null,"DELETE").catch(()=>{});
   return fail("No se pudo crear la cuenta. Revisá los datos ingresados.",409);
  }
  const notified=await mail(email,"Acceso a Bolsa Laboral Universitaria","Usuario: "+username+"\nContraseña temporal: "+temporary+"\nPor seguridad, cambiá esta contraseña al ingresar.");
  return response({ok:true,message:notified?"Cuenta creada. Se enviaron las credenciales por correo.":"Cuenta creada, pero no se enviaron las credenciales por correo. Copiá la contraseña temporal ahora.",temporary_password:notified?null:temporary,username});
 }
 if(action==="secretary-company-update"||action==="secretary-reviewer-update"){
  const actor=await actorFor(req,["Secretaría Académica"]);if(!actor)return fail("Acceso de Secretaría requerido.",401);
  const isCompany=action==="secretary-company-update";
  const id=numberId(input.id),enabled=Boolean(input.habilitado);
  if(!id)return fail("Identificador inválido.");
  const table=isCompany?"empresa_verificada":"revisor";
  const key=isCompany?"id_empresa":"id_revisor";
  const found=await db(table,{select:"id_usuario", [key]:"eq."+id,limit:1});
  if(!found.length)return fail("Registro no encontrado.",404);
  if(found[0].id_usuario===actor.user.id_usuario&&!enabled)return fail("No podés deshabilitar tu propio usuario.",409);
  const data=isCompany?
   {razon_social:safeField(input.razon_social,160),persona_contacto:safeField(input.persona_contacto,120),correo_contacto:safeField(input.correo_contacto,160).toLowerCase(),telefono:safeField(input.telefono,30)||null,habilitada:enabled}:
   {nombre:safeField(input.nombre,100),apellido:safeField(input.apellido,100),instancia:safeField(input.instancia,60),habilitado:enabled};
  if(isCompany&&(!data.razon_social||!data.persona_contacto||!validEmail(data.correo_contacto)))return fail("Completá los datos de la empresa.");
  if(!isCompany&&(!data.nombre||!data.apellido||!["Centro de Estudiantes","Secretaría Académica"].includes(data.instancia)))return fail("Datos de revisor inválidos.");
  await db(table,{[key]:"eq."+id},data,"PATCH");
  await db("usuario",{id_usuario:"eq."+found[0].id_usuario},{habilitado:enabled,...(!isCompany?{tipo_usuario:data.instancia}:{})},"PATCH");
  return response({ok:true,message:"Registro actualizado."});
 }

 if(action==="company-dashboard"){
  const actor=await actorFor(req,["Empresa verificada"]);if(!actor)return fail("Acceso de empresa requerido.",401);
  const offers=await db("oferta_laboral",{select:"id_oferta,titulo,tipo,estado,fecha_publicacion,fecha_vencimiento,vigencia_indefinida,descripcion,requisitos",id_empresa:"eq."+actor.company.id_empresa,order:"id_oferta.desc"});
  return response({ok:true,company:actor.company,offers});
 }
 if(action==="company-profile-save"){
  const actor=await actorFor(req,["Empresa verificada"]);if(!actor)return fail("Acceso de empresa requerido.",401);
  const name=safeField(input.razon_social,150),description=safeField(input.descripcion,1500),
        contact=safeField(input.persona_contacto,120),email=safeField(input.correo_contacto,160).toLowerCase(),
        phone=safeField(input.telefono,30);
  if(!name||!contact||!validEmail(email)||(phone&&!/^[+0-9 ()-]{5,30}$/.test(phone)))return fail("Revisá la razón social y los datos de contacto.");
  await db("empresa_verificada",{id_empresa:"eq."+actor.company.id_empresa},{razon_social:name,descripcion:description||null,persona_contacto:contact,correo_contacto:email,telefono:phone||null},"PATCH");
  return response({ok:true,message:"Perfil de la empresa actualizado."});
 }
 if(action==="company-offer-save"){
  const actor=await actorFor(req,["Empresa verificada"]);if(!actor)return fail("Acceso de empresa requerido.",401);
  const ids=careersInput(input.carreras),id=numberId(input.offer_id);
  const title=safeField(input.titulo,180),kind=safeField(input.tipo,20),description=safeField(input.descripcion,4000),requirements=safeField(input.requisitos,4000);
  const indefinite=Boolean(input.vigencia_indefinida),end=safeField(input.fecha_vencimiento,10);
  if(!title||!["Empleo","Pasantía"].includes(kind)||!description||!requirements||(!indefinite&&(!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<=pyDate())))return fail("Completá título, tipo, descripción, requisitos y una vigencia futura.");
  await checkCareers(ids);
  const offerData={titulo:title,tipo:kind,descripcion:description,requisitos:requirements,vigencia_indefinida:indefinite,fecha_vencimiento:indefinite?null:end};
  let offerId;
  if(id){
   const current=await db("oferta_laboral",{select:"id_oferta",id_oferta:"eq."+id,id_empresa:"eq."+actor.company.id_empresa,estado:"eq.Publicada",limit:1});
   if(!current.length)return fail("No podés editar esa oferta.",409);
   await db("oferta_laboral",{id_oferta:"eq."+id,id_empresa:"eq."+actor.company.id_empresa,estado:"eq.Publicada"},offerData,"PATCH");offerId=id;
  }else{
   const made=await db("oferta_laboral",{},[{id_empresa:actor.company.id_empresa,...offerData,origen:"Empresa verificada",estado:"Publicada",fecha_publicacion:new Date().toISOString()}],"POST");
   offerId=made[0].id_oferta;
  }
  await setOfferCareers(offerId,ids);
  return response({ok:true,message:id?"Oferta actualizada.":"Oferta publicada.",offer_id:offerId});
 }
 if(action==="company-offer-drop"){
  const actor=await actorFor(req,["Empresa verificada"]);if(!actor)return fail("Acceso de empresa requerido.",401);
  const id=numberId(input.offer_id);if(!id)return fail("Oferta inválida.");
  const changed=await db("oferta_laboral",{id_oferta:"eq."+id,id_empresa:"eq."+actor.company.id_empresa,estado:"eq.Publicada"},{estado:"Dada de baja",fecha_baja:new Date().toISOString()},"PATCH");
  if(!changed.length)return fail("La oferta ya no está publicada o no te pertenece.",409);
  await db("postulacion",{id_oferta:"eq."+id,estado:"eq.Activa"},{estado:"Cerrada"},"PATCH");
  return response({ok:true,message:"Oferta dada de baja y postulaciones cerradas."});
 }
 if(action==="company-applicants"){
  const actor=await actorFor(req,["Empresa verificada"]);if(!actor)return fail("Acceso de empresa requerido.",401);
  const id=numberId(input.offer_id);if(!id)return fail("Oferta inválida.");
  const own=await db("oferta_laboral",{select:"id_oferta,titulo",id_oferta:"eq."+id,id_empresa:"eq."+actor.company.id_empresa,limit:1});
  if(!own.length)return fail("La oferta no te pertenece.",403);
  const apps=await db("postulacion",{select:"id_postulacion,id_estudiante,estado,fecha_postulacion",id_oferta:"eq."+id,order:"fecha_postulacion.desc"});
  const people=[];
  for(const a of apps){
   const student=(await db("estudiante",{select:"nombre,apellido,matricula",id_estudiante:"eq."+a.id_estudiante,limit:1}))[0];
   const cv=(await db("curriculum_vitae",{select:"nombre_archivo",id_estudiante:"eq."+a.id_estudiante,limit:1}))[0];
   const prof=(await db("perfil_profesional",{select:"habilidades,tecnologias,disponibilidad_laboral",id_estudiante:"eq."+a.id_estudiante,limit:1}))[0];
   people.push({id_postulacion:a.id_postulacion,id_estudiante:a.id_estudiante,estado:a.estado,fecha_postulacion:a.fecha_postulacion,nombre:student?.nombre||"",apellido:student?.apellido||"",matricula:student?.matricula||"",cv:cv?.nombre_archivo||null,perfil:prof||null});
  }
  return response({ok:true,title:own[0].titulo,applicants:people});
 }
 if(action==="company-applicant-cv"){
  const actor=await actorFor(req,["Empresa verificada"]);if(!actor)return fail("Acceso de empresa requerido.",401);
  const id=numberId(input.application_id);if(!id)return fail("Postulación inválida.");
  const arr=await db("postulacion",{select:"id_estudiante,id_oferta",id_postulacion:"eq."+id,limit:1});
  if(!arr.length)return fail("Postulación inexistente.",404);
  const own=await db("oferta_laboral",{select:"id_oferta",id_oferta:"eq."+arr[0].id_oferta,id_empresa:"eq."+actor.company.id_empresa,limit:1});
  if(!own.length)return fail("No tenés acceso a esta postulación.",403);
  const cv=(await db("curriculum_vitae",{select:"ruta_archivo",id_estudiante:"eq."+arr[0].id_estudiante,limit:1}))[0];
  if(!cv)return fail("Este estudiante no tiene CV.",404);
  return response({ok:true,url:await signedAssetUrl("cv-estudiantes",cv.ruta_archivo)});
 }
 if(action==="public-offer-submit"){
  // El formulario de compartir ofertas requiere una sesión y un rol autorizado.
  const claims=await sessionFrom(req);
  if(!claims)return fail("Iniciá sesión para compartir una oferta laboral.",401);
  const authorized=await actorFor(req,["Empresa verificada","Secretaría Académica"]);
  if(!authorized)return fail("Tu usuario no tiene permisos para compartir ofertas.",403);
  const company=safeField(input.razon_social,160),contact=safeField(input.persona_contacto,120),
    contactMail=safeField(input.correo_contacto,160).toLowerCase(),phone=safeField(input.telefono_contacto,30),
    title=safeField(input.titulo,180),description=safeField(input.descripcion,4000),
    requirements=safeField(input.requisitos,4000),kind=safeField(input.tipo,30),
    mediumType=safeField(input.medio_tipo,20),mediumValue=safeField(input.medio_valor,350);
  const ids=careersInput(input.carreras);
  if(!company||!contact||!validEmail(contactMail)||!title||!description||!requirements||!["Empleo","Pasantía"].includes(kind)||!ids.length)return fail("Completá los datos obligatorios de la empresa y la oferta.");
  if(phone&&!/^[+0-9 ()-]{5,30}$/.test(phone))return fail("Teléfono inválido.");
  if(!((mediumType==="Correo"&&validEmail(mediumValue))||(mediumType==="Enlace"&&/^https:\/\/[^\s]+$/i.test(mediumValue))))return fail("Ingresá un correo o un enlace HTTPS válido para postularse.");
  await checkCareers(ids);
  const made=(await db("empresa_remitente",{},[{razon_social:company,persona_contacto:contact,correo_contacto:contactMail,telefono_contacto:phone||null}],"POST"))[0];
  let offer;
  try{
   offer=(await db("oferta_laboral",{},[{id_remitente:made.id_remitente,titulo:title,tipo:kind,descripcion:description,requisitos:requirements,origen:"Empresa no verificada",estado:"Pendiente de aprobación",fecha_envio:new Date().toISOString(),vigencia_indefinida:false}],"POST"))[0];
   await db("medio_postulacion",{},[{id_oferta:offer.id_oferta,tipo:mediumType,valor:mediumValue}],"POST");
   await setOfferCareers(offer.id_oferta,ids);
   const attached=String(input.file_base64||"");
   if(attached){
     const filename=safeField(input.filename,200);
     if(attached.length>7000000||!/\.(pdf|png|jpe?g)$/i.test(filename))throw new Error("El adjunto debe ser PDF, PNG o JPEG de hasta 5 MB.");
     let bytes;try{bytes=Uint8Array.from(atob(attached),c=>c.charCodeAt(0));}catch{throw new Error("Adjunto inválido.");}
     if(bytes.length>5242880)throw new Error("El adjunto supera los 5 MB.");
     const kindFile=/\.pdf$/i.test(filename)?"application/pdf":/\.png$/i.test(filename)?"image/png":"image/jpeg";
     const magic=kindFile==="application/pdf"?(bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70):kindFile==="image/png"?(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71):(bytes[0]===255&&bytes[1]===216);
     if(!magic)throw new Error("El formato del adjunto no es válido.");
     const ext=kindFile==="application/pdf"?"pdf":kindFile==="image/png"?"png":"jpg";
     const path=offer.id_oferta+"/"+crypto.randomUUID()+"."+ext;
     const uploaded=await fetch(BASE+"/storage/v1/object/adjuntos-ofertas/"+path,{method:"POST",headers:{"apikey":ADMIN_KEY,"authorization":"Bearer "+ADMIN_KEY,"content-type":kindFile},body:bytes});
     if(!uploaded.ok)throw new Error("No se pudo guardar el adjunto.");
     await db("adjunto_oferta",{},[{id_oferta:offer.id_oferta,nombre_archivo:filename,formato:kindFile,tamano_bytes:bytes.length,ruta_archivo:path}],"POST");
   }
  }catch(err){
   if(offer){
     await db("adjunto_oferta",{id_oferta:"eq."+offer.id_oferta},null,"DELETE").catch(()=>{});
     await db("oferta_carrera",{id_oferta:"eq."+offer.id_oferta},null,"DELETE").catch(()=>{});
     await db("medio_postulacion",{id_oferta:"eq."+offer.id_oferta},null,"DELETE").catch(()=>{});
     await db("oferta_laboral",{id_oferta:"eq."+offer.id_oferta},null,"DELETE").catch(()=>{});
   }
   await db("empresa_remitente",{id_remitente:"eq."+made.id_remitente},null,"DELETE").catch(()=>{});
   return fail(err.message?.startsWith("El adjunto")||err.message?.startsWith("No se pudo")?err.message:"No se pudo enviar la oferta.",400);
  }
  return response({ok:true,message:"Oferta recibida. Será revisada y, si se aprueba, estará vigente 14 días."},201);
 }
 if(action==="reviewer-dashboard"){
  const actor=await actorFor(req,["Centro de Estudiantes","Secretaría Académica"]);if(!actor)return fail("Acceso de revisor requerido.",401);
  const [pending,approved]=await Promise.all([
   db("oferta_laboral",{select:"id_oferta,id_remitente,titulo,tipo,descripcion,requisitos,fecha_envio,estado",estado:"eq.Pendiente de aprobación",order:"fecha_envio.asc"}),
   db("oferta_laboral",{select:"id_oferta,id_remitente,titulo,tipo,descripcion,requisitos,fecha_vencimiento,estado",estado:"eq.Publicada",id_remitente:"not.is.null",order:"id_oferta.desc"})
  ]);
  const all=[...pending,...approved];
  const remitentes=all.length?await db("empresa_remitente",{select:"*",id_remitente:"in.("+[...new Set(all.map(x=>x.id_remitente))].join(",")+")"}):[];
  const applicantsMap=new Map(remitentes.map(e=>[e.id_remitente,e]));
  for(const o of all)o.empresa=applicantsMap.get(o.id_remitente)||null;
  return response({ok:true,reviewer:actor.reviewer,pending,approved});
 }
 if(action==="reviewer-offer-detail"){
  const actor=await actorFor(req,["Centro de Estudiantes","Secretaría Académica"]);if(!actor)return fail("Acceso de revisor requerido.",401);
  const id=numberId(input.offer_id);if(!id)return fail("Oferta inválida.");
  const arr=await db("oferta_laboral",{select:"*",id_oferta:"eq."+id,id_remitente:"not.is.null",limit:1});
  if(!arr.length)return fail("Oferta inexistente.",404);
  const o=arr[0];
  const [sender,media,careers,attachments]=await Promise.all([
   db("empresa_remitente",{select:"*",id_remitente:"eq."+o.id_remitente,limit:1}),
   db("medio_postulacion",{select:"tipo,valor",id_oferta:"eq."+id}),
   db("oferta_carrera",{select:"id_carrera,carrera(nombre)",id_oferta:"eq."+id}),
   db("adjunto_oferta",{select:"id_adjunto,nombre_archivo,ruta_archivo,formato",id_oferta:"eq."+id})
  ]);
  return response({ok:true,offer:o,sender:sender[0]||null,media,careers,attachments:attachments.map(({ruta_archivo,...rest})=>rest)});
 }
 if(action==="reviewer-attachment"){
  const actor=await actorFor(req,["Centro de Estudiantes","Secretaría Académica"]);if(!actor)return fail("Acceso de revisor requerido.",401);
  const id=numberId(input.attachment_id);if(!id)return fail("Adjunto inválido.");
  const found=await db("adjunto_oferta",{select:"ruta_archivo",id_adjunto:"eq."+id,limit:1});
  if(!found.length)return fail("Adjunto inexistente.",404);
  return response({ok:true,url:await signedAssetUrl("adjuntos-ofertas",found[0].ruta_archivo)});
 }
 if(action==="reviewer-evaluate"){
  const actor=await actorFor(req,["Centro de Estudiantes","Secretaría Académica"]);if(!actor)return fail("Acceso de revisor requerido.",401);
  const id=numberId(input.offer_id),decision=safeField(input.decision,30),reason=safeField(input.motivo,1500);
  if(!id||!["Aprobar","Rechazar"].includes(decision)||(decision==="Rechazar"&&!reason))return fail("Faltan datos de evaluación.");
  const offers=await db("oferta_laboral",{select:"id_oferta",id_oferta:"eq."+id,estado:"eq.Pendiente de aprobación",id_remitente:"not.is.null",limit:1});
  if(!offers.length)return fail("Esta oferta ya fue evaluada.",409);
  const now=new Date(),expire=new Date(pyDate()+"T12:00:00Z");
  expire.setUTCDate(expire.getUTCDate()+14);
  const update=decision==="Aprobar"?{estado:"Publicada",fecha_publicacion:now.toISOString(),fecha_vencimiento:expire.toISOString().slice(0,10),vigencia_indefinida:false}:{estado:"Rechazada"};
  const done=await db("oferta_laboral",{id_oferta:"eq."+id,estado:"eq.Pendiente de aprobación"},update,"PATCH");
  if(!done.length)return fail("Esta oferta ya fue evaluada.",409);
  await db("revision_oferta",{},[{id_oferta:id,id_revisor:actor.reviewer.id_revisor,decision:decision==="Aprobar"?"Aprobada":"Rechazada",motivo_rechazo:decision==="Rechazar"?reason:null}],"POST");
  if(decision==="Rechazar"){
   const offerDetail=await db("oferta_laboral",{select:"id_remitente",id_oferta:"eq."+id,limit:1});
   const receiver=offerDetail[0]?await db("empresa_remitente",{select:"correo_contacto",id_remitente:"eq."+offerDetail[0].id_remitente,limit:1}):[];
   const notified=receiver[0]?await mail(receiver[0].correo_contacto,"Revisión de oferta laboral","Tu oferta fue rechazada por "+actor.reviewer.instancia+". Motivo: "+reason):false;
   return response({ok:true,message:notified?"Oferta rechazada y correo enviado.":"Oferta rechazada. No se pudo enviar el correo de notificación."});
  }
  return response({ok:true,message:"Oferta aprobada y publicada por 14 días."});
 }
 if(action==="reviewer-approved-save"){
  const actor=await actorFor(req,["Centro de Estudiantes","Secretaría Académica"]);if(!actor)return fail("Acceso de revisor requerido.",401);
  const id=numberId(input.offer_id),ids=careersInput(input.carreras),
   title=safeField(input.titulo,200),description=safeField(input.descripcion,4000),requirements=safeField(input.requisitos,4000),
   mediaType=safeField(input.medio_tipo,20),mediaValue=safeField(input.medio_valor,350);
  if(!id||!title||!description||!requirements||!ids.length||!((mediaType==="Correo"&&validEmail(mediaValue))||(mediaType==="Enlace"&&/^https:\/\/[^\s]+$/i.test(mediaValue))))return fail("Datos de oferta incompletos.");
  const found=await db("oferta_laboral",{select:"id_oferta",id_oferta:"eq."+id,id_remitente:"not.is.null",estado:"eq.Publicada",limit:1});
  if(!found.length)return fail("Esta oferta ya no se puede editar.",409);
  await checkCareers(ids);
  await db("oferta_laboral",{id_oferta:"eq."+id,estado:"eq.Publicada"},{titulo:title,descripcion,requisitos:requirements},"PATCH");
  await setOfferCareers(id,ids);
  const med=(await db("medio_postulacion",{select:"id_medio",id_oferta:"eq."+id,limit:1}))[0];
  if(med)await db("medio_postulacion",{id_medio:"eq."+med.id_medio},{tipo:mediaType,valor:mediaValue},"PATCH");
  else await db("medio_postulacion",{},[{id_oferta:id,tipo:mediaType,valor:mediaValue}],"POST");
  return response({ok:true,message:"Oferta aprobada actualizada sin modificar su vencimiento."});
 }
 if(action==="reviewer-approved-drop"){
  const actor=await actorFor(req,["Centro de Estudiantes","Secretaría Académica"]);if(!actor)return fail("Acceso de revisor requerido.",401);
  const id=numberId(input.offer_id);if(!id)return fail("Oferta inválida.");
  const changed=await db("oferta_laboral",{id_oferta:"eq."+id,id_remitente:"not.is.null",estado:"eq.Publicada"},{estado:"Dada de baja",fecha_baja:new Date().toISOString(),id_revisor_baja:actor.reviewer.id_revisor},"PATCH");
  if(!changed.length)return fail("La oferta ya no está publicada.",409);
  return response({ok:true,message:"Oferta dada de baja."});
 }

 if(action==="student-dashboard"){
  const auth=await studentForRequest(req);if(!auth)return fail("Iniciá sesión como estudiante.",401);
  const {user,student}=auth;
  const [carreras,profesionales,curriculums]=await Promise.all([
   db("carrera",{select:"id_carrera,nombre",order:"nombre.asc"}),
   db("perfil_profesional",{select:"*",id_estudiante:"eq."+student.id_estudiante,limit:1}),
   db("curriculum_vitae",{select:"id_cv,nombre_archivo,fecha_carga,tamano_bytes",id_estudiante:"eq."+student.id_estudiante,limit:1})
  ]);
  const prof=profesionales[0]||null;
  let experiencias=[],idiomas=[],capacitaciones=[];
  if(prof){
    [experiencias,idiomas,capacitaciones]=await Promise.all([
     db("experiencia_laboral",{select:"*",id_perfil:"eq."+prof.id_perfil,order:"id_experiencia.desc"}),
     db("idioma",{select:"*",id_perfil:"eq."+prof.id_perfil,order:"id_idioma.desc"}),
     db("capacitacion",{select:"*",id_perfil:"eq."+prof.id_perfil,order:"id_capacitacion.desc"})
    ]);
  }
  const {cedula,fecha_nacimiento,telefono,semestre_actual,matricula,nombre,apellido,id_carrera}=student;
  return response({ok:true,student:{matricula,cedula,nombre,apellido,fecha_nacimiento,telefono,semestre_actual,id_carrera,correo:user.correo},carreras,professional:prof,experiencias,idiomas,capacitaciones,cv:curriculums[0]||null});
 }
 if(action==="student-academic-save"){
  const auth=await studentForRequest(req);if(!auth)return fail("Iniciá sesión como estudiante.",401);
  const correo=safeField(input.correo,160).toLowerCase();
  const telefono=safeField(input.telefono,25);
  const fecha=safeField(input.fecha_nacimiento,10);
  const semestre=input.semestre_actual==null || String(input.semestre_actual).trim()===""?null:Number(input.semestre_actual);
  const carrera=numberId(input.id_carrera);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)|| (telefono&&!/^[+0-9 ()-]{5,25}$/.test(telefono))||(fecha&&!/^\d{4}-\d{2}-\d{2}$/.test(fecha))||(fecha&&isNaN(Date.parse(fecha)))||(fecha&&fecha>new Date().toISOString().slice(0,10))||(semestre!==null&&(!Number.isInteger(semestre)||semestre<1||semestre>20))||!carrera) return fail("Revisá el correo, teléfono, fecha, semestre y carrera.");
  const careers=await db("carrera",{select:"id_carrera",id_carrera:"eq."+carrera,limit:1});
  if(!careers.length)return fail("La carrera no existe.");
  const others=await db("usuario",{select:"id_usuario",correo:"eq."+correo,limit:1});
  if(others.length&&others[0].id_usuario!==auth.user.id_usuario)return fail("El correo ya está registrado.",409);
  // La matrícula, cédula, nombres y apellidos nunca se modifican aquí.
  await db("estudiante",{id_estudiante:"eq."+auth.student.id_estudiante},{telefono:telefono||null,fecha_nacimiento:fecha||null,semestre_actual:semestre,id_carrera:carrera},"PATCH");
  await db("usuario",{id_usuario:"eq."+auth.user.id_usuario},{correo},"PATCH");
  return response({ok:true,message:"Perfil académico actualizado."});
 }
 if(action==="student-professional-save"){
  const auth=await studentForRequest(req);if(!auth)return fail("Iniciá sesión como estudiante.",401);
  const data={habilidades:safeField(input.habilidades,1500)||null,tecnologias:safeField(input.tecnologias,1500)||null,disponibilidad_laboral:safeField(input.disponibilidad_laboral,100)||null};
  const found=await db("perfil_profesional",{select:"id_perfil",id_estudiante:"eq."+auth.student.id_estudiante,limit:1});
  if(found.length)await db("perfil_profesional",{id_perfil:"eq."+found[0].id_perfil},data,"PATCH");
  else await db("perfil_profesional",{},[{id_estudiante:auth.student.id_estudiante,...data}],"POST");
  return response({ok:true,message:"Perfil profesional guardado."});
 }
 if(action==="student-item-save"||action==="student-item-remove"){
  const auth=await studentForRequest(req);if(!auth)return fail("Iniciá sesión como estudiante.",401);
  const item=itemTables[String(input.item_type||"")];
  if(!item)return fail("Tipo de dato inválido.");
  let prof=(await db("perfil_profesional",{select:"id_perfil",id_estudiante:"eq."+auth.student.id_estudiante,limit:1}))[0];
  if(!prof){
   if(action==="student-item-remove")return fail("El elemento no existe.",404);
   prof=(await db("perfil_profesional",{},[{id_estudiante:auth.student.id_estudiante}],"POST"))[0];
  }
  const id=numberId(input.item_id);
  if(action==="student-item-remove"){
   if(!id)return fail("Identificador inválido.");
   const found=await db(item.table,{select:item.key,[item.key]:"eq."+id,id_perfil:"eq."+prof.id_perfil,limit:1});
   if(!found.length)return fail("No existe ese registro en tu perfil.",404);
   await db(item.table,{[item.key]:"eq."+id,id_perfil:"eq."+prof.id_perfil},null,"DELETE");
   return response({ok:true,message:"Registro eliminado."});
  }
  const data={};
  const maxByTable={
   experiencia_laboral:{empresa:140,cargo:120,fecha_inicio:10,fecha_fin:10},
   idioma:{nombre:80,nivel:60},
   capacitacion:{tipo:30,nombre:180,institucion:140}
  };
  for(const field of item.fields){
   if(field==="anio"){data[field]=input.anio?Number(input.anio):null;continue;}
   const raw=String(input[field]??"").trim();
   const max=maxByTable[item.table][field];
   if(raw.length>max)return fail("El campo "+field+" supera los "+max+" caracteres permitidos.");
   data[field]=raw||null;
  }
  if(item===itemTables.experiencia){
   if(!data.empresa||!data.cargo)return fail("Ingresá la empresa y el cargo.");
   if(data.fecha_inicio&&data.fecha_fin&&data.fecha_fin<data.fecha_inicio)return fail("La fecha final no puede ser anterior a la inicial.");
  }
  if(item===itemTables.idioma&&(!data.nombre||!data.nivel))return fail("Completá el idioma y nivel.");
  if(item===itemTables.capacitacion&&(!data.nombre||!data.tipo))return fail("Completá el tipo y nombre de la capacitación.");
  if(data.anio!==undefined && data.anio!==null &&(!Number.isInteger(data.anio)||data.anio<1900||data.anio>2100))return fail("Año inválido.");
  if(id){
   const found=await db(item.table,{select:item.key,[item.key]:"eq."+id,id_perfil:"eq."+prof.id_perfil,limit:1});
   if(!found.length)return fail("No existe ese registro en tu perfil.",404);
   await db(item.table,{[item.key]:"eq."+id,id_perfil:"eq."+prof.id_perfil},data,"PATCH");
  }else await db(item.table,{},[{id_perfil:prof.id_perfil,...data}],"POST");
  return response({ok:true,message:"Información profesional actualizada."});
 }
 if(action==="student-cv-upload"){
  const auth=await studentForRequest(req);if(!auth)return fail("Iniciá sesión como estudiante.",401);
  const filename=safeField(input.filename,200);
  const base64=String(input.file_base64||"");
  if(!/\.pdf$/i.test(filename)||base64.length>7000000||base64.length<12)return fail("Seleccioná un archivo PDF de hasta 5 MB.");
  let bytes;try{bytes=Uint8Array.from(atob(base64), c=>c.charCodeAt(0));}catch{return fail("Archivo PDF inválido.");}
  if(bytes.length>5242880||bytes.length<5||[37,80,68,70,45].some((v,i)=>bytes[i]!==v))return fail("El archivo debe ser un PDF válido de hasta 5 MB.");
  const path=auth.student.id_estudiante+"/"+crypto.randomUUID()+".pdf";
  const url=BASE+"/storage/v1/object/cv-estudiantes/"+path;
  const put=await fetch(url,{method:"POST",headers:{"apikey":ADMIN_KEY,"authorization":"Bearer "+ADMIN_KEY,"content-type":"application/pdf","x-upsert":"false"},body:bytes});
  if(!put.ok){console.error("Storage upload failed",put.status);return fail("No se pudo guardar el archivo PDF.",502);}
  const old=(await db("curriculum_vitae",{select:"id_cv,ruta_archivo",id_estudiante:"eq."+auth.student.id_estudiante,limit:1}))[0];
  try{
   const cv={nombre_archivo:filename,formato:"PDF",tamano_bytes:bytes.length,ruta_archivo:path,fecha_carga:new Date().toISOString()};
   if(old) await db("curriculum_vitae",{id_cv:"eq."+old.id_cv},cv,"PATCH");
   else await db("curriculum_vitae",{},[{id_estudiante:auth.student.id_estudiante,...cv}],"POST");
  }catch(err){
    await fetch(url,{method:"DELETE",headers:{"apikey":ADMIN_KEY,"authorization":"Bearer "+ADMIN_KEY}}).catch(()=>{});
    throw err;
  }
  if(old?.ruta_archivo){
   await fetch(BASE+"/storage/v1/object/cv-estudiantes/"+old.ruta_archivo,{method:"DELETE",headers:{"apikey":ADMIN_KEY,"authorization":"Bearer "+ADMIN_KEY}}).catch(()=>{});
  }
  return response({ok:true,message:"Currículum guardado correctamente."});
 }
 if(action==="student-cv-remove"){
  const auth=await studentForRequest(req);if(!auth)return fail("Iniciá sesión como estudiante.",401);
  const current=(await db("curriculum_vitae",{select:"id_cv,ruta_archivo",id_estudiante:"eq."+auth.student.id_estudiante,limit:1}))[0];
  if(!current)return fail("No tenés un currículum cargado.",404);
  // Supabase Storage API elimina el archivo físico además de sus metadatos.
  if(current.ruta_archivo){
   const removed=await fetch(BASE+"/storage/v1/object/cv-estudiantes/"+current.ruta_archivo,{
    method:"DELETE",headers:{"apikey":ADMIN_KEY,"authorization":"Bearer "+ADMIN_KEY}
   });
   if(!removed.ok && removed.status!==404)return fail("No se pudo eliminar el archivo del almacenamiento.",502);
  }
  await db("curriculum_vitae",{id_cv:"eq."+current.id_cv,id_estudiante:"eq."+auth.student.id_estudiante},null,"DELETE");
  return response({ok:true,message:"Currículum eliminado correctamente."});
 }
 if(action==="student-cv-view"){
  const auth=await studentForRequest(req);if(!auth)return fail("Iniciá sesión como estudiante.",401);
  const cv=(await db("curriculum_vitae",{select:"ruta_archivo",id_estudiante:"eq."+auth.student.id_estudiante,limit:1}))[0];
  if(!cv)return fail("Todavía no cargaste tu currículum.",404);
  const r=await fetch(BASE+"/storage/v1/object/sign/cv-estudiantes/"+cv.ruta_archivo,{method:"POST",headers:{"apikey":ADMIN_KEY,"authorization":"Bearer "+ADMIN_KEY,"content-type":"application/json"},body:JSON.stringify({expiresIn:120})});
  const payload=await r.json();
  if(!r.ok||!payload.signedURL)return fail("No se pudo abrir el currículum.",502);
  const raw=String(payload.signedURL);
  const path=/^https?:\/\//.test(raw)?raw:("/storage/v1/"+raw.replace(/^\/?storage\/v1\//,"").replace(/^\//,""));
  return response({ok:true,url:new URL(path,BASE).href});
 }
 if(action==="student-applications"){
  const auth=await studentForRequest(req);if(!auth)return fail("Iniciá sesión como estudiante.",401);
  const items=await db("postulacion",{select:"id_postulacion,id_oferta,estado,fecha_postulacion,fecha_retiro,oferta_laboral(titulo,tipo,estado,fecha_vencimiento)",id_estudiante:"eq."+auth.student.id_estudiante,order:"fecha_postulacion.desc",limit:100});
  return response({ok:true,items});
 }
 if(action==="student-apply"){
  const auth=await studentForRequest(req);if(!auth)return fail("Iniciá sesión como estudiante.",401);
  const id=numberId(input.offer_id);if(!id)return fail("Oferta inválida.");
  const arr=await db("oferta_laboral",{select:"id_oferta,id_empresa,estado,fecha_vencimiento,vigencia_indefinida",id_oferta:"eq."+id,limit:1});
  const offer=arr[0];
  if(!offer||offer.estado!=="Publicada"||!offer.id_empresa||(!offer.vigencia_indefinida&&offer.fecha_vencimiento&&offer.fecha_vencimiento<pyDate()))return fail("La oferta no admite postulaciones.",409);
  const cv=await db("curriculum_vitae",{select:"id_cv",id_estudiante:"eq."+auth.student.id_estudiante,limit:1});
  if(!cv.length)return fail("Primero tenés que cargar tu currículum.",409);
  const previous=await db("postulacion",{select:"id_postulacion",id_estudiante:"eq."+auth.student.id_estudiante,id_oferta:"eq."+id,limit:1});
  if(previous.length)return fail("Ya te postulaste a esta oferta y no podés volver a postularte.",409);
  try{await db("postulacion",{},[{id_estudiante:auth.student.id_estudiante,id_oferta:id,estado:"Activa"}],"POST");}
  catch{return fail("No se pudo postular. Verificá si ya existe una postulación.",409);}
  return response({ok:true,message:"Postulación registrada correctamente."});
 }
 if(action==="student-withdraw"){
  const auth=await studentForRequest(req);if(!auth)return fail("Iniciá sesión como estudiante.",401);
  const id=numberId(input.application_id);if(!id)return fail("Postulación inválida.");
  const arr=await db("postulacion",{select:"id_postulacion,estado",id_postulacion:"eq."+id,id_estudiante:"eq."+auth.student.id_estudiante,limit:1});
  if(!arr.length||arr[0].estado!=="Activa")return fail("Esta postulación ya no se puede retirar.",409);
  await db("postulacion",{id_postulacion:"eq."+id,id_estudiante:"eq."+auth.student.id_estudiante,estado:"eq.Activa"},{estado:"Retirada",fecha_retiro:new Date().toISOString()},"PATCH");
  return response({ok:true,message:"Postulación retirada. No podrás volver a postularte a la misma oferta."});
 }

 if(action==="password-reset-request"){
  const email=safeField(input.correo,200).toLowerCase();
  if(!validEmail(email))return fail("Ingresá un correo válido.");
  if(!Deno.env.get("RESEND_API_KEY")||!Deno.env.get("RESEND_FROM"))return fail("La recuperación por correo aún no está configurada. Consultá con Secretaría Académica.",503);
  const generic="Si el correo está registrado, recibirás un enlace para restablecer la contraseña.";
  const users=await db("usuario",{select:"id_usuario,correo,habilitado",correo:"eq."+email,limit:1});
  const user=users[0];
  if(!user||!user.habilitado)return response({ok:true,message:generic});
  const raw=b64(crypto.getRandomValues(new Uint8Array(32)));
  const expiry=new Date(Date.now()+30*60000).toISOString();
  const hash=await sha256B64(raw);
  const records=await db("token_recuperacion",{},[{id_usuario:user.id_usuario,token_hash:hash,fecha_expiracion:expiry,usado:false}],"POST");
  const link="https://bolsa-laboral-universitaria-web-v1.vercel.app/?token="+encodeURIComponent(raw)+"#restablecer";
  const delivered=await mail(user.correo,"Recuperación de contraseña - Bolsa Laboral","Para elegir una nueva contraseña, abrí este enlace válido durante 30 minutos: "+link+"\n\nSi no solicitaste este cambio, ignorá este correo.");
  if(!delivered){
   await db("token_recuperacion",{id_token:"eq."+records[0].id_token},{usado:true,fecha_uso:new Date().toISOString()},"PATCH").catch(()=>{});
   return fail("No se pudo enviar el correo de recuperación. Contactá con Secretaría Académica.",503);
  }
  return response({ok:true,message:generic});
 }
 if(action==="password-reset-complete"){
  const raw=String(input.token||"").trim(),pass=String(input.password||"");
  if(!/^[A-Za-z0-9_-]{25,80}$/.test(raw)||pass.length<8||pass.length>72)return fail("Enlace o contraseña inválidos.");
  const tokenHash=await sha256B64(raw);
  const tokens=await db("token_recuperacion",{select:"id_token,id_usuario,fecha_expiracion,usado",token_hash:"eq."+tokenHash,usado:"eq.false",order:"id_token.desc",limit:1});
  const token=tokens[0];
  if(!token||!token.fecha_expiracion||Date.parse(token.fecha_expiracion+"Z")<Date.now())return fail("El enlace ha expirado o ya fue utilizado.",409);
  const used=await db("token_recuperacion",{id_token:"eq."+token.id_token,usado:"eq.false"},{usado:true,fecha_uso:new Date().toISOString()},"PATCH");
  if(!used.length)return fail("El enlace ya fue utilizado.",409);
  await db("usuario",{id_usuario:"eq."+token.id_usuario},{contrasena_hash:await passHash(pass)},"PATCH");
  return response({ok:true,message:"Contraseña actualizada. Ya podés iniciar sesión."});
 }

 if(action==="password-change"){
  const claims=await sessionFrom(req);if(!claims)return fail("Iniciá sesión.",401);
  const users=await db("usuario",{select:"id_usuario,contrasena_hash,habilitado",id_usuario:"eq."+claims.id,limit:1});
  const u=users[0];if(!u||!u.habilitado)return fail("La cuenta no está habilitada.",403);
  const current=String(input.current_password||""),pass=String(input.new_password||"");
  if(pass.length<8||pass.length>72)return fail("La nueva contraseña debe tener entre 8 y 72 caracteres.");
  if(!(await matchPass(current,u.contrasena_hash)))return fail("La contraseña actual no es correcta.",401);
  await db("usuario",{id_usuario:"eq."+u.id_usuario},{contrasena_hash:await passHash(pass)},"PATCH");
  return response({ok:true,message:"Contraseña actualizada."});
 }

 return fail("Acción no reconocida.",404);
 }catch(err){console.error("API request error",err?.message);return fail("Ocurrió un error al procesar la solicitud.",500);}
});
