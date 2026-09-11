create or replace function public.admin_set_business_plan(p_business_id uuid, p_plan_code public.plan_code, p_ends_at timestamptz default null)
returns public.subscriptions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan public.plans;
  v_business public.businesses;
  v_subscription public.subscriptions;
  v_active_stripe boolean;
begin
  if not (select private.is_admin()) then
    raise exception 'Apenas administradores podem alterar planos.' using errcode='42501';
  end if;

  select * into v_business from public.businesses where id=p_business_id;
  if v_business.id is null then
    raise exception 'Empresa não encontrada.';
  end if;

  select * into v_plan from public.plans where code=p_plan_code and active=true;
  if v_plan.id is null then
    raise exception 'Plano não encontrado ou inativo.';
  end if;

  select exists(
    select 1 from public.subscriptions s
    where s.business_id=p_business_id
      and s.provider='stripe'
      and s.provider_subscription_id is not null
      and s.status in ('active','trialing','past_due','unpaid','paused','incomplete')
  ) into v_active_stripe;

  if v_active_stripe then
    raise exception 'A empresa possui uma assinatura Stripe ativa. Cancele ou encerre a cobrança Stripe antes de conceder um plano manual.' using errcode='23514';
  end if;

  update public.subscriptions
     set status='canceled',
         ends_at=coalesce(ends_at,now()),
         current_period_end=coalesce(current_period_end,now()),
         cancel_at_period_end=false,
         scheduled_plan_id=null,
         scheduled_billing_interval=null,
         scheduled_change_at=null,
         updated_at=now()
   where business_id=p_business_id
     and provider='manual'
     and status in ('active','trialing');

  insert into public.subscriptions(
    user_id,plan_id,business_id,status,started_at,ends_at,
    current_period_start,current_period_end,provider,billing_interval,cancel_at_period_end
  ) values(
    v_business.owner_id,v_plan.id,p_business_id,'active',now(),p_ends_at,
    now(),p_ends_at,'manual','monthly',false
  )
  returning * into v_subscription;

  return v_subscription;
end;
$$;
