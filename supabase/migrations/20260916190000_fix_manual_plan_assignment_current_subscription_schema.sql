-- Corrige a concessão manual de planos para o schema atual de subscriptions.
-- A coluna scheduled_billing_interval não existe mais após a evolução do módulo de cobrança.
-- Mantém p_plan_code como text para compatibilidade com clientes RPC e converte explicitamente para public.plan_code.

create or replace function public.admin_set_business_plan(
  p_business_id uuid,
  p_plan_code text,
  p_ends_at timestamptz default null
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan public.plans;
  v_business public.businesses;
  v_subscription public.subscriptions;
  v_plan_code public.plan_code;
begin
  if not private.is_admin() then
    raise exception 'Apenas administradores podem alterar planos.' using errcode='42501';
  end if;

  begin
    v_plan_code := p_plan_code::public.plan_code;
  exception when invalid_text_representation then
    raise exception 'Plano inválido: %.', p_plan_code using errcode='22P02';
  end;

  select * into v_business
  from public.businesses
  where id = p_business_id;

  if v_business.id is null then
    raise exception 'Empresa não encontrada.';
  end if;

  select * into v_plan
  from public.plans
  where code = v_plan_code
    and active = true;

  if v_plan.id is null then
    raise exception 'Plano não encontrado ou inativo.';
  end if;

  update public.subscriptions
     set status='canceled',
         ends_at=coalesce(ends_at,now()),
         current_period_end=coalesce(current_period_end,now()),
         cancel_at_period_end=false,
         scheduled_plan_id=null,
         scheduled_change_at=null,
         updated_at=now()
   where business_id=p_business_id
     and provider='manual'
     and status in ('active','trialing');

  insert into public.subscriptions(
    user_id,
    plan_id,
    business_id,
    status,
    started_at,
    ends_at,
    current_period_start,
    current_period_end,
    provider,
    billing_interval,
    cancel_at_period_end
  ) values(
    v_business.owner_id,
    v_plan.id,
    p_business_id,
    'active',
    now(),
    p_ends_at,
    now(),
    p_ends_at,
    'manual',
    'monthly',
    false
  )
  returning * into v_subscription;

  return v_subscription;
end;
$$;
