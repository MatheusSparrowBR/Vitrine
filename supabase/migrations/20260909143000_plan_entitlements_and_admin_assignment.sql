-- VitrineLocal: plano efetivo por empresa, limites server-side e troca manual pelo administrador.
-- A assinatura é a fonte de verdade do plano. Sem assinatura ativa, a empresa fica no plano free.

alter table public.plans add column if not exists description text;
alter table public.plans add column if not exists price_yearly numeric(12,2) not null default 0;
alter table public.plans add column if not exists sort_order integer not null default 0;
alter table public.plans add column if not exists updated_at timestamptz not null default now();

update public.plans set
  description = coalesce(description, case code when 'free' then 'Presença básica e recursos essenciais.' when 'pro' then 'Mais destaque e recursos para crescer.' else 'Máxima presença e recursos avançados.' end),
  sort_order = case code when 'free' then 1 when 'pro' then 2 when 'premium' then 3 else sort_order end,
  updated_at = now();

-- Benefícios/limites padrão. O administrador pode alterar estes valores na tela de Planos.
update public.plans set features = case code
  when 'free' then '{"business_profile":true,"photos":5,"items":10,"promotions":1,"ai_posts":3,"featured":false,"verified":false,"analytics":false,"advanced_analytics":false,"city_instagram":false}'::jsonb
  when 'pro' then '{"business_profile":true,"photos":30,"items":50,"promotions":5,"ai_posts":30,"featured":true,"verified":true,"analytics":true,"advanced_analytics":false,"city_instagram":false}'::jsonb
  when 'premium' then '{"business_profile":true,"photos":100,"items":200,"promotions":20,"ai_posts":100,"featured":true,"verified":true,"analytics":true,"advanced_analytics":true,"city_instagram":true}'::jsonb
  else features end,
  updated_at = now();

-- Plano efetivo. Não confia em dados enviados pelo navegador.
create or replace function public.get_effective_plan_id(p_business_id uuid)
returns uuid
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(
    (select s.plan_id from public.subscriptions s
      where s.business_id=p_business_id and s.status='active'
        and (s.ends_at is null or s.ends_at >= now())
      order by s.started_at desc, s.created_at desc limit 1),
    (select p.id from public.plans p where p.code='free' limit 1)
  );
$$;

create or replace function public.get_effective_plan(p_business_id uuid)
returns public.plans
language sql
stable
security definer
set search_path=public
as $$
  select p.* from public.plans p where p.id=public.get_effective_plan_id(p_business_id);
$$;

grant execute on function public.get_effective_plan_id(uuid) to authenticated;
grant execute on function public.get_effective_plan(uuid) to authenticated;

create or replace function public.plan_limit(p_business_id uuid, p_key text)
returns integer
language sql
stable
security definer
set search_path=public
as $$
  select case
    when jsonb_typeof(p.features->p_key)='number' then greatest(0,(p.features->>p_key)::integer)
    when p.features->>p_key='true' then -1
    else 0
  end
  from public.plans p where p.id=public.get_effective_plan_id(p_business_id);
$$;

grant execute on function public.plan_limit(uuid,text) to authenticated;

