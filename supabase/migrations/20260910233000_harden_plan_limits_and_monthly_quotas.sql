-- Hardening de limites de plano, histórico de assinaturas e quota mensal.

create table if not exists public.business_plan_usage_monthly (
  business_id uuid not null references public.businesses(id) on delete cascade,
  feature text not null,
  period_start date not null,
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, feature, period_start)
);

alter table public.business_plan_usage_monthly enable row level security;
drop policy if exists "owners or admins read monthly plan usage" on public.business_plan_usage_monthly;
create policy "owners or admins read monthly plan usage"
on public.business_plan_usage_monthly
for select to authenticated
using (exists (select 1 from public.businesses b where b.id = business_plan_usage_monthly.business_id and (b.owner_id = (select auth.uid()) or (select private.is_admin()))));

create index if not exists business_plan_usage_monthly_business_feature_idx
  on public.business_plan_usage_monthly(business_id, feature, period_start desc);

create or replace function public.get_monthly_plan_usage(p_business_id uuid, p_feature text)
returns integer
language sql stable security definer
set search_path = public
as $$
  select coalesce((select u.used_count from public.business_plan_usage_monthly u
    where u.business_id=p_business_id and u.feature=p_feature
      and u.period_start=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date),0);
$$;
revoke all on function public.get_monthly_plan_usage(uuid,text) from public,anon;
grant execute on function public.get_monthly_plan_usage(uuid,text) to authenticated;

create or replace function public.consume_monthly_plan_quota(p_business_id uuid,p_feature text,p_amount integer default 1)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_limit integer; v_period date; v_used integer; v_new integer;
begin
  if p_amount is null or p_amount<=0 then raise exception 'Quantidade de uso inválida.' using errcode='22023'; end if;
  if not ((select private.is_admin()) or (select private.is_business_owner(p_business_id))) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  if p_feature <> 'ai_posts' then raise exception 'Quota mensal não configurada para o recurso %.',p_feature using errcode='22023'; end if;
  v_limit:=public.plan_limit(p_business_id,p_feature);
  if v_limit<0 then return 0; end if;
  if v_limit=0 then raise exception 'Recurso não disponível no plano atual.' using errcode='check_violation'; end if;
  v_period:=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;
  insert into public.business_plan_usage_monthly(business_id,feature,period_start,used_count)
  values(p_business_id,p_feature,v_period,p_amount)
  on conflict (business_id,feature,period_start) do update set
    used_count=public.business_plan_usage_monthly.used_count+excluded.used_count,
    updated_at=now()
  where public.business_plan_usage_monthly.used_count+excluded.used_count<=v_limit
  returning used_count into v_new;
  if v_new is null then
    select used_count into v_used from public.business_plan_usage_monthly
    where business_id=p_business_id and feature=p_feature and period_start=v_period;
    raise exception 'Limite mensal do plano atingido para %. Uso atual: %/% .',p_feature,coalesce(v_used,0),v_limit using errcode='check_violation';
  end if;
  return v_new;
end;
$$;
revoke all on function public.consume_monthly_plan_quota(uuid,text,integer) from public,anon;
grant execute on function public.consume_monthly_plan_quota(uuid,text,integer) to authenticated;

create or replace function public.enforce_business_collection_limits()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_limit integer; v_used integer; v_key text; v_active boolean;
begin
  if (select private.is_admin()) then return new; end if;
  if tg_table_name='business_photos' then
    if tg_op='UPDATE' and new.business_id=old.business_id then return new; end if;
    v_key:='photos';
    select count(*) into v_used from public.business_photos where business_id=new.business_id;
  elsif tg_table_name='business_items' then
    v_active:=new.active is true; if not v_active then return new; end if;
    if tg_op='UPDATE' and old.active is true and new.business_id=old.business_id then return new; end if;
    v_key:='items';
    select count(*) into v_used from public.business_items where business_id=new.business_id and active is true;
  elsif tg_table_name='promotions' then
    v_active:=new.status in ('pending_review','published','draft'); if not v_active then return new; end if;
    if tg_op='UPDATE' and old.status in ('pending_review','published','draft') and new.business_id=old.business_id then return new; end if;
    v_key:='promotions';
    select count(*) into v_used from public.promotions where business_id=new.business_id and status in ('pending_review','published','draft') and (ends_at is null or ends_at>now());
  else return new; end if;
  v_limit:=public.plan_limit(new.business_id,v_key);
  if v_limit>=0 and v_used>=v_limit then
    raise exception using errcode='check_violation',message=format('Limite do plano atingido para %s. Faça upgrade ou libere espaço antes de continuar.',v_key);
  end if;
  return new;
