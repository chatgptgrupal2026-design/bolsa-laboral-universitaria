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
  const correo=safeField(input.correo,200).toLowerCase();
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
  for(const field of item.fields)data[field]=field==="anio"?(input.anio?Number(input.anio):null):(safeField(input[field],250)||null);
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
 if(action==="student-cv-view"){
  const auth=await studentForRequest(req);if(!auth)return fail("Iniciá sesión como estudiante.",401);
  const cv=(await db("curriculum_vitae",{select:"ruta_archivo",id_estudiante:"eq."+auth.student.id_estudiante,limit:1}))[0];
  if(!cv)return fail("Todavía no cargaste tu currículum.",404);
  const r=await fetch(BASE+"/storage/v1/object/sign/cv-estudiantes/"+cv.ruta_archivo,{method:"POST",headers:{"apikey":ADMIN_KEY,"authorization":"Bearer "+ADMIN_KEY,"content-type":"application/json"},body:JSON.stringify({expiresIn:120})});
  const payload=await r.json();
  if(!r.ok||!payload.signedURL)return fail("No se pudo abrir el currículum.",502);
  const path=payload.signedURL.startsWith("/")?payload.signedURL:"/storage/v1"+(payload.signedURL.startsWith("/")?"":"/")+payload.signedURL;
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
  if(!offer||offer.estado!=="Publicada"||!offer.id_empresa||(!offer.vigencia_indefinida&&offer.fecha_vencimiento&&offer.fecha_vencimiento<new Date().toISOString().slice(0,10)))return fail("La oferta no admite postulaciones.",409);
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
