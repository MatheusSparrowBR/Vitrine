CREATE OR REPLACE FUNCTION public.delete_business_admin(p_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id
  ) THEN
    RAISE EXCEPTION 'Empresa não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.analytics_events
  WHERE business_id = p_business_id;

  DELETE FROM public.businesses
  WHERE id = p_business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_business_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_business_admin(uuid) TO authenticated;
