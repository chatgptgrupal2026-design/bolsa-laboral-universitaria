import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const source=readFileSync(new URL("../supabase/functions/bolsa-api/index.ts",import.meta.url),"utf8");
assert.match(source,/import nodemailer from "npm:nodemailer@10\.6\.1";/);
assert.ok(!source.includes("RESEND_API_KEY"),"Resend no debe seguir en el backend");
const from=source.indexOf("function gmailConfigured(){");
const to=source.indexOf("async function sha256B64(",from);
assert.ok(from>=0&&to>from,"No se pudo ubicar el módulo Gmail");
const env=new Map(),transportCalls=[],messages=[],errorLog=[];
let shouldReject=false,accepted=[];
const sandbox={
 Deno:{env:{get:key=>env.get(key)}},
 validEmail:v=>/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v)),
 nodemailer:{createTransport:options=>{
  transportCalls.push(options);
  return {sendMail:async message=>{
   messages.push(message);
   if(shouldReject)throw new Error("fallo simulado SMTP");
   return {accepted};
  }};
 }},
 console:{error:msg=>errorLog.push(String(msg))}
};
vm.createContext(sandbox);
vm.runInContext(source.slice(from,to)+"\n globalThis.__gmail={gmailConfigured,mail};",sandbox);
const {gmailConfigured,mail}=sandbox.__gmail;

// Sin credenciales nunca se intenta conectar.
assert.equal(gmailConfigured(),false);
assert.equal(await mail("destinatario@example.com","Prueba","Mensaje"),false);
assert.equal(transportCalls.length,0);

// Se exige contraseña de aplicación de exactamente 16 caracteres.
env.set("GMAIL_USER","qa-bolsa@gmail.com");
env.set("GMAIL_APP_PASSWORD","abcd efgh ijkl mnop");
assert.equal(gmailConfigured(),true);
accepted=["destinatario@example.com"];
assert.equal(await mail("destinatario@example.com","Prueba","Mensaje"),true);
assert.equal(transportCalls.length,1);
assert.equal(transportCalls[0].host,"smtp.gmail.com");
assert.equal(transportCalls[0].port,465);
assert.equal(transportCalls[0].secure,true);
assert.equal(transportCalls[0].auth.user,"qa-bolsa@gmail.com");
assert.equal(transportCalls[0].auth.pass,"abcdefghijklmnop");
assert.equal(messages[0].from.address,"qa-bolsa@gmail.com");
assert.equal(messages[0].to,"destinatario@example.com");

// Nunca se envían destinatarios inválidos.
assert.equal(await mail("invalido","Prueba","Mensaje"),false);
assert.equal(transportCalls.length,1);

// Si Gmail rechaza el mensaje se devuelve false, sin reportar un éxito inexistente.
accepted=[];
assert.equal(await mail("destinatario@example.com","Prueba","Mensaje"),false);
shouldReject=true;
assert.equal(await mail("destinatario@example.com","Prueba","Mensaje"),false);
assert.ok(errorLog.length>=1);
assert.ok(!errorLog.join(" ").includes("abcdefghijklmnop"),"No registrar credenciales");
env.set("GMAIL_APP_PASSWORD","incorrecta");
assert.equal(gmailConfigured(),false);
console.log("OK: Gmail SMTP configurado por secretos, envío cifrado 465 y errores seguros (sin conexión real).");
