-- Return public review averages for a page of businesses in one query.
-- The public review list remains available through its existing RPC; this
-- summary function avoids one RPC request per business card.

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
  left join lateral (
    select a.action
    from public.business_review_audit_log a
    where a.review_id = r.id
      and a.action in ('published','hidden')
    order by a.created_at desc
    limit 1
  ) mod on true
  where cardinality(coalesce(p_business_ids, '{}'::uuid[])) between 1 and 100
    and r.business_id = any(p_business_ids)
    and b.status = 'active'::business_status
    and coalesce(mod.action, 'published') = 'published'
    and (p.account_status is null or p.account_status = 'active')
  group by r.business_id;
$function$;

revoke all on function public.get_public_business_review_summaries(uuid[]) from public, anon, authenticated;
grant execute on function public.get_public_business_review_summaries(uuid[]) to anon, authenticated;

-- Community submissions are no longer part of the active product surface.
-- Keep the tables for historical data, but close their Data API write/read
-- access so an unused endpoint cannot become a spam sink.
revoke all on table public.community_submissions from anon, authenticated;

