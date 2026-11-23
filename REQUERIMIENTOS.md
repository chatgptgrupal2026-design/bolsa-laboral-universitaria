# Estado de los requerimientos — TPF04, Grupo 05

**CU14 actualizado (22/11/2026):** empresas sin cuenta pueden enviar ofertas para aprobación desde la portada. El **listado y los detalles de ofertas siguen siendo exclusivos de usuarios autenticados**. El envío externo sin sesión devolvió HTTP 201 y dejó una propuesta pendiente en la base; los datos ficticios se eliminaron tras la prueba. No se modificaron las 18 tablas del DER.

**Acceso a ofertas (decisión del 21/11/2026):** el listado y detalle de ofertas ya no son públicos. Solo usuarios autenticados con cuenta y perfil activos (Estudiante, Empresa verificada, Centro de Estudiantes o Secretaría Académica) pueden consultarlos. Se bloquea la API con HTTP 401 y la navegación dirige a Inicio de sesión; Registro y portada continúan públicos. Esto sustituye cualquier descripción anterior de «listado público» y requiere actualizar los documentos de pruebas que lo consideraban público.

> **Actualización del 21/11/2026:** se corrigieron las incidencias del rol Alumno y Empresa verificadas en documentos de pruebas. Incluye catálogo de **9 carreras CyT**, experiencia laboral en curso, campos profesionales obligatorios, avisos/confirmaciones mejorados y consulta privada del perfil de postulantes por empresa. La nueva batería de pruebas E2E del alumno terminó **32/32 OK**. La recuperación por correo **sigue pendiente de configurar**. Consultar el [informe de correcciones de roles](./INFORME_CORRECCIONES_ROLES_2026-11-21.md) y la [ejecución de pruebas](https://github.com/chatgptgrupal2026-design/bolsa-laboral-universitaria/actions/runs/44967214205).

> **Actualización 22/11/2026 — Administrador/Empresa:** se implementaron mejoras del informe de 8 páginas: ficha completa de empresa (RF031), flyer privado en oferta externa aprobada (RF023), edición transaccional de oferta aprobada (RF033), historial de ofertas rechazadas/dadas de baja (RF033) y diálogos de aprobación/rechazo (RF022). RF026 conserva su corrección anterior. **Pendientes:** correo real de rechazo y pruebas E2E positivas en navegador con sesiones administrativas y de empresa. Consultar [informe de administrador y empresa](./INFORME_CORRECCIONES_ADMIN_EMPRESA_2026-11-22.md).

Este seguimiento corresponde a los **24 casos de uso del TPF04** y al DER del TPF05. La base conserva las 18 tablas del modelo académico, además del esquema privado `simulacion_academica` para verificar estudiantes sin acceso al sistema universitario real.

**Leyenda:** Código publicado = frontend y backend desplegados, pero no necesariamente probados de principio a fin. Operativo comprobado = se verificó la operación o su programación.

**Última auditoría (14/11/2026):** [Informe completo CU01–CU24](./AUDITORIA_FUNCIONAL_2026-11-14.md). Resultado: **27/27 pruebas E2E de estudiante** aprobadas y comprobaciones de integridad de los flujos administrativos. Los casos de uso por rol que no se probaron con sesión real siguen pendientes.

| Caso | Función | Estado verificado |
|---|---|---|
| CU01 | Registro de estudiante | E2E OK |
| CU02 | Inicio de sesión | E2E estudiante OK; otros roles pendientes |
| CU03 | Perfil académico | E2E OK; guardado atómico |
| CU04 | Perfil profesional y subregistros | E2E OK |
| CU05 | CV PDF privado | E2E OK: subir, leer, reemplazar y eliminar |
| CU06 | Consultar y filtrar ofertas | API y datos OK; UI de filtros sin prueba de navegador |
| CU07 | Detalle de oferta | E2E empresa verificada OK; externa pendiente |
| CU08 | Postularse a oferta con CV y sin duplicados | E2E OK |
| CU09 | Historial de postulaciones | E2E OK |
| CU10 | Publicar ofertas empresa verificada | SQL OK; E2E de empresa pendiente |
| CU11 | Editar ofertas de empresa | SQL OK; E2E de empresa pendiente |
| CU12 | Dar de baja ofertas y cerrar postulaciones | SQL OK; E2E de empresa pendiente |
| CU13 | Consultar postulantes y CV | SQL OK; E2E de empresa pendiente |
| CU14 | Compartir oferta externa con adjunto | HTTP real sin sesión OK (201), remitente/oferta pendiente/carrera/medio comprobados; adjunto opcional pendiente de E2E |
| CU15 | Revisar ofertas pendientes | SQL OK; E2E de revisor pendiente |
| CU16 | Evaluar oferta, registrar decisión y vigencia de 14 días | SQL OK, guardado atómico; correo pendiente |
| CU17 | Vencimiento y cierre automáticos | SQL OK y tarea pg_cron activa |
| CU18 | Recuperar contraseña | Rechazo de token inválido OK; envío de correo HTTP 503 |
| CU19 | Cambiar contraseña | E2E OK |
| CU20 | Retirar postulación y bloquear repetición | E2E OK |
| CU21 | Gestionar empresas verificadas | SQL OK; credenciales por correo pendientes |
| CU22 | Gestionar revisores | SQL OK; credenciales por correo pendientes |
| CU23 | Gestionar oferta externa aprobada | SQL OK; E2E de revisor pendiente |
| CU24 | Actualizar perfil de empresa | SQL OK; E2E de empresa pendiente |

## Acceso a «Compártenos tu oferta laboral» (CU14)

**Decisión de corrección del 22/11/2026: restaurado el requisito RF017–RF020 del TPF04.** Las **empresas no verificadas no necesitan cuenta ni iniciar sesión** para remitir una propuesta desde la portada o desde `#compartir`. El formulario recoge razón social, contacto, datos de la oferta, carrera(s), correo o enlace de postulación y adjunto opcional (PDF, PNG o JPEG, hasta 5 MiB).

Toda propuesta de empresa externa se almacena con origen `Empresa no verificada` y estado **`Pendiente de aprobación`**. **No es visible a los estudiantes** hasta que Centro de Estudiantes o Secretaría Académica la aprueben; en ese momento recibe 14 días de vigencia.

**El catálogo permanece PRIVADO:** `offers`, `offer-detail` y `#ofertas` requieren una cuenta autenticada y habilitada. El formulario externo NO da acceso al listado de oportunidades. Empresas verificadas mantienen la gestión de sus propias ofertas desde su panel.

**Validación:** se ejecutó una solicitud HTTP real sin token contra `public-offer-submit`, que devolvió **201**; se verificaron remitente, oferta pendiente, carrera y medio de postulación en PostgreSQL. Se eliminaron los datos ficticios al terminar. CI prueba envíos incompletos y campo antispam. El control antispam es básico; antes de uso público a gran escala conviene configurar protección contra envíos automatizados como CAPTCHA y limitación de frecuencia.

## Infraestructura

- **Frontend:** `index.html`, `app.js`, `student.js`, `portal.js`, `styles.css`.
- **API protegida:** `supabase/functions/bolsa-api/index.ts`; permisos comprobados por rol desde el servidor.
- **Base:** 18 tablas del DER del TPF05, con RLS habilitado. El backend usa únicamente la clave de servicio guardada en Supabase.
- **Simulador:** `simulacion_academica.estudiante` y `consultar_estudiante_academico_simulado`; las cédulas están únicamente en la base privada, nunca en GitHub.
- **Storage privado:** `cv-estudiantes` (PDF hasta 5 MiB) y `adjuntos-ofertas` (PDF/PNG/JPEG hasta 5 MiB). Los enlaces de consulta son temporales y se autorizan según usuario/rol.
- **CU17:** `sql/vencimiento_ofertas.sql`, programado diariamente con pg_cron.
- **Despliegue:** GitHub `main` → Vercel automáticamente. Los cambios del backend se despliegan por separado en Supabase.
- **Pruebas automáticas:** `.github/workflows/pruebas.yml` y `tests/smoke.mjs` (lectura de carreras, ofertas, detalle y negativas de autorización). Los casos autenticados necesitan pruebas manuales con cuentas demo y datos ficticios.

## Datos de demostración

- Una empresa verificada ficticia: **Empresa de Demostración FCT**.
- Una vacante marcada **DEMO · Pasantía de Desarrollo de Software**, sin validez como oportunidad real.
- Una cuenta de Secretaría Académica ficticia para revisar y administrar cuentas.

Los usuarios y contraseñas de prueba **no se incluyen en este repositorio público**. Cambiar las contraseñas demo tras la primera prueba.

## Correo electrónico — Gmail SMTP pendiente de activar

**Actualización del 23/11/2026:** sustituimos Resend por **Gmail SMTP sobre TLS (puerto 465)** mediante Nodemailer en la Edge Function. Se conservan recuperación de contraseña, avisos de rechazo y credenciales temporales de nuevas empresas/revisores.

**El envío real sigue PENDIENTE** de que el equipo cree un Gmail exclusivo, active verificación en dos pasos, genere una contraseña de aplicación y cargue **`GMAIL_USER`** y **`GMAIL_APP_PASSWORD`** en los secretos de Supabase. No hace falta comprar un dominio ni cambiar Vercel. Ninguna contraseña se incluye en GitHub o chats.

La integración se desplegó, pero **las pruebas son simuladas** hasta verificar un correo real. Consultar la [guía paso a paso](./docs/CONFIGURAR_CORREO_GMAIL.md).

## Para probar todos los casos de uso

1. Iniciar sesión como estudiante; actualizar perfiles; subir CV PDF; consultar la oferta DEMO, postularse, ver y retirar postulación.
2. Iniciar sesión como empresa demo; actualizar perfil; publicar y editar oferta; consultar postulantes, ver CV y dar de baja oferta.
3. Desde «Compartir oferta», enviar una oferta ficticia externa, con o sin adjunto.
4. Iniciar sesión como Secretaría demo; revisar y aprobar/rechazar; consultar ofertas aprobadas; administrar empresas y revisores.
5. Verificar vencimientos; cambiar contraseña. Activar el correo antes de probar CU18 y las notificaciones.

La publicación y las comprobaciones sintácticas **no certifican todavía todas las pruebas funcionales**. Registrar incidencias antes de presentar el proyecto como terminado.
