# Activar correos con Gmail — Bolsa Laboral Universitaria

**Fecha:** 23/11/2026  
**Estado:** backend preparado y desplegado; **NO está habilitado el envío real hasta configurar los secretos y hacer una prueba de entrega**.

## Qué cambia

El backend en `supabase/functions/bolsa-api/index.ts` utiliza ahora **Gmail SMTP + Nodemailer**, no Resend. Se conservan estas funciones:

1. **Recuperación de contraseña:** enlace válido durante 30 minutos, desde `#recuperar`.
2. **Alta de empresa verificada:** correo al administrador con usuario y contraseña temporal; si el envío falla, Secretaría obtiene la contraseña temporal solo en la respuesta de alta.
3. **Alta de revisor:** igual que el alta de empresa.
4. **Rechazo de ofertas externas:** notificación con el motivo registrado; la revisión se conserva aunque Gmail falle.

La página sigue alojada en el dominio gratuito de **Vercel**. No hace falta comprar un dominio para usar una cuenta personal de Gmail como remitente.

## Preparación en Google

1. Crear **una cuenta Gmail exclusiva para el proyecto** (no utilizar contraseñas personales ni académicas).
2. En esa cuenta activar **Verificación en dos pasos**: https://myaccount.google.com/security
3. Abrir https://myaccount.google.com/apppasswords y crear una **contraseña de aplicación** para «Bolsa Laboral Universitaria» si Google permite esta función en la cuenta. La clave suele tener 16 caracteres. La contraseña de aplicación es diferente de la contraseña normal de Gmail.
4. Guardarla directamente en el panel de secretos de Supabase. **No enviarla en ChatGPT, no pegarla en GitHub, no ponerla en `app.js` ni subir archivos `.env` al repositorio.**
5. Si Google no permite crear contraseñas de aplicación (por ejemplo, una cuenta gestionada o Advanced Protection), este método no se podrá completar con esa cuenta. Habría que usar OAuth2 o un proveedor alternativo.

Documentación: https://support.google.com/mail/answer/185833

## Configurar en Supabase (no en Vercel)

Proyecto: https://supabase.com/dashboard/project/fxbhnyvlekulmuvvmrlr

En el panel navegar a **Edge Functions → Secrets** (el nombre/ubicación exactos pueden variar según la versión). Agregar estos **dos** secretos al proyecto:

| Nombre | Valor |
|---|---|
| `GMAIL_USER` | La dirección completa del Gmail exclusivo creado |
| `GMAIL_APP_PASSWORD` | La contraseña de aplicación de 16 caracteres, no la contraseña normal de la cuenta |

El backend elimina espacios de presentación de la clave de aplicación. No es necesario configurar `RESEND_API_KEY`, `RESEND_FROM` ni un dominio verificado.

Parámetros SMTP configurados en el backend: `smtp.gmail.com`, puerto **465**, TLS implícito (`secure: true`). Se importa la versión fija `npm:nodemailer@10.6.1`. Se usan tiempos máximos de conexión para no dejar solicitudes abiertas indefinidamente.

Ejemplo de remitente: `Bolsa Laboral Universitaria <direccion-real@gmail.com>`. El remitente se construye en el backend a partir del secreto `GMAIL_USER`, no del formulario.

## Prueba después de configurar

1. Tomar una **cuenta de estudiante o usuario de prueba existente** que tenga asociada una dirección de correo controlada por el equipo.
2. Abrir https://bolsa-laboral-universitaria-web-v1.vercel.app/#recuperar sin iniciar sesión.
3. Solicitar la recuperación. Revisar bandeja de entrada y Spam del destinatario.
4. Abrir el enlace recibido: debe conducir a `#restablecer`, aceptar una contraseña nueva y rechazar el token después de usarlo.
5. Crear una empresa o un revisor de prueba desde Secretaría, y verificar la llegada del correo sin publicar credenciales en los logs.
6. Enviar y **rechazar una oferta ficticia** desde una empresa externa con correo de pruebas; comprobar que llegue el motivo. Borrar solamente los registros creados para QA.
7. Revisar que ninguna contraseña o enlace de recuperación figure en GitHub, logs o capturas.

Para evitar un bloqueo de Gmail, usar pocos envíos de prueba. Gmail personal tiene límites y puede suspender el envío automatizado si detecta abuso. La entrega no está garantizada; si Gmail rechaza un mensaje, el backend registra un error genérico sin revelar credenciales.

## Validación técnica ya hecha

- Supabase Edge Function `bolsa-api` desplegada con código Gmail.
- Suite automatizada `tests/gmail-mail.mjs` valida configuración, puerto seguro, procesamiento de la clave y errores mediante **SMTP simulado**. Esta prueba **no envía un correo real**.
- `tests/smoke.mjs` permite que la recuperación informe **503** mientras faltan secretos. No presenta el correo como activo antes de comprobar una entrega.

## Limitaciones y buenas prácticas

- No utilizar esta configuración para envíos masivos. El propósito son **mensajes transaccionales**.
- Si cambia la contraseña principal de Gmail, Google puede revocar las contraseñas de aplicación; generar otra y reemplazar el secreto.
- Las credenciales no deben enviarse mediante chat ni publicarse en el repositorio.
- Para producción con mayor volumen, un servicio especializado y un dominio verificado son opciones más fiables.
