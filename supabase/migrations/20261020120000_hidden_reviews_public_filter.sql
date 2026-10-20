begin;

-- Avaliação ocultada pelo admin continuava aparecendo na página da empresa e entrava na média.
-- O admin grava business_reviews.status = 'hidden', mas as funções públicas decidiam pelo log de
-- auditoria (que o ocultar nunca grava). A fonte de verdade passa a ser o próprio status: só
-- avaliações marcadas como ocultas saem; registros sem status continuam visíveis, como antes.

drop function if exists public.get_public_business_reviews(uuid, integer);

create function public.get_public_business_reviews(p_business_id uuid, p_limit integer default 50)
returns table(
  id uuid,
  business_id uuid,
  reviewer_name text,
  rating smallint,
  comment text,
  owner_response text,
  owner_response_at timestamptz,
  created_at timestamptz,
  is_mine boolean,
  edited_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select r.id, r.business_id, r.reviewer_name, r.rating, r.comment, resp.note, resp.created_at, r.created_at, (r.user_id = auth.uid()), r.edited_at
  from public.business_reviews r
  join public.businesses b on b.id = r.business_id
  left join lateral (
    select a.note, a.created_at
    from public.business_review_audit_log a
    where a.review_id = r.id and a.action = 'response'
    order by a.created_at desc
    limit 1
  ) resp on true
  where r.business_id = p_business_id
    and b.status = 'active'
    and r.status is distinct from 'hidden'
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

grant execute on function public.get_public_business_reviews(uuid, integer) to anon, authenticated;

create or replace function public.get_public_business_review_summaries(
  p_business_ids uuid[]
)
returns table(
  business_id uuid,
  avg_rating numeric,
  review_count bigint
)
language sql
security definer
set search_path = public, pg_temp
as $function$
  select
    r.business_id,
    round(avg(r.rating)::numeric, 1)::numeric,
    count(*)::bigint
  from public.business_reviews r
  join public.businesses b on b.id = r.business_id
  left join public.profiles p on p.id = r.user_id
  where cardinality(coalesce(p_business_ids, '{}'::uuid[])) between 1 and 100
    and r.business_id = any(p_business_ids)
    and b.status = 'active'::business_status
    and r.status is distinct from 'hidden'
    and (p.account_status is null or p.account_status = 'active')
  group by r.business_id;
$function$;

revoke all on function public.get_public_business_review_summaries(uuid[]) from public, anon, authenticated;
grant execute on function public.get_public_business_review_summaries(uuid[]) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
