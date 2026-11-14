# Bolsa Laboral Universitaria

Proyecto académico de **Ingeniería del Software 2 — Facultad de Ciencias y Tecnología**.

## Estado actual
Aplicación web con inicio, consulta y filtrado de ofertas, registro e inicio de sesión y paneles por rol (estudiante, empresa, revisores y Secretaría Académica). Los 24 casos de uso están documentados en [REQUERIMIENTOS.md](./REQUERIMIENTOS.md), con indicación explícita de cuáles requieren pruebas o configuración adicional.

## Arquitectura
- **Frontend:** HTML, CSS y JavaScript, sitio estático para Vercel (sin build). Diseño índigo tecnológico con navegación responsive.
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

## Identidad visual y responsive

Tema elegido: **Opción 1 — Índigo tecnológico**, con índigo profundo `#27235B`, violeta `#6D28D9`, lavanda `#A78BFA` y fondos `#F5F5FF`.

- `styles.css`: estilos funcionales originales.
- `theme-indigo.css`: nueva capa visual global, cargada después de `styles.css`.
- `app.js`: navegación superior adaptable y rutas de la aplicación.
- `workspace.js`: menú lateral compartido por estudiante, empresa y Secretaría.
- `student.js`, `portal.js`: vistas y formularios según el rol.

El tema tiene reglas adaptativas para tamaños de 1180, 920, 800, 700, 520 y 360 píxeles; respeta las preferencias de movimiento reducido y usa menús desplegables accesibles. No se cambió el esquema de datos.

### Verificaciones

Los controles básicos de presentación están en `tests/front-design.mjs`. Se ejecutan desde `.github/workflows/pruebas.yml` junto a la validación de sintaxis JavaScript y las pruebas de consulta al backend.

**Pendientes:** pruebas manuales en navegador real, especialmente a 320–390 px de ancho y con sesión iniciada en cada rol. Consultar el estado de cada caso de uso en `REQUERIMIENTOS.md`.

## Publicación automática verificada

Este repositorio está vinculado al proyecto de Vercel mediante **Settings → Git**. Los cambios publicados en la rama `main` deben generar un despliegue automáticamente. Esta anotación se incorporó para verificar el flujo GitHub → Vercel sin modificar la interfaz de la aplicación.
