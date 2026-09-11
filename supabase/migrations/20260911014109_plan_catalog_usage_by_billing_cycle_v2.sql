create schema if not exists private;

create table if not exists public.business_plan_usage_cycles (
  business_id uuid not null references public.businesses(id) on delete cascade,
  feature text not null check (feature in ('photos','items','promotions')),
  cycle_start timestamptz not null,
  cycle_end timestamptz not null,
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, feature, cycle_start),
  check (cycle_end > cycle_start)
);

create index if not exists idx_business_plan_usage_cycles_business_cycle
  on public.business_plan_usage_cycles (business_id, cycle_start desc);

alter table public.business_plan_usage_cycles enable row level security;
revoke all on public.business_plan_usage_cycles from anon, authenticated;

create or replace function private.get_business_plan_cycle(p_business_id uuid)
returns table(plan_id uuid, plan_code text, cycle_start timestamptz, cycle_end timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_sub record;
  v_plan record;
  v_start timestamptz;
  v_end timestamptz;
  v_interval interval;
  v_local_month timestamp;
begin
  select s.*, p.id as effective_plan_id, p.code::text as effective_plan_code
    into v_sub
  from public.subscriptions s
  join public.plans p on p.id=s.plan_id
  where s.business_id=p_business_id
    and s.status in ('active','trialing')
    and (s.ends_at is null or s.ends_at >= now())
  order by s.started_at desc nulls last, s.created_at desc
  limit 1;

  if found then
    v_start := coalesce(v_sub.current_period_start, v_sub.started_at, now());
    if v_sub.billing_interval = 'yearly' then
      v_interval := interval '1 year';
    else
      v_interval := interval '1 month';
    end if;
    v_end := coalesce(v_sub.current_period_end, v_start + v_interval);

    while v_end <= now() loop
      v_start := v_end;
      v_end := v_end + v_interval;
    end loop;

    return query select v_sub.effective_plan_id, v_sub.effective_plan_code::text, v_start, v_end;
    return;
  end if;

  select p.id,p.code::text into v_plan
  from public.plans p
  where p.code='free' and p.active=true
  limit 1;

  v_local_month := date_trunc('month', now() at time zone 'America/Sao_Paulo');
  v_start := v_local_month at time zone 'America/Sao_Paulo';
  v_end := (v_local_month + interval '1 month') at time zone 'America/Sao_Paulo';

  return query select v_plan.id, v_plan.code::text, v_start, v_end;
end;
$function$;

revoke all on function private.get_business_plan_cycle(uuid) from public;

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
set search_path = public, pg_temp
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
         greatest(0, public.plan_limit(p_business_id,f.feature)),
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

create or replace function public.consume_plan_cycle_usage(
  p_business_id uuid,
  p_feature text,
  p_amount integer default 1
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_cycle record;
  v_limit integer;
  v_new integer;
  v_used integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Quantidade de uso inválida.' using errcode='22023';
  end if;
  if p_feature not in ('photos','items','promotions') then
    raise exception 'Recurso inválido.' using errcode='22023';
  end if;
  if not ((select private.is_admin()) or (select private.is_business_owner(p_business_id))) then
    raise exception 'Acesso negado.' using errcode='42501';
  end if;

  select * into v_cycle from private.get_business_plan_cycle(p_business_id) limit 1;
  v_limit := public.plan_limit(p_business_id,p_feature);

  if v_limit = 0 then
    raise exception 'Recurso não disponível no plano atual.' using errcode='check_violation';
  end if;

  insert into public.business_plan_usage_cycles(business_id,feature,cycle_start,cycle_end,used_count)
  values(p_business_id,p_feature,v_cycle.cycle_start,v_cycle.cycle_end,p_amount)
  on conflict (business_id,feature,cycle_start)
  do update set
    cycle_end=excluded.cycle_end,
    used_count=public.business_plan_usage_cycles.used_count+excluded.used_count,
    updated_at=now()
  where v_limit < 0
     or public.business_plan_usage_cycles.used_count+excluded.used_count <= v_limit
  returning used_count into v_new;

  if v_new is null then
    select used_count into v_used
    from public.business_plan_usage_cycles
    where business_id=p_business_id
      and feature=p_feature
      and cycle_start=v_cycle.cycle_start;
    raise exception 'Limite do ciclo atingido para %. Uso atual: %/%.' , p_feature, coalesce(v_used,0), v_limit using errcode='check_violation';
  end if;

  return v_new;
end;
$function$;

revoke all on function public.consume_plan_cycle_usage(uuid,text,integer) from anon, authenticated, public;

create or replace function public.enforce_business_collection_limits()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_key text;
begin
  if (select private.is_admin()) then
    return new;
  end if;

  if tg_table_name='business_photos' then
    v_key:='photos';
  elsif tg_table_name='business_items' then
    v_key:='items';
  elsif tg_table_name='promotions' then
    v_key:='promotions';
  else
    return new;
  end if;

  if tg_op='UPDATE' and new.business_id=old.business_id then
    return new;
  end if;

  perform public.consume_plan_cycle_usage(new.business_id,v_key,1);
  return new;
end;
$function$;

revoke all on function public.enforce_business_collection_limits() from anon, authenticated, public;

-- Bootstrap only records created during the current cycle. Existing catalog
-- content is not charged again after a renewal; new cycles start at zero.
delete from public.business_plan_usage_cycles;

insert into public.business_plan_usage_cycles(business_id,feature,cycle_start,cycle_end,used_count)
select b.id,
       f.feature,
       c.cycle_start,
       c.cycle_end,
       case f.feature
         when 'photos' then (select count(*) from public.business_photos ph where ph.business_id=b.id and ph.created_at>=c.cycle_start and ph.created_at<c.cycle_end)
         when 'items' then (select count(*) from public.business_items i where i.business_id=b.id and i.created_at>=c.cycle_start and i.created_at<c.cycle_end)
         when 'promotions' then (select count(*) from public.promotions p where p.business_id=b.id and p.created_at>=c.cycle_start and p.created_at<c.cycle_end)
       end::integer
from public.businesses b
cross join lateral (select * from private.get_business_plan_cycle(b.id) limit 1) c
cross join (values ('photos'::text),('items'::text),('promotions'::text)) f(feature)
where case f.feature
  when 'photos' then exists(select 1 from public.business_photos ph where ph.business_id=b.id and ph.created_at>=c.cycle_start and ph.created_at<c.cycle_end)
  when 'items' then exists(select 1 from public.business_items i where i.business_id=b.id and i.created_at>=c.cycle_start and i.created_at<c.cycle_end)
  when 'promotions' then exists(select 1 from public.promotions p where p.business_id=b.id and p.created_at>=c.cycle_start and p.created_at<c.cycle_end)
end;
