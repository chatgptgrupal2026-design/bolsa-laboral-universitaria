# Estado de los requerimientos — TPF04, Grupo 05

Documento fuente: **Modelo de Análisis, TPF04**, casos CU01–CU24.
La base de datos utiliza las 18 tablas del DER del TPF05. El simulador de alumnos está separado en el esquema privado `simulacion_academica` y no modifica esas 18 tablas.

## Etapa implementada en el código

| CU | Requerimiento | Situación |
|---|---|---|
| CU01 | Registro de estudiante contra sistema académico simulado | Operativo; validado con la cuenta c06559 |
| CU02 | Iniciar sesión según rol | Operativo para estudiante; roles adicionales por integrar en el frontend |
| CU03 | Consultar y modificar perfil académico | Backend y formulario publicados; pendiente prueba funcional |
| CU04 | Habilidades, tecnologías, disponibilidad, experiencias, idiomas, capacitaciones | Backend y formulario publicados; pendiente prueba funcional |
| CU05 | Cargar, reemplazar y ver CV PDF hasta 5 MB | Backend, bucket privado y formulario publicados; pendiente prueba con PDF |
| CU06 | Consultar ofertas y filtrar por tipo/carrera | Publicado; datos DEMO cargados para prueba |
| CU07 | Detalle de oferta, origen y medio externo | Publicado; pendiente prueba de interfaz |
| CU08 | Postulación a una oferta verificada, CV obligatorio, una por oferta | Backend y pantalla publicados; pendiente prueba con sesión |
| CU09 | Historial de postulaciones | Backend y pantalla publicados; pendiente prueba con sesión |
| CU17 | Vencimiento diario de ofertas y cierre de postulaciones | Programado en PostgreSQL con pg_cron; consulta de comprobación ejecutada |
| CU19 | Cambio de contraseña con comprobación de contraseña actual | Backend y formulario publicados; pendiente prueba funcional |
| CU20 | Retiro de postulación y prohibición de volver a postularse | Backend y pantalla publicados; pendiente prueba con sesión |

## Etapa pendiente

| CU | Requerimiento |
|---|---|
| CU10 | Empresa verificada: publicar ofertas |
| CU11 | Empresa verificada: editar sus ofertas |
| CU12 | Empresa verificada: dar de baja ofertas |
| CU13 | Empresa verificada: consultar postulantes y sus CV |
| CU14 | Empresa no verificada: compartir una oferta con archivo opcional |
| CU15 | Revisores: listar y consultar ofertas pendientes |
| CU16 | Revisores: aprobar/rechazar y notificar por correo |
| CU18 | Recuperar contraseña mediante correo y enlace de un solo uso |
| CU21 | Secretaría: gestionar empresas verificadas |
| CU22 | Secretaría: gestionar revisores |
| CU23 | Revisores: modificar o dar de baja ofertas aprobadas |
| CU24 | Empresa verificada: actualizar su perfil |

**La publicación de código no equivale a todas las pruebas funcionales.** La interfaz de estudiante debe probarse con una cuenta registrada y un CV PDF.
Las notificaciones por correo requerirán configurar un proveedor real de envío, sin simular el envío como exitoso.

## Tecnología

- Web estática: `index.html`, `app.js`, `student.js`, `styles.css`
- API: `supabase/functions/bolsa-api/index.ts`
- Postgres: 18 tablas del DER, más esquema interno del simulador.
- Archivos: `storage.buckets` → `cv-estudiantes` (**privado**, PDF, 5 MiB).
- Automatización: `sql/vencimiento_ofertas.sql` (programado en base real).
- Despliegue: cada push a `main` se envía automáticamente a Vercel.
- Pruebas: `tests/smoke.mjs`, ejecutado por GitHub Actions.

## Consideraciones de prueba

Existe una **oferta ficticia** visible llamada `DEMO · Pasantía de Desarrollo de Software`. No corresponde a una vacante real ni debe usarse fuera de demostraciones académicas.
