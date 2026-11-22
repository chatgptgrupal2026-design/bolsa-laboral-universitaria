# Correcciones de pruebas — Administrador y Empresa Verificada

**Fecha:** 22/11/2026  
**Documento recibido:** `Rol ADMINISTRADOR_EMPRESA VERIFICADA.docx` (8 páginas).  
**Alcance:** RF020–RF033, RF037, RF026; panel de Secretaría Académica, revisión de ofertas y consulta de postulantes. Se mantienen las 18 tablas del DER y las reglas de sesión privada para visualizar ofertas.

## Diagnóstico y solución

| Página | Requerimiento | Hallazgo del documento | Corrección y estado |
|---|---|---|---|
| 2 | RF031 | Se guarda la modificación de una empresa, pero no aparecen todos los datos | `secretary-dashboard` ahora devuelve `descripcion` y el panel muestra descripción, contacto, correo y teléfono; se habilitó modificar la descripción desde Secretaría. Código publicado; prueba visual pendiente. |
| 4 | RF022 | La aprobación usa `window.confirm` del navegador | Se utiliza `BolsaUI.confirm` (diálogo accesible y coherente con el tema). Código y pruebas estáticas OK. |
| 4 | RF023 | No se puede visualizar el flyer al consultar una oferta aprobada de empresa no verificada | `offer-detail` incluye metadatos del adjunto; `offer-attachment` entrega URL privada firmada, con rol y estado verificados; la vista del estudiante incorpora imagen y enlace para abrir PDF/archivo. Existen archivos reales en Storage de las ofertas 19 y 24. Prueba positiva de enlace desde navegador pendiente. |
| 5 | RF022 | El rechazo solicita motivo mediante `window.prompt` | Diálogo propio con textarea, motivo obligatorio y botones explícitos. Código y pruebas estáticas OK. |
| 5 | RF022 | El correo de notificación de rechazo no se envía | **Pendiente externo:** configurar `RESEND_API_KEY`, `RESEND_FROM` y dominio remitente. La oferta se rechaza y queda auditada aunque no pueda enviarse el mensaje. No afirmar correo enviado. |
| 5 | RF033 | Error al modificar oferta externa ya aprobada | Nueva RPC `actualizar_oferta_externa_aprobada`: edita título, descripción, requisitos, carreras y medio de postulación en una única transacción. Evita actualizaciones parciales y NO modifica el vencimiento. Prueba SQL real con `ROLLBACK` OK. Falta E2E HTTP positivo desde Secretaría. |
| 6 | RF033 | Desaparece de la vista una oferta rechazada o dada de baja; no hay historial | Se añadió **Historial de ofertas** a los menús de Secretaría y Centro de Estudiantes; incluye estados `Rechazada`, `Dada de baja` y `Vencida`, motivo, decisión y fecha de revisión. SQL confirmó registros conservados en BD. Código publicado, recorrido visual pendiente. |
| 7 | RF026 | No se puede abrir perfil de estudiante postulado | Ya estaba implementado en la versión anterior: botón **Ver perfil** con datos académicos, profesional, experiencia, idiomas y capacitaciones, autorizado por titularidad de la oferta. No se cambió. Sigue pendiente prueba positiva de navegador de empresa. |

## Pruebas efectuadas

- GitHub Actions: `tests/front-design.mjs` verifica nuevas vistas, botones y rutas; `tests/smoke.mjs` confirma que no se entregan flyers a visitantes sin sesión (HTTP 401). La batería CI terminó **success**.
- **SQL de edición atómica:** ejecutada sobre la oferta 24 dentro de `BEGIN … ROLLBACK`. Se verificó modificación, carreras y medio relacionados, y conservación del vencimiento y del estado. No se cambió ningún dato real.
- **Storage:** los flyers de las ofertas externas publicadas 19 y 24 existen en el bucket privado `adjuntos-ofertas`.
- **Historial existente:** PostgreSQL conserva ofertas externas en estado `Rechazada` y `Dada de baja`. El panel antes solo consultaba pendientes y publicadas.
- **Limpieza:** no se crearon usuarios QA ni ofertas QA permanentes en esta ronda, y no se habilitó una extensión de red de prueba.

## Validaciones pendientes

1. **Operación HTTP positiva de Secretaría:** editar una oferta aprobada y consultar su historial desde el panel con sesión válida. La prueba SQL atómica no sustituye esta validación.
2. **Flyer publicado:** abrir una oferta externa con imagen y comprobar que se visualice el PNG y se abra con una URL firmada válida.
3. **Correo real de rechazo:** requiere configuración del proveedor Resend, fuera del alcance de los cambios del repositorio.
4. **Visual responsive:** revisar la presentación de los nuevos diálogos en móvil.
5. **RF026:** probar de nuevo con una cuenta de empresa verificada sobre una postulación existente. La ruta y la interfaz se conservaron.

## Archivos modificados

- `portal.js`: datos completos de empresa, historial de ofertas, confirmación y rechazo con diálogo propio.
- `ux-feedback.js`: diálogo accesible de motivo de rechazo.
- `student.js`: flyer de empresa externa desde URL privada firmada.
- `theme-indigo.css`: estilos responsive.
- `supabase/functions/bolsa-api/index.ts`: nuevos endpoints de adjuntos, historial y edición.
- `sql/edicion_oferta_aprobada_cu23.sql`: versión reproducible de la nueva RPC.
- `tests/front-design.mjs`, `tests/smoke.mjs`: regresiones.

**Conclusión:** las incidencias de visualización y las operaciones SQL reportadas tienen correcciones publicadas; no se considera completa la certificación de UI/HTTP administrativa ni el correo sin sus pruebas específicas.
