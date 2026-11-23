-- RF033 / CU23: edición transaccional de oferta externa aprobada.
-- No agrega tablas ni modifica la fecha de vencimiento del DER.
-- =====================================================
-- CU23 - EDITAR OFERTA EXTERNA APROBADA
-- Actualiza título, descripción, requisitos, carreras y medio.
-- Conserva la fecha de vencimiento y opera transaccionalmente.
-- =====================================================
CREATE OR REPLACE FUNCTION public.actualizar_oferta_externa_aprobada(
  p_id_oferta bigint,p_titulo text,p_descripcion text,p_requisitos text,
  p_carreras bigint[],p_medio_tipo text,p_medio_valor text
) RETURNS TABLE(id_oferta bigint)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_catalog
AS $$
DECLARE v_id bigint;
BEGIN
 -- Bloquea la fila aprobada antes de editarla para evitar conflictos.
 SELECT o.id_oferta INTO v_id FROM public.oferta_laboral o
 WHERE o.id_oferta=p_id_oferta AND o.id_remitente IS NOT NULL AND o.estado='Publicada'
 FOR UPDATE;
 IF v_id IS NULL THEN RETURN; END IF;
 UPDATE public.oferta_laboral o
 SET titulo=p_titulo,descripcion=p_descripcion,requisitos=p_requisitos WHERE o.id_oferta=v_id;
 -- Sustituye las asociaciones de carreras por las elegidas actualmente.
 DELETE FROM public.oferta_carrera oc WHERE oc.id_oferta=v_id;
 INSERT INTO public.oferta_carrera(id_oferta,id_carrera)
 SELECT v_id,ids.id FROM (SELECT DISTINCT unnest(p_carreras) AS id) ids;
 -- Reemplaza el medio de contacto o enlace de postulación.
 DELETE FROM public.medio_postulacion m WHERE m.id_oferta=v_id;
 INSERT INTO public.medio_postulacion(id_oferta,tipo,valor)
 VALUES(v_id,p_medio_tipo,p_medio_valor);
 RETURN QUERY SELECT v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.actualizar_oferta_externa_aprobada(bigint,text,text,text,bigint[],text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_oferta_externa_aprobada(bigint,text,text,text,bigint[],text,text) TO service_role;
