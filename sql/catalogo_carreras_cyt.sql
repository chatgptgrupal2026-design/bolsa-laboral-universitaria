-- Catálogo de carreras de CyT / Universidad Católica, Campus Asunción.
-- Referencia institucional: https://cyt.uc.edu.py/2022/06/07/graduacion-de-la-promocion-2021-de-la-facultad-de-ciencias-y-tecnologia-en-asuncion/
-- Aplicado el 21/11/2026. No se modifica la estructura de las 18 tablas.
INSERT INTO public.carrera(nombre)
SELECT v.nombre FROM (VALUES
 ('Arquitectura'),('Diseño Gráfico'),('Diseño Industrial'),
 ('Ingeniería Ambiental'),('Ingeniería Civil'),('Ingeniería Industrial'),
 ('Ingeniería Electrónica'),('Ingeniería Informática')
) AS v(nombre)
WHERE NOT EXISTS (
 SELECT 1 FROM public.carrera c WHERE lower(btrim(c.nombre))=lower(v.nombre)
);
-- Ya existía "Análisis de Sistemas", que se conserva junto con sus asociaciones.
