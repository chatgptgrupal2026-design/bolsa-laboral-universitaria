# Informe de correcciones — Rol Alumno y Empresa Verificada

**Fecha:** 21 de noviembre de 2026  
**Origen:** `ROL ALUMNO TEST.docx` (7 páginas) y `Rol EMPRESA VERIFICADA TEST.docx` (2 páginas), compartidos por el Grupo 05.  
**Sistema:** Bolsa Laboral Universitaria, frontend Vercel, backend Supabase.  
**Alcance:** incidencias y sugerencias de los documentos, sin modificar la estructura de las 18 tablas del DER.

## Estado por observación

| Incidencia del documento | Corrección aplicada | Evidencia/estado |
|---|---|---|
| RF002: el mensaje menciona «registro académico simulado» | Texto cambiado por «La matrícula o la cédula no coinciden con el registro académico.» | Código API actualizado |
| RF004, RF009: solo existe Análisis de Sistemas | Cargadas las 8 carreras faltantes, total 9, en `public.carrera` y documentadas en `sql/catalogo_carreras_cyt.sql` | BD comprobada; E2E cambio de carrera OK |
| RF004/NF006: perfil profesional guarda habilidades/disponibilidad vacías | Ambos campos son obligatorios en frontend y backend | E2E rechazo de datos incompletos OK |
| RF006: no se guarda experiencia laboral | Formulario con campos obligatorios, validación y aviso al guardar; backend valida fechas | E2E alta y edición de experiencia OK |
| RF006: falta «Actualmente estoy trabajando en este lugar» | Casilla que deshabilita fecha de finalización; en el modelo existente se guarda `fecha_fin=NULL` | E2E trabajo actual OK |
| RF005: aviso al reemplazar CV poco claro | Notificación visual propia de la app | Componente y enlace comprobados; revisión visual manual pendiente |
| RF010/RF036: confirmaciones de postularse/retirarse son ventanas del navegador | Reemplazadas por diálogo visual accesible propio, con botón explícito y aviso de resultado | Código y componentes comprobados; revisión visual manual pendiente |
| RF010: la oferta deja volver a presionar Postularme | Se consulta historial y aparece «Ya te postulaste a esta oferta»; el servidor sigue impidiendo duplicados | E2E duplicados OK |
| RF030/RF036: reglas de vencimiento/baja y retiro | Backend bloquea el retiro si la oferta ya no está vigente; impide postulación vencida | Código; SQL automatización de vencimiento ya comprobada; escenario UI específico pendiente |
| RF035: cambiar contraseña correcto/incorrecto no funciona | Validación y aviso mejorados; no se cambió la lógica de seguridad que ya funcionaba con usuarios QA | E2E credencial actual equivocada, cambio correcto e inicio con nueva contraseña OK |
| RF034: recuperación de contraseña y enlace no funcionan | **Sin resolver:** requiere `RESEND_API_KEY`, `RESEND_FROM` y dominio remitente verificado. No se fingió envío | HTTP 503 sin configuración; token falso correctamente rechazado |
| Empresa RF026: no se puede abrir el perfil de un postulante | Nueva pantalla «Ver perfil» con carrera, semestre, habilidades, tecnologías, disponibilidad, experiencias, idiomas, cursos y CV | API y UI publicadas; bloqueo por roles validado; falta prueba E2E positiva desde navegador de empresa |

## Catálogo CyT incorporado

- Análisis de Sistemas (existía).
- Arquitectura.
- Diseño Gráfico.
- Diseño Industrial.
- Ingeniería Ambiental.
- Ingeniería Civil.
- Ingeniería Electrónica.
- Ingeniería Industrial.
- Ingeniería Informática.

Referencia institucional: [Facultad de Ciencias y Tecnología, graduados en Asunción](https://cyt.uc.edu.py/2022/06/07/graduacion-de-la-promocion-2021-de-la-facultad-de-ciencias-y-tecnologia-en-asuncion/).

## Pruebas y auditoría

- **32/32 tests E2E aprobados** en la ejecución [GitHub Actions 44967214205](https://github.com/chatgptgrupal2026-design/bolsa-laboral-universitaria/actions/runs/44967214205). Incluyen selección de otra carrera, datos profesionales obligatorios, experiencia actual, cambio de contraseña, CV privado, postulación/retirada y permisos de empresa.
- CI público incluye prueba de las 9 carreras, protección de perfil del postulante y estructura del frontend.
- Backend `bolsa-api` versión 17 desplegada, con verificación de propiedad de oferta en `company-applicant-profile`.
- La empresa de demostración tiene postulaciones relacionadas con estudiantes reales del sistema, confirmadas por consulta de integridad sin divulgar datos.
- Los dos usuarios QA creados para probar E2E se borraron y no quedaron documentos privados de prueba.
- Verificación final: 18 tablas públicas, 9 carreras, proceso de vencimiento activo y cuentas preexistentes preservadas.

## Pendientes para validar con personas reales del grupo

1. **Recuperación por correo:** habilitar Resend y realizar envío al correo de prueba antes de declarar RF034 correcto.
2. **Perfil del postulante en empresa:** entrar con la cuenta `empresa_demo_fct`, abrir «Mis ofertas → Postulantes → Ver perfil» y comprobar visualmente la información. La autorización negativa fue probada, pero no se ejecutó una sesión positiva real del rol empresa desde un navegador.
3. **Diseño de confirmaciones:** revisar accesibilidad y presentación en celular y PC, ya que las pruebas automáticas inspeccionan el código pero no sustituyen una exploración visual.
4. **Vencimientos y filtros combinados:** probar una oferta vencida en pantalla y la selección de dos carreras distintas con ofertas específicas. El backend de cierre y el catálogo fueron verificados, pero estos escenarios particulares del navegador siguen pendientes.

## Archivos modificados

- `student.js`: validaciones del perfil, experiencia en curso, aviso de postulación duplicada, diálogos.
- `portal.js`: nueva vista de perfil del postulante y avisos.
- `ux-feedback.js`: diálogos y notificaciones.
- `index.html`: carga del nuevo componente.
- `theme-indigo.css`: estilos adaptables para las vistas nuevas.
- `supabase/functions/bolsa-api/index.ts`: control de experiencia, perfil de postulante autorizado, retiro fuera de vigencia y textos.
- `sql/catalogo_carreras_cyt.sql`: datos reproducibles de carreras.
- `tests/smoke.mjs`, `tests/front-design.mjs`, `tests/e2e-student-once.mjs`: regresiones automáticas.

**Conclusión:** las incidencias de carrera, validaciones, experiencia y mensajes están corregidas; el perfil de postulantes cuenta con interfaz y API segura publicada. El envío de recuperación de contraseña permanece bloqueado por configuración externa, y no se marca como probado el flujo visual de empresa sin una sesión real.
