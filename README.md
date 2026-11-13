# Bolsa Laboral Universitaria

Proyecto académico de **Ingeniería del Software 2 — Facultad de Ciencias y Tecnología**.

## Estado actual
Primera versión web: Inicio, consulta de ofertas laborales y pasantías, registro académico simulado (CU01), inicio de sesión (CU02), y área personal básica. Los demás casos de uso del TPF04/TPF05 están pendientes.

## Arquitectura
- **Frontend:** HTML, CSS y JavaScript, sitio estático para Vercel (sin build).
- **Backend:** Supabase Edge Function `bolsa-api`.
- **Base de datos:** PostgreSQL alojado en Supabase, con 18 tablas del DER.
- **API:** `https://fxbhnyvlekulmuvvmrlr.supabase.co/functions/v1/bolsa-api`.

## Desarrollo local
Abrir una terminal en la carpeta del repositorio y ejecutar:

```bash
python -m http.server 8080
```

Abrir `http://localhost:8080`.

## Datos simulados de registro
- Matrícula: `20260001`
- Cédula: `9000001`
- Carrera: Análisis de Sistemas

Son datos ficticios. La matrícula se puede registrar una sola vez.

## Publicación
Vincular este repositorio con el proyecto **bolsa-laboral-universitaria-web-v1** de Vercel; la rama de producción debe ser `main`. Vercel detecta la aplicación como sitio estático, con `index.html` en la raíz y sin comando de build.

> No subir claves privadas ni contraseñas al repositorio. La dirección de la función de Supabase es pública; las credenciales de la base de datos viven únicamente en el backend.

## Alcance pendiente
CU03-CU05 perfiles y CV; CU08-CU09 y CU20 postulaciones; CU10-CU14 y CU21/CU24 empresas; CU15-CU17 y CU22-CU23 revisión; CU18-CU19 contraseñas. Implementar conforme a los documentos de la facultad.

## Publicación automática verificada

Este repositorio está vinculado al proyecto de Vercel mediante **Settings → Git**. Los cambios publicados en la rama `main` deben generar un despliegue automáticamente. Esta anotación se incorporó para verificar el flujo GitHub → Vercel sin modificar la interfaz de la aplicación.
