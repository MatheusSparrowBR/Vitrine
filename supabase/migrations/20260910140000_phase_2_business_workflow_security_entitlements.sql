begin;

-- Harden helper function execution context.
alter function public.generate_business_slug(text) set search_path = public;

-- Keep only the intended public/admin city SELECT rules.
drop policy if exists "admins read all cities" on public.cities;
drop policy if exists "public read active cities" on public.cities;
create policy "public read active cities" on public.cities
for select to anon using (active = true);
create policy "authenticated read cities" on public.cities
for select to authenticated using ((active = true) or public.is_admin());

-- Business moderation metadata.
alter table public.businesses add column if not exists reviewed_at timestamptz;
alter table public.businesses add column if not exists reviewed_by uuid references public.profiles(id);
alter table public.businesses add column if not exists rejection_reason text;
create index if not exists businesses_review_status_idx on public.businesses(status, reviewed_at desc);

-- The effective plan is the latest active/trialing subscription, with free as fallback.
create or replace function public.get_effective_plan_id(p_business_id uuid)
returns uuid
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select s.plan_id
       from public.subscriptions s
      where s.business_id = p_business_id
        and s.status in ('active','trialing')
        and (s.ends_at is null or s.ends_at >= now())
      order by s.started_at desc nulls last, s.created_at desc
      limit 1),
    (select p.id from public.plans p where p.code = 'free' and p.active = true limit 1)
  );
$$;

create or replace function public.business_has_feature(p_business_id uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(((p.features ->> p_feature)::boolean), false)
    from public.plans p
   where p.id = public.get_effective_plan_id(p_business_id)
   limit 1;
$$;
revoke all on function public.business_has_feature(uuid,text) from public, anon, authenticated;

create or replace function public.business_feature_limit(p_business_id uuid, p_feature text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif((p.features ->> p_feature), '')::integer, 0)
    from public.plans p
   where p.id = public.get_effective_plan_id(p_business_id)
   limit 1;
$$;
revoke all on function public.business_feature_limit(uuid,text) from public, anon, authenticated;

-- Prevent non-admins from self-approving, self-verifying or self-featuring a business.
create or replace function public.enforce_business_workflow_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then
      new.status := 'pending'::business_status;
      new.verified := false;
      new.featured := false;
      new.reviewed_at := null;
      new.reviewed_by := null;
      new.rejection_reason := null;
    end if;
    return new;
  end if;

  if public.is_admin() then
    if new.status is distinct from old.status then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
      if new.status = 'active' then new.rejection_reason := null; end if;
    end if;
  else
    new.status := old.status;
    new.verified := old.verified;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.rejection_reason := old.rejection_reason;
    if new.featured is distinct from old.featured then
      if new.featured and public.business_has_feature(old.id, 'featured') then
        new.featured := true;
      else
        new.featured := old.featured;
      end if;
    end if;
  end if;

  return new;
end;
$$;
revoke all on function public.enforce_business_workflow_rules() from public, anon, authenticated;
drop trigger if exists businesses_workflow_rules on public.businesses;
create trigger businesses_workflow_rules
before insert or update on public.businesses
for each row execute function public.enforce_business_workflow_rules();

-- Database-level plan limits for owner-created collections.
create or replace function public.enforce_business_collection_limits()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer;
  v_used integer;
  v_key text;
begin
  if tg_table_name = 'business_photos' then
    v_key := 'photos';
    select count(*) into v_used from public.business_photos where business_id = new.business_id;
  elsif tg_table_name = 'business_items' then
    if new.active is distinct from true then return new; end if;
    v_key := 'items';
    select count(*) into v_used from public.business_items where business_id = new.business_id and active = true;
  elsif tg_table_name = 'promotions' then
    if new.status not in ('pending_review','published','draft') then return new; end if;
    v_key := 'promotions';
    select count(*) into v_used from public.promotions where business_id = new.business_id and status in ('pending_review','published','draft');
  else
    return new;
  end if;

  v_limit := public.business_feature_limit(new.business_id, v_key);
  if v_limit > 0 and v_used >= v_limit then
    raise exception using
      errcode = 'check_violation',
      message = format('Limite do plano atingido para %s. Faça upgrade para continuar.', v_key);
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_business_collection_limits() from public, anon, authenticated;
drop trigger if exists business_photos_plan_limit on public.business_photos;
create trigger business_photos_plan_limit before insert on public.business_photos for each row execute function public.enforce_business_collection_limits();
drop trigger if exists business_items_plan_limit on public.business_items;
create trigger business_items_plan_limit before insert on public.business_items for each row execute function public.enforce_business_collection_limits();
drop trigger if exists promotions_plan_limit on public.promotions;
create trigger promotions_plan_limit before insert on public.promotions for each row execute function public.enforce_business_collection_limits();

-- Analytics is an entitled feature; admins retain access.
drop policy if exists "owners or admins read analytics events" on public.analytics_events;
create policy "owners with analytics or admins read analytics events"
on public.analytics_events
for select to authenticated
using (
  public.is_admin()
  or (
    user_id = auth.uid()
    and public.business_has_feature(business_id, 'analytics')
  )
  or (
    exists (
      select 1
        from public.businesses b
       where b.id = analytics_events.business_id
         and b.owner_id = auth.uid()
         and public.business_has_feature(b.id, 'analytics')
    )
  )
);

-- Administrative audit trail for moderation and high-impact catalog changes.
create table if not exists public.admin_audit_logs(
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_logs enable row level security;
drop policy if exists "admins read audit logs" on public.admin_audit_logs;
create policy "admins read audit logs" on public.admin_audit_logs for select to authenticated using (public.is_admin());
drop policy if exists "admins insert audit logs" on public.admin_audit_logs;
create policy "admins insert audit logs" on public.admin_audit_logs for insert to authenticated with check (public.is_admin() and actor_id = auth.uid());
create index if not exists admin_audit_logs_entity_idx on public.admin_audit_logs(entity_type, entity_id, created_at desc);
create index if not exists admin_audit_logs_actor_idx on public.admin_audit_logs(actor_id, created_at desc);

commit;
