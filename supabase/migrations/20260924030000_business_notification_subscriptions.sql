-- Per-business notification subscriptions: users can follow a specific company for Push updates.
create table if not exists public.business_notification_subscriptions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,business_id)
);

create index if not exists idx_business_notification_subscriptions_business
  on public.business_notification_subscriptions (business_id) where enabled = true;

create index if not exists idx_business_notification_subscriptions_user
  on public.business_notification_subscriptions (user_id) where enabled = true;

alter table public.business_notification_subscriptions enable row level security;

drop policy if exists "business_notification_subscriptions_select_own" on public.business_notification_subscriptions;
create policy "business_notification_subscriptions_select_own"
  on public.business_notification_subscriptions for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "business_notification_subscriptions_insert_own" on public.business_notification_subscriptions;
create policy "business_notification_subscriptions_insert_own"
  on public.business_notification_subscriptions for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "business_notification_subscriptions_update_own" on public.business_notification_subscriptions;
create policy "business_notification_subscriptions_update_own"
  on public.business_notification_subscriptions for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "business_notification_subscriptions_delete_own" on public.business_notification_subscriptions;
create policy "business_notification_subscriptions_delete_own"
  on public.business_notification_subscriptions for delete
  to authenticated using (auth.uid() = user_id);

create or replace function public.set_business_notification_subscription_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_business_notification_subscriptions_updated_at on public.business_notification_subscriptions;
create trigger trg_business_notification_subscriptions_updated_at
before update on public.business_notification_subscriptions
for each row execute function public.set_business_notification_subscription_updated_at();

revoke all on public.business_notification_subscriptions from anon;
grant select, insert, update, delete on public.business_notification_subscriptions to authenticated;
grant all on public.business_notification_subscriptions to service_role;
