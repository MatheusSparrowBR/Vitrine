create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  promotions_enabled boolean not null default true,
  business_enabled boolean not null default true,
  system_enabled boolean not null default true,
  city_id uuid references public.cities(id) on delete set null,
  category_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_preferences_city_idx
  on public.notification_preferences(city_id);

create index if not exists notification_preferences_category_ids_gin_idx
  on public.notification_preferences using gin(category_ids);

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own
  on public.notification_preferences for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own
  on public.notification_preferences for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own
  on public.notification_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notification_preferences_delete_own on public.notification_preferences;
create policy notification_preferences_delete_own
  on public.notification_preferences for delete
  to authenticated
  using (user_id = auth.uid());

create or replace function public.set_notification_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notification_preferences_updated_at on public.notification_preferences;
create trigger notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_notification_preferences_updated_at();

create table if not exists public.notification_send_limits (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  send_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.notification_send_limits enable row level security;

create or replace function public.consume_promotion_notification_quota(
  p_business_id uuid,
  p_limit integer default 5
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_window timestamptz;
  current_count integer;
begin
  if p_limit < 1 then
    return jsonb_build_object('allowed', false, 'remaining', 0);
  end if;

  insert into public.notification_send_limits(business_id, window_started_at, send_count)
  values (p_business_id, now(), 0)
  on conflict (business_id) do nothing;

  select window_started_at, send_count
    into current_window, current_count
    from public.notification_send_limits
    where business_id = p_business_id
    for update;

  if current_window <= now() - interval '1 hour' then
    update public.notification_send_limits
      set window_started_at = now(), send_count = 1, updated_at = now()
      where business_id = p_business_id;
    return jsonb_build_object('allowed', true, 'remaining', greatest(p_limit - 1, 0));
  end if;

  if current_count >= p_limit then
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_at', current_window + interval '1 hour'
    );
  end if;

  update public.notification_send_limits
    set send_count = current_count + 1, updated_at = now()
    where business_id = p_business_id;

  return jsonb_build_object('allowed', true, 'remaining', greatest(p_limit - current_count - 1, 0));
end;
$$;

revoke all on function public.consume_promotion_notification_quota(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_promotion_notification_quota(uuid, integer) to service_role;

alter table public.notifications
  add column if not exists target_city_id uuid references public.cities(id) on delete set null,
  add column if not exists target_category_id uuid references public.categories(id) on delete set null;

create index if not exists notifications_target_city_idx
  on public.notifications(target_city_id);

create index if not exists notifications_target_category_idx
  on public.notifications(target_category_id);
