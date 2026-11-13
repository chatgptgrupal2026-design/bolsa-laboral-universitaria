-- CU17: vencimiento automático de ofertas.
-- Aplicado en Supabase. Ejecución diaria desde PostgreSQL, 06:05 UTC,
-- que corresponde a la madrugada en Paraguay.
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.vencer_ofertas_y_cerrar_postulaciones()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  ids bigint[] := '{}'::bigint[];
BEGIN
  WITH vencidas AS (
    UPDATE public.oferta_laboral
       SET estado='Vencida'
     WHERE estado='Publicada'
       AND vigencia_indefinida = false
       AND fecha_vencimiento IS NOT NULL
       AND fecha_vencimiento < (now() AT TIME ZONE 'America/Asuncion')::date
    RETURNING id_oferta
  )
  SELECT COALESCE(array_agg(id_oferta),'{}'::bigint[]) INTO ids FROM vencidas;

  UPDATE public.postulacion
     SET estado='Cerrada'
   WHERE estado='Activa' AND id_oferta=ANY(ids);

  RETURN COALESCE(array_length(ids,1),0);
END;
$$;

REVOKE ALL ON FUNCTION public.vencer_ofertas_y_cerrar_postulaciones()
  FROM PUBLIC, anon, authenticated;

-- Ejecución única en la configuración inicial:
-- SELECT cron.schedule('bolsa-cierre-diario','5 6 * * *',
--     'SELECT public.vencer_ofertas_y_cerrar_postulaciones();');