end;
$$;

drop trigger if exists business_item_plan_limit on public.business_items;
drop trigger if exists business_items_plan_limit on public.business_items;
drop trigger if exists business_photo_plan_limit on public.business_photos;
drop trigger if exists business_photos_plan_limit on public.business_photos;
drop trigger if exists business_promotion_plan_limit on public.promotions;
drop trigger if exists promotions_plan_limit on public.promotions;

create trigger business_items_plan_limit before insert or update on public.business_items for each row execute function public.enforce_business_collection_limits();
create trigger business_photos_plan_limit before insert or update on public.business_photos for each row execute function public.enforce_business_collection_limits();
create trigger promotions_plan_limit before insert or update on public.promotions for each row execute function public.enforce_business_collection_limits();

create or replace function public.enforce_business_city_rules()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then
    if not (select private.is_admin()) and not exists(select 1 from public.cities c where c.id=new.city_id and c.active=true) then raise exception 'A cidade selecionada não está disponível para novos cadastros.'; end if;
  elsif tg_op='UPDATE' and new.city_id is distinct from old.city_id and not (select private.is_admin()) then raise exception 'A cidade da empresa só pode ser alterada pelo administrador.'; end if;
  return new;
end;
$$;

create or replace function public.get_business_dashboard_metrics(p_business_id uuid,p_days integer default 30)
returns table(profile_views bigint,whatsapp_clicks bigint,instagram_clicks bigint,website_clicks bigint,map_clicks bigint,promotion_clicks bigint,total_events bigint)
language plpgsql set search_path=public,pg_temp as $$
begin
  if not exists(select 1 from public.businesses b where b.id=p_business_id and (b.owner_id=(select auth.uid()) or (select private.is_admin()))) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  return query select count(*) filter(where event_type='profile_view')::bigint,count(*) filter(where event_type='whatsapp_click')::bigint,count(*) filter(where event_type='instagram_click')::bigint,count(*) filter(where event_type='website_click')::bigint,count(*) filter(where event_type='map_click')::bigint,count(*) filter(where event_type='promotion_click')::bigint,count(*)::bigint from public.analytics_events where business_id=p_business_id and created_at>=now()-make_interval(days=>greatest(1,least(coalesce(p_days,30),365)));
end;
$$;

alter table public.subscriptions drop constraint if exists subscriptions_user_id_business_id_key;
create unique index if not exists subscriptions_one_current_plan_per_business_idx on public.subscriptions(business_id) where status in ('active','trialing');
create unique index if not exists subscriptions_provider_subscription_id_idx on public.subscriptions(provider,provider_subscription_id) where provider_subscription_id is not null;
create unique index if not exists billing_events_provider_event_id_idx on public.billing_events(provider,provider_event_id);

create or replace function public.admin_set_business_plan(p_business_id uuid,p_plan_code plan_code,p_ends_at timestamptz default null)
returns public.subscriptions language plpgsql security definer set search_path=public,pg_temp as $$
declare v_plan public.plans; v_business public.businesses; v_subscription public.subscriptions;
begin
  if not (select private.is_admin()) then raise exception 'Apenas administradores podem alterar planos.' using errcode='42501'; end if;
  select * into v_business from public.businesses where id=p_business_id; if v_business.id is null then raise exception 'Empresa não encontrada.'; end if;
  select * into v_plan from public.plans where code=p_plan_code and active=true; if v_plan.id is null then raise exception 'Plano não encontrado ou inativo.'; end if;
  update public.subscriptions set status='canceled',ends_at=coalesce(ends_at,now()),current_period_end=coalesce(current_period_end,now()),updated_at=now() where business_id=p_business_id and status in ('active','trialing');
  insert into public.subscriptions(user_id,plan_id,business_id,status,started_at,ends_at,current_period_start,current_period_end,provider,billing_interval,cancel_at_period_end) values(v_business.owner_id,v_plan.id,p_business_id,'active',now(),p_ends_at,now(),p_ends_at,'manual','monthly',false) returning * into v_subscription;
  return v_subscription;
end;
$$;
revoke all on function public.admin_set_business_plan(uuid,plan_code,timestamptz) from public,anon;
grant execute on function public.admin_set_business_plan(uuid,plan_code,timestamptz) to authenticated;
revoke all on function public.admin_list_business_plans() from public,anon;
grant execute on function public.admin_list_business_plans() to authenticated;
revoke all on function public.admin_set_city_active(text,boolean) from public,anon,authenticated;
