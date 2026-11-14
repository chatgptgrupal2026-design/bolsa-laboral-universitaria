# Estado de los requerimientos — TPF04, Grupo 05

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
| CU14 | Compartir oferta externa con adjunto | SQL OK; acceso anónimo bloqueado; E2E autorizado pendiente |
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

## Restricción de acceso a «Compartir oferta»

Por decisión de producto del 14/11/2026, **la opción se oculta a invitados, estudiantes y usuarios del Centro de Estudiantes**. Solo puede ingresar un usuario autenticado con rol **Empresa verificada** o **Secretaría Académica**, y el backend comprueba el rol antes de aceptar cualquier envío. La URL directa también está restringida. Las publicaciones propias de empresas verificadas siguen disponibles en «Mi espacio → Mis ofertas».

**Diferencia respecto del TPF04 original:** CU14 describía el envío de ofertas por empresas no verificadas sin iniciar sesión. Este ajuste cambia ese requisito de acceso y debe reflejarse en el documento académico si se mantiene para la entrega.

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

## Correo electrónico pendiente de activar

El código contempla la API de Resend para el envío de enlaces de recuperación, credenciales de usuarios creados por Secretaría y notificaciones de rechazo. Para que funcione de verdad, hace falta configurar **`RESEND_API_KEY`** y **`RESEND_FROM`** como secretos de la función Supabase y verificar el dominio remitente. Sin esos secretos, las operaciones se muestran como no disponibles o pendientes de notificación; no se simula falsamente su envío.

## Para probar todos los casos de uso

1. Iniciar sesión como estudiante; actualizar perfiles; subir CV PDF; consultar la oferta DEMO, postularse, ver y retirar postulación.
2. Iniciar sesión como empresa demo; actualizar perfil; publicar y editar oferta; consultar postulantes, ver CV y dar de baja oferta.
3. Desde «Compartir oferta», enviar una oferta ficticia externa, con o sin adjunto.
4. Iniciar sesión como Secretaría demo; revisar y aprobar/rechazar; consultar ofertas aprobadas; administrar empresas y revisores.
5. Verificar vencimientos; cambiar contraseña. Activar el correo antes de probar CU18 y las notificaciones.

La publicación y las comprobaciones sintácticas **no certifican todavía todas las pruebas funcionales**. Registrar incidencias antes de presentar el proyecto como terminado.
