-- Notification sends follow the same monthly/billing-cycle limit configured for promotions in each plan.
-- The Bistrô Laguna - Teste business is intentionally unlimited for controlled QA.
alter table public.notification_send_limits
  add column if not exists cycle_start timestamptz,
  add column if not exists cycle_end timestamptz,
  add column if not exists limit_count integer;

create or replace function public.consume_promotion_notification_quota(
  p_business_id uuid,
  p_limit integer default 5
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_business record;
  v_cycle record;
  v_limit integer;
  v_state record;
  v_remaining integer;
begin
  select id, name into v_business
  from public.businesses
  where id = p_business_id;

  if not found then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'retry_at', null, 'reason', 'business_not_found');
  end if;

  -- Dedicated QA business: no notification quota.
  if v_business.name = 'Bistrô Laguna - Teste' then
    return jsonb_build_object('allowed', true, 'remaining', 2147483647, 'retry_at', null, 'unlimited', true);
  end if;

  select * into v_cycle
  from private.get_business_plan_cycle(p_business_id)
  limit 1;

  v_limit := public.plan_limit(p_business_id, 'promotions');

  -- Preserve a safe fallback if the plan configuration is unavailable.
  if v_limit is null then
    v_limit := greatest(coalesce(p_limit, 5), 0);
  end if;

  select * into v_state
  from public.notification_send_limits
  where business_id = p_business_id
  for update;

  if not found then
    insert into public.notification_send_limits (
      business_id, window_started_at, send_count, cycle_started_at, cycle_end, limit_count
    )
    values (
      p_business_id,
      now(),
      0,
      v_cycle.cycle_start,
      v_cycle.cycle_end,
      v_limit
    )
    returning * into v_state;
  elsif v_state.cycle_start is distinct from v_cycle.cycle_start
     or v_state.cycle_end is distinct from v_cycle.cycle_end
     or v_state.limit_count is distinct from v_limit then
    update public.notification_send_limits
       set send_count = 0,
           window_started_at = now(),
           cycle_started_at = v_cycle.cycle_start,
           cycle_end = v_cycle.cycle_end,
           limit_count = v_limit,
           updated_at = now()
     where business_id = p_business_id
     returning * into v_state;
  end if;

  if v_limit < 0 then
    return jsonb_build_object('allowed', true, 'remaining', 2147483647, 'retry_at', v_cycle.cycle_end, 'unlimited', true);
  end if;

  if v_state.send_count >= v_limit then
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_at', v_cycle.cycle_end,
      'unlimited', false,
      'limit', v_limit,
      'used', v_state.send_count
    );
  end if;

  update public.notification_send_limits
     set send_count = send_count + 1,
         updated_at = now()
   where business_id = p_business_id
   returning send_count into v_state.send_count;

  v_remaining := greatest(v_limit - v_state.send_count, 0);

  return jsonb_build_object(
    'allowed', true,
    'remaining', v_remaining,
    'retry_at', v_cycle.cycle_end,
    'unlimited', false,
    'limit', v_limit,
    'used', v_state.send_count
  );
end;
$$;

revoke execute on function public.consume_promotion_notification_quota(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_promotion_notification_quota(uuid, integer) to service_role;
