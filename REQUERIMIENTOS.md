# Estado de los requerimientos — TPF04, Grupo 05

Este seguimiento corresponde a los **24 casos de uso del TPF04** y al DER del TPF05. La base conserva las 18 tablas del modelo académico, además del esquema privado `simulacion_academica` para verificar estudiantes sin acceso al sistema universitario real.

**Leyenda:** Código publicado = frontend y backend desplegados, pero no necesariamente probados de principio a fin. Operativo comprobado = se verificó la operación o su programación.

| Caso | Función | Estado |
|---|---|---|
| CU01 | Registro de estudiante con matrícula y cédula simuladas | Operativo comprobado |
| CU02 | Inicio de sesión por matrícula/usuario según rol | Operativo para estudiante; otros roles con cuentas demo, pendiente prueba |
| CU03 | Editar perfil académico | Código publicado; pendiente prueba |
| CU04 | Editar perfil profesional, experiencias, idiomas y capacitaciones | Código publicado; pendiente prueba |
| CU05 | Subir, reemplazar y ver CV PDF (máximo 5 MB) | Código publicado, bucket privado; pendiente prueba con PDF |
| CU06 | Consultar ofertas y filtrar por tipo y carrera | Código publicado, oferta DEMO cargada; pendiente prueba |
| CU07 | Ver detalle; empresa verificada o externa con medio de postulación | Código publicado; pendiente prueba |
| CU08 | Postularse a oferta de empresa verificada con CV; una vez por oferta | Código publicado; pendiente prueba |
| CU09 | Consultar historial de postulaciones | Código publicado; pendiente prueba |
| CU10 | Empresa verificada publica ofertas | Código publicado; pendiente prueba |
| CU11 | Empresa verificada modifica sus ofertas | Código publicado; pendiente prueba |
| CU12 | Empresa verificada da de baja ofertas y cierra postulaciones | Código publicado; pendiente prueba |
| CU13 | Empresa ve postulantes y CV privado | Código publicado; pendiente prueba |
| CU14 | Empresa no verificada comparte oferta con adjunto opcional | Código publicado; pendiente prueba |
| CU15 | Revisores consultan ofertas pendientes, detalle y adjuntos | Código publicado; pendiente prueba |
| CU16 | Revisor aprueba (14 días) o rechaza con motivo | Código publicado; correo requiere configuración |
| CU17 | Vencimiento automático y cierre de postulaciones | Programado en pg_cron, ejecución de comprobación correcta |
| CU18 | Solicitar enlace de recuperación, restablecer con token de un solo uso | Código publicado; requiere proveedor de correo real |
| CU19 | Cambio de contraseña desde sesión | Código publicado; pendiente prueba |
| CU20 | Retiro de postulación sin posibilidad de volver a postularse | Código publicado; pendiente prueba |
| CU21 | Secretaría gestiona empresas verificadas | Código publicado; correo de credenciales requiere configuración |
| CU22 | Secretaría gestiona revisores | Código publicado; correo de credenciales requiere configuración |
| CU23 | Revisor edita o da de baja ofertas externas aprobadas | Código publicado; pendiente prueba |
| CU24 | Empresa verificada actualiza su perfil | Código publicado; pendiente prueba |

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
