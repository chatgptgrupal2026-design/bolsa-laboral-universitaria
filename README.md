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

La plataforma utiliza un **Sistema Académico simulado**, no una conexión a alumnos reales. La matrícula `c06559` tiene una cédula asociada, almacenada en el esquema privado de Supabase y nunca escrita en este repositorio público:

| Matrícula de prueba | Cédula ficticia | Carrera |
|---|---|---|
| `c06559` | Guardada solo en Supabase | Análisis de Sistemas |
| `20260001` | `9000001` | Análisis de Sistemas |

Las matrículas alfanuméricas (como `c06559`) se normalizan a minúsculas.
Para **iniciar sesión**, primero hay que registrar el estudiante (CU01), asignarle una contraseña y entrar con matrícula + contraseña (CU02).
Cada matrícula solo se puede registrar una vez.

El simulador académico usa `simulacion_academica.estudiante` en PostgreSQL y una función de consulta interna accesible solo para el backend.

El código fuente de la función Supabase está en `supabase/functions/bolsa-api/index.ts`. Los cambios en esa función requieren un despliegue propio en Supabase; Vercel actualiza solo el frontend.

## Publicación
Vincular este repositorio con el proyecto **bolsa-laboral-universitaria-web-v1** de Vercel; la rama de producción debe ser `main`. Vercel detecta la aplicación como sitio estático, con `index.html` en la raíz y sin comando de build.

> No subir claves privadas ni contraseñas al repositorio. La dirección de la función de Supabase es pública; las credenciales de la base de datos viven únicamente en el backend.

## Alcance pendiente
CU03-CU05 perfiles y CV; CU08-CU09 y CU20 postulaciones; CU10-CU14 y CU21/CU24 empresas; CU15-CU17 y CU22-CU23 revisión; CU18-CU19 contraseñas. Implementar conforme a los documentos de la facultad.

## Publicación automática verificada

Este repositorio está vinculado al proyecto de Vercel mediante **Settings → Git**. Los cambios publicados en la rama `main` deben generar un despliegue automáticamente. Esta anotación se incorporó para verificar el flujo GitHub → Vercel sin modificar la interfaz de la aplicación.
