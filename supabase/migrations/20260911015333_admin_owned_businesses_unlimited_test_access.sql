create or replace function private.is_admin_owned_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.businesses b
    join public.profiles p on p.id = b.owner_id
    where b.id = p_business_id
      and p.role = 'admin'
  );
$function$;

revoke all on function private.is_admin_owned_business(uuid) from public;

create or replace function public.plan_limit(p_business_id uuid, p_key text)
returns integer
language sql
stable
set search_path = 'public','pg_temp'
as $function$
  select case
    when private.is_admin_owned_business(p_business_id) then -1
    when jsonb_typeof(p.features->p_key)='number' then greatest(0,(p.features->>p_key)::integer)
    when p.features->>p_key='true' then -1
    else 0
  end
  from public.plans p
  where p.id=public.get_effective_plan_id(p_business_id);
$function$;

create or replace function public.plan_feature_enabled(p_business_id uuid, p_key text)
returns boolean
language sql
stable
set search_path = 'public','pg_temp'
as $function$
  select case
    when private.is_admin_owned_business(p_business_id) then true
    else coalesce((p.features->>p_key)::boolean,false)
  end
  from public.plans p
  where p.id=public.get_effective_plan_id(p_business_id);
$function$;

create or replace function public.get_business_plan_feature_limit(p_business_id uuid, p_feature text)
returns integer
language plpgsql
stable
security definer
set search_path = 'public','pg_temp'
as $function$
begin
  if not ((select private.is_admin()) or (select private.is_business_owner(p_business_id))) then
    raise exception 'Acesso negado.' using errcode='42501';
  end if;
  return public.plan_limit(p_business_id,p_feature);
end;
$function$;

revoke all on function public.get_business_plan_feature_limit(uuid,text) from public, anon;
grant execute on function public.get_business_plan_feature_limit(uuid,text) to authenticated;

create or replace function public.get_business_plan_usage_cycle(p_business_id uuid)
returns table(
  feature text,
  used_count integer,
  limit_count integer,
  cycle_start timestamptz,
  cycle_end timestamptz,
  plan_code text
)
language plpgsql
stable
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_cycle record;
begin
  if not ((select private.is_admin()) or (select private.is_business_owner(p_business_id))) then
    raise exception 'Acesso negado.' using errcode='42501';
  end if;

  select * into v_cycle from private.get_business_plan_cycle(p_business_id) limit 1;

  return query
  select f.feature,
         coalesce(u.used_count,0),
         public.plan_limit(p_business_id,f.feature),
         v_cycle.cycle_start,
         v_cycle.cycle_end,
         v_cycle.plan_code
  from (values ('photos'::text),('items'::text),('promotions'::text)) f(feature)
  left join public.business_plan_usage_cycles u
    on u.business_id=p_business_id
   and u.feature=f.feature
   and u.cycle_start=v_cycle.cycle_start
  order by case f.feature when 'photos' then 1 when 'items' then 2 else 3 end;
end;
$function$;

revoke all on function public.get_business_plan_usage_cycle(uuid) from anon, public;
grant execute on function public.get_business_plan_usage_cycle(uuid) to authenticated;

create or replace function public.consume_monthly_plan_quota(
  p_business_id uuid,
  p_feature text,
  p_amount integer default 1
)
returns integer
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_limit integer;
  v_period date;
  v_used integer;
  v_new integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Quantidade de uso inválida.' using errcode='22023';
  end if;

  if not ((select private.is_admin()) or (select private.is_business_owner(p_business_id))) then
    raise exception 'Acesso negado.' using errcode='42501';
  end if;

  if p_feature <> 'ai_posts' then
    raise exception 'Quota mensal não configurada para o recurso %.', p_feature using errcode='22023';
  end if;

  v_limit := public.plan_limit(p_business_id, p_feature);
  if v_limit < 0 then
    return 0;
  end if;
  if v_limit = 0 then
    raise exception 'Recurso não disponível no plano atual.' using errcode='check_violation';
  end if;

  v_period := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;

  insert into public.business_plan_usage_monthly(business_id, feature, period_start, used_count)
  values (p_business_id, p_feature, v_period, p_amount)
  on conflict (business_id, feature, period_start)
  do update set
    used_count = public.business_plan_usage_monthly.used_count + excluded.used_count,
    updated_at = now()
  where public.business_plan_usage_monthly.used_count + excluded.used_count <= v_limit
  returning used_count into v_new;

  if v_new is null then
    select used_count into v_used
    from public.business_plan_usage_monthly
    where business_id = p_business_id
      and feature = p_feature
      and period_start = v_period;
    raise exception 'Limite mensal do plano atingido para %. Uso atual: %/% .', p_feature, coalesce(v_used,0), v_limit using errcode='check_violation';
  end if;

  return v_new;
end;
$function$;
