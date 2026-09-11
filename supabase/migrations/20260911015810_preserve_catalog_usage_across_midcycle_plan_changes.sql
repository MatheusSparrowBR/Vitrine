create or replace function private.get_business_plan_cycle(p_business_id uuid)
returns table(plan_id uuid, plan_code text, cycle_start timestamptz, cycle_end timestamptz)
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_sub record;
  v_plan record;
  v_existing_cycle record;
  v_start timestamptz;
  v_end timestamptz;
  v_interval interval;
  v_local_month timestamp;
begin
  select u.cycle_start,u.cycle_end
    into v_existing_cycle
  from public.business_plan_usage_cycles u
  where u.business_id=p_business_id
    and u.cycle_start<=now()
    and u.cycle_end>now()
  order by u.cycle_start desc, u.cycle_end desc
  limit 1;

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
    if v_existing_cycle.cycle_start is not null then
      return query
        select v_sub.effective_plan_id,
               v_sub.effective_plan_code::text,
               v_existing_cycle.cycle_start,
               v_existing_cycle.cycle_end;
      return;
    end if;

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

  if v_existing_cycle.cycle_start is not null then
    return query
      select v_plan.id,
             v_plan.code::text,
             v_existing_cycle.cycle_start,
             v_existing_cycle.cycle_end;
    return;
  end if;

  v_local_month := date_trunc('month', now() at time zone 'America/Sao_Paulo');
  v_start := v_local_month at time zone 'America/Sao_Paulo';
  v_end := (v_local_month + interval '1 month') at time zone 'America/Sao_Paulo';

  return query select v_plan.id, v_plan.code::text, v_start, v_end;
end;
$$;

revoke all on function private.get_business_plan_cycle(uuid) from public;
grant execute on function private.get_business_plan_cycle(uuid) to authenticated;
