ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_updated_by uuid REFERENCES public.profiles(id);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('active','suspended','banned'));

CREATE INDEX IF NOT EXISTS profiles_account_status_idx
  ON public.profiles(account_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_search text DEFAULT '',
  p_status text DEFAULT 'all'
)
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  account_status text,
  status_reason text,
  status_updated_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  actor_role public.user_role;
  term text := lower(trim(coalesce(p_search,'')));
BEGIN
  SELECT p.role INTO actor_role FROM public.profiles p WHERE p.id = auth.uid();
  IF actor_role <> 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;

  IF p_status NOT IN ('all','active','suspended','banned') THEN
    RAISE EXCEPTION 'Status inválido.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    u.email::text,
    p.full_name,
    p.role,
    p.account_status,
    p.status_reason,
    p.status_updated_at,
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role <> 'admin'::public.user_role
    AND (p_status='all' OR p.account_status=p_status)
    AND (
      term = ''
      OR lower(coalesce(u.email,'')) LIKE '%'||term||'%'
      OR lower(coalesce(p.full_name,'')) LIKE '%'||term||'%'
    )
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  p_user_id uuid,
  p_status text,
  p_reason text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_role public.user_role;
  target_role public.user_role;
  clean_reason text := nullif(trim(coalesce(p_reason,'')), '');
BEGIN
  SELECT role INTO actor_role FROM public.profiles WHERE id=actor;
  IF actor_role <> 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;
  IF p_status NOT IN ('active','suspended','banned') THEN
    RAISE EXCEPTION 'Status inválido.';
  END IF;
  IF p_user_id = actor THEN
    RAISE EXCEPTION 'O administrador não pode alterar o próprio status.';
  END IF;

  SELECT role INTO target_role FROM public.profiles WHERE id=p_user_id;
  IF target_role IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;
  IF target_role = 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Não é permitido suspender ou banir outro administrador por esta tela.';
  END IF;

  UPDATE public.profiles
  SET account_status=p_status,
      status_reason=clean_reason,
      status_updated_at=now(),
      status_updated_by=actor,
      updated_at=now()
  WHERE id=p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_set_user_status(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid,text,text) TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_business_review(uuid);
CREATE FUNCTION public.get_my_business_review(p_business_id uuid)
RETURNS TABLE(
  id uuid,
  business_id uuid,
  reviewer_name text,
  rating smallint,
  comment text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  edited_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.id,r.business_id,r.reviewer_name,r.rating,r.comment,r.status,r.created_at,r.updated_at,r.edited_at
  FROM public.business_reviews r
  WHERE r.business_id=p_business_id AND r.user_id=auth.uid()
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_business_review(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.submit_business_review(uuid,smallint,text);
CREATE FUNCTION public.submit_business_review(p_business_id uuid, p_rating smallint, p_comment text DEFAULT '')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  rid uuid;
  owner_id uuid;
  reviewer text;
  clean text := trim(coalesce(p_comment,''));
  account_state text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Faça login para avaliar uma empresa.'; END IF;
  SELECT account_status INTO account_state FROM public.profiles WHERE id=uid;
  IF coalesce(account_state,'active') <> 'active' THEN
    RAISE EXCEPTION 'Sua conta não pode publicar avaliações neste momento.';
  END IF;
  IF p_rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'A nota deve estar entre 1 e 5.'; END IF;
  IF char_length(clean)>1000 THEN RAISE EXCEPTION 'O comentário deve ter no máximo 1000 caracteres.'; END IF;
  SELECT b.owner_id INTO owner_id FROM public.businesses b WHERE b.id=p_business_id AND b.status='active';
  IF owner_id IS NULL THEN RAISE EXCEPTION 'Empresa não encontrada ou indisponível.'; END IF;
  IF owner_id=uid THEN RAISE EXCEPTION 'Você não pode avaliar sua própria empresa.'; END IF;
  SELECT nullif(trim(full_name),'') INTO reviewer FROM public.profiles WHERE id=uid;
  reviewer:=coalesce(reviewer,'Usuário do VitrineLocal');

  INSERT INTO public.business_reviews(business_id,user_id,reviewer_name,rating,comment,status,updated_at)
  VALUES(p_business_id,uid,reviewer,p_rating,clean,'published',now())
  ON CONFLICT (business_id,user_id) DO UPDATE
  SET reviewer_name=excluded.reviewer_name,
      rating=excluded.rating,
      comment=excluded.comment,
      status='published',
      hidden_at=null,
      hidden_by=null,
      hidden_reason=null,
      updated_at=now();

  SELECT id INTO rid FROM public.business_reviews WHERE business_id=p_business_id AND user_id=uid;
  RETURN rid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_business_review(uuid,smallint,text) TO authenticated;

DO $$
BEGIN
  DROP POLICY IF EXISTS business_reviews_user_insert ON public.business_reviews;
  CREATE POLICY business_reviews_user_insert ON public.business_reviews
    FOR INSERT TO authenticated
    WITH CHECK (
      auth.uid()=user_id
      AND EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.account_status='active'
      )
      AND EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id=business_reviews.business_id
          AND b.status='active'
          AND b.owner_id<>auth.uid()
      )
    );
END $$;