create or replace function public.plan_feature_enabled(p_business_id uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select coalesce((p.features->>p_key)::boolean,false)
  from public.plans p where p.id=public.get_effective_plan_id(p_business_id);
$$;

grant execute on function public.plan_feature_enabled(uuid,text) to authenticated;

-- Impede o bypass de limites por insert direto na API.
create or replace function public.enforce_business_photo_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare lim integer; used integer;
begin
  lim := public.plan_limit(new.business_id,'photos');
  if lim < 0 then return new; end if;
  select count(*) into used from public.business_photos where business_id=new.business_id;
  if used >= lim then
    raise exception 'Limite do plano atingido: esta empresa pode ter no máximo % fotos.', lim using errcode='check_violation';
  end if;
  return new;
end; $$;

drop trigger if exists business_photo_plan_limit on public.business_photos;
create trigger business_photo_plan_limit before insert on public.business_photos for each row execute function public.enforce_business_photo_limit();

create or replace function public.enforce_business_item_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare lim integer; used integer;
begin
  lim := public.plan_limit(new.business_id,'items');
  if lim < 0 then return new; end if;
  select count(*) into used from public.business_items where business_id=new.business_id;
  if used >= lim then
    raise exception 'Limite do plano atingido: esta empresa pode ter no máximo % produtos/serviços.', lim using errcode='check_violation';
  end if;
  return new;
end; $$;

drop trigger if exists business_item_plan_limit on public.business_items;
create trigger business_item_plan_limit before insert on public.business_items for each row execute function public.enforce_business_item_limit();

create or replace function public.enforce_business_promotion_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare lim integer; used integer;
begin
  lim := public.plan_limit(new.business_id,'promotions');
  if lim < 0 then return new; end if;
  select count(*) into used from public.promotions where business_id=new.business_id and (ends_at is null or ends_at >= now());
  if used >= lim then
    raise exception 'Limite do plano atingido: esta empresa pode ter no máximo % promoções vigentes.', lim using errcode='check_violation';
  end if;
  return new;
end; $$;

drop trigger if exists business_promotion_plan_limit on public.promotions;
create trigger business_promotion_plan_limit before insert on public.promotions for each row execute function public.enforce_business_promotion_limit();

-- Assinaturas deixam de ser alteráveis diretamente por usuários. Upgrade/downgrade futuro deve passar por backend/webhook;
-- o administrador usa a função segura abaixo para concessões manuais.
drop policy if exists "users insert own subscriptions" on public.subscriptions;
drop policy if exists "users update own subscriptions" on public.subscriptions;
drop policy if exists "users delete own subscriptions" on public.subscriptions;
revoke insert, update, delete on table public.subscriptions from authenticated;
grant select on table public.subscriptions to authenticated;

create or replace function public.admin_list_business_plans()
returns table(
  business_id uuid,
  business_name text,
  owner_id uuid,
  owner_name text,
  city_name text,
  plan_id uuid,
  plan_code public.plan_code,
  plan_name text,
  subscription_status text,
  subscription_ends_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $$
  select b.id,b.name,b.owner_id,pr.full_name,c.name,p.id,p.code,p.name,s.status,s.ends_at
  from public.businesses b
  left join public.profiles pr on pr.id=b.owner_id
  left join public.cities c on c.id=b.city_id
  left join lateral (
    select s1.* from public.subscriptions s1
    where s1.business_id=b.id and s1.status='active'
    order by s1.started_at desc,s1.created_at desc limit 1
  ) s on true
  join public.plans p on p.id=coalesce(s.plan_id,(select fp.id from public.plans fp where fp.code='free' limit 1))
  order by c.name,b.name;
$$;

create or replace function public.admin_set_business_plan(
  p_business_id uuid,
  p_plan_code public.plan_code,
  p_ends_at timestamptz default null
)
returns public.subscriptions
language plpgsql
security definer
set search_path=public
as $$
declare
  v_plan public.plans;
  v_business public.businesses;
  v_subscription public.subscriptions;
begin
  if not public.is_admin() then raise exception 'Apenas administradores podem alterar planos.' using errcode='42501'; end if;
  select * into v_business from public.businesses where id=p_business_id;
  if v_business.id is null then raise exception 'Empresa não encontrada.'; end if;
  select * into v_plan from public.plans where code=p_plan_code and active=true;
  if v_plan.id is null then raise exception 'Plano não encontrado ou inativo.'; end if;

  update public.subscriptions set status='canceled', ends_at=coalesce(ends_at,now())
    where business_id=p_business_id and status='active';

  insert into public.subscriptions(user_id,plan_id,business_id,status,started_at,ends_at)
  values(v_business.owner_id,v_plan.id,p_business_id,'active',now(),p_ends_at)
  returning * into v_subscription;
  return v_subscription;
end; $$;

revoke all on function public.admin_list_business_plans() from public,anon;
revoke all on function public.admin_set_business_plan(uuid,public.plan_code,timestamptz) from public,anon;
grant execute on function public.admin_list_business_plans() to authenticated;
grant execute on function public.admin_set_business_plan(uuid,public.plan_code,timestamptz) to authenticated;

-- Garante que apenas o administrador tenha acesso às operações administrativas via RPC.
comment on function public.admin_set_business_plan(uuid,public.plan_code,timestamptz) is 'Troca manual do plano de uma empresa. Requer role admin.';
comment on function public.admin_list_business_plans() is 'Lista empresas e plano efetivo para gestão administrativa.';
