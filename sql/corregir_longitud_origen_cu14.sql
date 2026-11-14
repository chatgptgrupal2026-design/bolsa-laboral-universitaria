-- CU14 / Bolsa Laboral Universitaria
-- Arreglo del error de envío de ofertas a revisión:
-- 'Empresa no verificada' tiene 21 caracteres, y el campo
-- public.oferta_laboral.origen admitía únicamente 20.
-- Migración aplicada en Supabase el 14/11/2026.
ALTER TABLE public.oferta_laboral
  ALTER COLUMN origen TYPE varchar(32);
