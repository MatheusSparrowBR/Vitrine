-- Premium-only reputation controls and temporary removal of AI quotas from plan catalog.

UPDATE public.plans
SET
  description = CASE code
    WHEN 'free' THEN 'Presença básica e recursos essenciais para começar no VitrineLocal.'
    WHEN 'pro' THEN 'Mais destaque e recursos para crescer com sua empresa.'
    WHEN 'premium' THEN 'Máxima presença, reputação avançada e recursos exclusivos, incluindo resposta às avaliações e estatísticas avançadas.'
    ELSE description
  END,
  features = CASE code
    WHEN 'premium' THEN (features - 'ai_posts' - 'ai_posts_limit') || jsonb_build_object('review_management', true)
    WHEN 'pro' THEN (features - 'ai_posts' - 'ai_posts_limit') || jsonb_build_object('review_management', false)
    WHEN 'free' THEN (features - 'ai_posts' - 'ai_posts_limit') || jsonb_build_object('review_management', false)
    ELSE features - 'ai_posts' - 'ai_posts_limit'
  END,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.add_business_review_response(p_review_id uuid, p_response text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $function$
declare
  uid uuid := (select auth.uid());
  rid uuid;
  clean text := trim(coalesce(p_response,''));
  review_business uuid;
begin
  if uid is null then raise exception 'Não autenticado.'; end if;
  if char_length(clean)=0 then raise exception 'A resposta não pode ficar vazia.'; end if;
  if char_length(clean)>1000 then raise exception 'A resposta deve ter no máximo 1000 caracteres.'; end if;
  select r.business_id into review_business
  from public.business_reviews r
  join public.businesses b on b.id=r.business_id
  where r.id=p_review_id and b.owner_id=uid;
  if review_business is null then raise exception 'Sem permissão para responder esta avaliação.'; end if;
  if not coalesce(public.plan_feature_enabled(review_business,'review_management'),false) then
    raise exception 'A resposta às avaliações está disponível apenas no plano Premium.' using errcode='check_violation';
  end if;
  insert into public.business_review_audit_log(review_id,actor_id,action,note)
  values(p_review_id,uid,'response',clean)
  returning id into rid;
  return rid;
end;
$function$;

REVOKE ALL ON FUNCTION public.add_business_review_response(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.add_business_review_response(uuid,text) TO authenticated;
