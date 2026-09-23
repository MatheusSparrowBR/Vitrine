-- Phase 2.1: persistent Web Push subscription storage.
-- The table is protected by per-user RLS; privileged senders can use the service role later.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  platform text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_key unique (endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

create index if not exists push_subscriptions_enabled_idx
  on public.push_subscriptions(enabled)
  where enabled = true;

alter table public.push_subscriptions enable row level security;

drop policy if exists "push subscriptions select own" on public.push_subscriptions;
drop policy if exists "push subscriptions insert own" on public.push_subscriptions;
drop policy if exists "push subscriptions update own" on public.push_subscriptions;
drop policy if exists "push subscriptions delete own" on public.push_subscriptions;

create policy "push subscriptions select own"
on public.push_subscriptions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "push subscriptions insert own"
on public.push_subscriptions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "push subscriptions update own"
on public.push_subscriptions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "push subscriptions delete own"
on public.push_subscriptions for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_push_subscriptions_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = now();
  new.last_seen_at = now();
  return new;
end;
$$;

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_push_subscriptions_updated_at();
