create or replace function public.get_effective_plan_id(p_business_id uuid)
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((select s.plan_id from public.subscriptions s where s.business_id=p_business_id and s.status='active' and (s.ends_at is null or s.ends_at >= now()) order by s.started_at desc, s.created_at desc limit 1),(select p.id from public.plans p where p.code='free' limit 1));
$$;
create or replace function public.plan_feature_enabled(p_business_id uuid,p_key text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((p.features->>p_key)::boolean,false) from public.plans p where p.id=public.get_effective_plan_id(p_business_id);
$$;
create or replace function public.plan_limit(p_business_id uuid,p_key text)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select case when jsonb_typeof(p.features->p_key)='number' then greatest(0,(p.features->>p_key)::integer) when p.features->>p_key='true' then -1 else 0 end from public.plans p where p.id=public.get_effective_plan_id(p_business_id);
$$;
