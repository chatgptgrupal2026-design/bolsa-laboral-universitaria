-- Bolsa Laboral Universitaria — Grupo 05
-- Migración aplicada en Supabase el 14/11/2026.
-- Garantiza atomicidad de CU03 y CU16 sin agregar tablas al DER.

CREATE OR REPLACE FUNCTION public.guardar_perfil_academico(
 p_id_usuario bigint, p_id_estudiante bigint,
 p_correo text, p_telefono text, p_fecha_nacimiento date,
 p_semestre smallint, p_id_carrera bigint
)
RETURNS TABLE(id_usuario bigint)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_catalog
AS $$
BEGIN
 UPDATE public.usuario u SET correo=p_correo
 WHERE u.id_usuario=p_id_usuario AND u.tipo_usuario='Estudiante' AND u.habilitado=true;
 IF NOT FOUND THEN RETURN; END IF;
 UPDATE public.estudiante s
 SET telefono=p_telefono,fecha_nacimiento=p_fecha_nacimiento,
     semestre_actual=p_semestre,id_carrera=p_id_carrera
 WHERE s.id_estudiante=p_id_estudiante AND s.id_usuario=p_id_usuario;
 IF NOT FOUND THEN RAISE EXCEPTION 'Perfil del estudiante no encontrado.'; END IF;
 RETURN QUERY SELECT p_id_usuario;
END;
$$;
REVOKE ALL ON FUNCTION public.guardar_perfil_academico(bigint,bigint,text,text,date,smallint,bigint)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_perfil_academico(bigint,bigint,text,text,date,smallint,bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.evaluar_oferta_pendiente(
 p_id_oferta bigint, p_id_revisor bigint, p_decision text, p_motivo text
)
RETURNS TABLE(id_oferta bigint)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_catalog
AS $$
DECLARE v_offer bigint;
BEGIN
 IF p_decision NOT IN ('Aprobar','Rechazar') THEN RAISE EXCEPTION 'Decisión no válida'; END IF;
 IF p_decision='Rechazar' AND nullif(btrim(p_motivo),'') IS NULL
 THEN RAISE EXCEPTION 'Se requiere un motivo de rechazo'; END IF;
 UPDATE public.oferta_laboral o SET
  estado=CASE WHEN p_decision='Aprobar' THEN 'Publicada' ELSE 'Rechazada' END,
  fecha_publicacion=CASE WHEN p_decision='Aprobar' THEN now() ELSE o.fecha_publicacion END,
  fecha_vencimiento=CASE WHEN p_decision='Aprobar' THEN (now() AT TIME ZONE 'America/Asuncion')::date+14 ELSE o.fecha_vencimiento END,
  vigencia_indefinida=false
 WHERE o.id_oferta=p_id_oferta AND o.id_remitente IS NOT NULL AND o.estado='Pendiente de aprobación'
 RETURNING o.id_oferta INTO v_offer;
 IF v_offer IS NULL THEN RETURN; END IF;
 INSERT INTO public.revision_oferta(id_oferta,id_revisor,decision,motivo_rechazo)
 VALUES(v_offer,p_id_revisor,
   CASE WHEN p_decision='Aprobar' THEN 'Aprobada' ELSE 'Rechazada' END,
   CASE WHEN p_decision='Rechazar' THEN btrim(p_motivo) ELSE NULL END);
 RETURN QUERY SELECT v_offer;
END;
$$;
REVOKE ALL ON FUNCTION public.evaluar_oferta_pendiente(bigint,bigint,text,text)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.evaluar_oferta_pendiente(bigint,bigint,text,text) TO service_role;
