# Auditoría funcional — Bolsa Laboral Universitaria

**Fecha:** 14 de noviembre de 2026  
**Proyecto:** Ingeniería del Software 2 — Grupo 05, Universidad Católica  
**Fuentes académicas:** TPF04 (Modelo de Análisis, CU01–CU24) y TPF05 (DER de 18 tablas).  
**Entornos:** GitHub `main`, Vercel, Supabase PostgreSQL y Edge Function `bolsa-api` v15.

## Criterios de evidencia

- **E2E OK**: se invocó el servicio HTTP real con usuarios ficticios, contraseñas generadas durante la ejecución, sesiones firmadas y verificación de respuesta y estado.
- **SQL OK**: se comprobó el flujo de integridad y las transiciones en PostgreSQL, dentro de una transacción revertida al terminar. **No confirma la interfaz ni la autenticación positiva de ese rol.**
- **Parcial**: parte del caso de uso está comprobada, pero quedan dependencias externas o validación funcional.
- **Pendiente**: falta una dependencia necesaria para realizar la prueba.

## Resultados principales

**27/27 pruebas E2E aprobadas** en el último ciclo después de las correcciones.

Ejecución documentada: [GitHub Actions — auditoría estudiante, ejecución 43574343378](https://github.com/chatgptgrupal2026-design/bolsa-laboral-universitaria/actions/runs/43574343378). En esa ejecución se verificaron registro, autenticación, perfil académico y profesional, carga/lectura/reemplazo/eliminación de CV privado, consultas de ofertas, postulación, rechazo de duplicados, historial, retiro, cambio de contraseña y seguridad de roles.

Después de modificar CU03 para usar transacciones, la batería se volvió a ejecutar: [GitHub Actions — ejecución 43574343378](https://github.com/chatgptgrupal2026-design/bolsa-laboral-universitaria/actions/runs/43574343378). Resultado final **27 OK, 0 ERROR**.

Otras verificaciones: **12 casos de uso con pruebas SQL transaccionales correctas**; control de acceso anónimo HTTP 401 para empresa, revisión, Secretaría y compartir ofertas; trabajo diario CU17 programado y comprobado.

## Matriz de casos de uso

| CU | Caso de uso según TPF04 | Evidencia | Estado y límite |
|---|---|---|---|
| 01 | Registro de estudiante | E2E: registro válido, cédula incorrecta y duplicado | E2E OK |
| 02 | Iniciar sesión | E2E: estudiante, contraseña incorrecta, sesión inválida | E2E OK para estudiante; acceso positivo de otros roles pendiente |
| 03 | Gestionar perfil académico | E2E: guardar, leer, validar; RPC atómica comprobada | E2E OK |
| 04 | Gestionar perfil profesional | E2E: datos, experiencia, idioma, capacitación, edición y baja | E2E OK |
| 05 | Gestionar currículum vitae | E2E: PDF privado, URL temporal, reemplazo y eliminación | E2E OK |
| 06 | Consultar y filtrar ofertas | E2E: listado y carreras; CI comprueba estructura frontend | Parcial: filtros visuales sin prueba de navegador |
| 07 | Ver detalle de oferta | E2E: detalle de empresa verificada; modelo SQL para externas | Parcial: detalle externo sin prueba HTTP positiva |
| 08 | Postularse a oferta | E2E: CV obligatorio, creación, bloqueo de duplicados | E2E OK |
| 09 | Consultar mis postulaciones | E2E: historial y estado | E2E OK |
| 10 | Publicar ofertas (empresa verificada) | SQL: publicación y carrera asociada; ruta anónima rechazada | SQL OK; falta sesión de empresa en HTTP |
| 11 | Editar oferta | SQL: edición sin cambio de titular | SQL OK; falta sesión de empresa en HTTP |
| 12 | Dar de baja oferta | SQL: baja y cierre de postulaciones | SQL OK; falta sesión de empresa en HTTP |
| 13 | Consultar postulantes | SQL: vinculación oferta–postulante–CV | SQL OK; falta acceso HTTP real desde empresa |
| 14 | Compartir oferta laboral (empresa no verificada) | SQL: remitente, pendiente, carrera, medio y adjunto; anónimo 401 | Parcial; acceso cambiado respecto del TPF04 |
| 15 | Revisar ofertas pendientes | SQL: oferta externa pendiente y adjuntos; anónimo 401 | SQL OK; falta sesión de revisor en HTTP |
| 16 | Evaluar oferta pendiente | SQL: aprobación, rechazo, revisión, 14 días y prevención de duplicado | Parcial: falta E2E de revisor y envío de correo |
| 17 | Vencer ofertas automáticamente | SQL: vence oferta y cierra postulación; cron activo | SQL OK y automatización confirmada |
| 18 | Recuperar contraseña | E2E: token inválido rechazado; HTTP 503 al pedir correo | **Bloqueado:** falta servicio de correo |
| 19 | Cambiar contraseña | E2E: guarda nueva, rechaza anterior, permite nueva | E2E OK |
| 20 | Retirar postulación | E2E: retiro, estado y bloqueo de nueva postulación | E2E OK |
| 21 | Gestionar empresas verificadas | SQL: crear, actualizar, habilitar y deshabilitar | Parcial: falta sesión real y envío de credenciales |
| 22 | Gestionar usuarios revisores | SQL: crear, cambiar instancia y deshabilitar | Parcial: falta sesión real y envío de credenciales |
| 23 | Gestionar ofertas aprobadas de empresa no verificada | SQL: editar sin extender vigencia y dar de baja | SQL OK; falta sesión HTTP de revisor |
| 24 | Actualizar perfil de empresa verificada | SQL: actualización de datos de contacto | SQL OK; falta sesión HTTP de empresa |

## Correcciones de esta auditoría

1. **CU05:** implementada eliminación segura del CV desde el panel y la API, utilizando el servicio Storage para retirar el archivo físico (no solo el registro). Probada en la batería E2E.
2. **Validación del DER:** ajustadas longitudes de correo, RUC, datos de contacto, títulos y subregistros profesionales a los límites de las columnas PostgreSQL. Evita errores genéricos al guardar texto largo.
3. **Vigencia:** comparación de fechas de postulación según `America/Asuncion`, evitando decisiones basadas en el día UTC.
4. **CU03:** correo de usuario y perfil académico se guardan juntos mediante `guardar_perfil_academico`. Verificada en PostgreSQL y en E2E posterior al cambio.
5. **CU16:** actualización de estado de oferta e inserción de revisión se realizan juntos mediante `evaluar_oferta_pendiente`; una segunda aprobación no modifica la oferta. Comprobada transaccionalmente.
6. **Prueba automatizada:** corregida una aserción equivocada sobre el ID interno del CV; el reemplazo ya funcionaba correctamente. Segunda y tercera ejecución: 27/27 OK.

Código de migración: [`sql/atomicidad_cu03_cu16.sql`](./sql/atomicidad_cu03_cu16.sql).

## Bloqueos y riesgos abiertos

- **Correo:** recuperación de contraseña (CU18), avisos de rechazo (CU16) y envío de credenciales (CU21–CU22) requieren configurar `RESEND_API_KEY`, `RESEND_FROM` y un remitente autorizado. La solicitud de recuperación devolvió **HTTP 503**, confirmando que aún no está disponible. No se afirmó que se enviaran correos.
- **Sesiones de roles privilegiados:** faltan pruebas HTTP positivas autenticadas para empresa verificada, Centro de Estudiantes y Secretaría. Se verificaron permisos negativos y operaciones de base, pero eso no constituye E2E de sus pantallas. Para automatizarlas se necesitan credenciales de prueba gestionadas de manera segura, no expuestas en el repositorio.
- **Pruebas visuales:** el CI valida sintaxis, rutas, componentes y estilos responsive; no sustituye una exploración manual con navegador y distintos tamaños de pantalla.
- **Desviación de CU14:** el TPF04 original permite que empresas no verificadas envíen ofertas sin iniciar sesión. Por una decisión posterior se restringió «Compartir oferta» a roles Empresa verificada y Secretaría Académica. Debe actualizarse el documento académico si se mantiene esta regla.
- **Pruebas de estrés, concurrencia y envío real de adjuntos externos:** no se ejecutaron ni se declaran aprobadas.

## Integridad y limpieza

- Se usaron **6 estudiantes simulados** y **5 usuarios de empresa/revisión/administración**, todos ficticios.
- Los 11 usuarios de QA y las 6 matrículas de prueba se eliminaron después de las verificaciones.
- Los archivos de CV usados durante E2E se eliminaron mediante Storage; la comprobación final informó **0 archivos de QA restantes**.
- Las pruebas SQL se ejecutaron con `ROLLBACK`: no dejaron ofertas ni revisiones temporales.
- La extensión `pg_net`, utilizada temporalmente para verificar HTTP desde PostgreSQL, fue desinstalada después de probar los permisos.
- El esquema público conserva **18 tablas** del DER; el simulador privado conserva su tabla separada; los 2 buckets de archivos siguen privados.
- Continúan activos el usuario existente `c06559`, la oferta marcada `DEMO` y la tarea programada para CU17.

## Estado de publicación

- Backend Supabase: **Edge Function `bolsa-api` versión 15, ACTIVE**.
- GitHub `main`: código del frontend y API sincronizados, pruebas de sintaxis y de lectura públicas aprobadas.
- Vercel: despliegues de los commits de correcciones confirmados como `success`.

**Conclusión:** los flujos del estudiante están probados con éxito y la integridad de los flujos administrativos fue validada a nivel de base de datos. No se debe afirmar que los 24 casos de uso estén completamente probados hasta configurar el correo y ejecutar E2E autenticado de los roles privilegiados.
