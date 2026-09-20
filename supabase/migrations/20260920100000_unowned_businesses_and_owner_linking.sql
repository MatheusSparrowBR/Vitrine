-- Allow administrators to create a free business before a user is linked.
-- Paid plans remain unavailable until owner_id is populated.

alter table public.businesses
  alter column owner_id drop not null;

create or replace function public.admin_list_business_owners()
returns table(
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  account_status text
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  actor_role public.user_role;
begin
  select p.role into actor_role
  from public.profiles p
  where p.id = auth.uid();

  if actor_role is distinct from 'admin'::public.user_role then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  return query
  select p.id,u.email::text,p.full_name,p.role,p.account_status
  from public.profiles p
  join auth.users u on u.id=p.id
  where p.role in ('business_owner'::public.user_role,'admin'::public.user_role)
    and p.account_status='active'
  order by lower(coalesce(p.full_name,u.email)),u.email;
end;
$function$;

revoke all on function public.admin_list_business_owners() from public, anon;
grant execute on function public.admin_list_business_owners() to authenticated;

create or replace function public.admin_set_business_plan(
  p_business_id uuid,
  p_plan_code text,
  p_ends_at timestamptz default null
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
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

  select * into v_business from public.businesses where id=p_business_id;
  if v_business.id is null then raise exception 'Empresa não encontrada.'; end if;
  if v_business.owner_id is null then
    raise exception 'Vincule um proprietário antes de atribuir um plano pago.' using errcode='23514';
  end if;

  select * into v_plan from public.plans where code=v_plan_code and active=true;
  if v_plan.id is null then raise exception 'Plano não encontrado ou inativo.'; end if;

  update public.subscriptions
     set status='canceled',ends_at=coalesce(ends_at,now()),current_period_end=coalesce(current_period_end,now()),cancel_at_period_end=false,scheduled_plan_id=null,scheduled_change_at=null,updated_at=now()
   where business_id=p_business_id and provider='manual' and status in ('active','trialing');

  insert into public.subscriptions(user_id,plan_id,business_id,status,started_at,ends_at,current_period_start,current_period_end,provider,billing_interval,cancel_at_period_end)
  values(v_business.owner_id,v_plan.id,p_business_id,'active',now(),p_ends_at,now(),p_ends_at,'manual','monthly',false)
  returning * into v_subscription;
  return v_subscription;
end;
$function$;

revoke all on function public.admin_set_business_plan(uuid,text,timestamptz) from public,anon;
grant execute on function public.admin_set_business_plan(uuid,text,timestamptz) to authenticated;

