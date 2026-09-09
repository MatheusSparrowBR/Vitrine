revoke all on function public.enforce_business_photo_limit() from public,anon,authenticated;
revoke all on function public.enforce_business_item_limit() from public,anon,authenticated;
revoke all on function public.enforce_business_promotion_limit() from public,anon,authenticated;
revoke all on function public.get_effective_plan_id(uuid) from public,anon,authenticated;
revoke all on function public.plan_limit(uuid,text) from public,anon,authenticated;
grant execute on function public.get_effective_plan_id(uuid),public.plan_limit(uuid,text) to authenticated;
create or replace function public.plan_feature_enabled(p_business_id uuid,p_key text)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((p.features->>p_key)::boolean,false) from public.plans p where p.id=public.get_effective_plan_id(p_business_id);
$$;
revoke all on function public.plan_feature_enabled(uuid,text) from public,anon,authenticated;
grant execute on function public.plan_feature_enabled(uuid,text) to authenticated;
