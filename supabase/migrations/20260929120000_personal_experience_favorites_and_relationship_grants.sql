-- Personal experience preferences, favorites, and least-privilege relationship access.

alter table public.profiles
  add column if not exists experience_mode text not null default 'personal';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_experience_mode_check'
  ) then
    alter table public.profiles
      add constraint profiles_experience_mode_check
      check (experience_mode in ('personal', 'business', 'both'));
  end if;
end $$;

create table if not exists public.business_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

create index if not exists business_favorites_business_created_idx
  on public.business_favorites (business_id, created_at desc);

alter table public.business_favorites enable row level security;

revoke all on table public.business_favorites from anon, authenticated;
grant select, insert, delete on table public.business_favorites to authenticated;

drop policy if exists business_favorites_select_own on public.business_favorites;
create policy business_favorites_select_own
  on public.business_favorites
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists business_favorites_insert_own on public.business_favorites;
create policy business_favorites_insert_own
  on public.business_favorites
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.businesses b
      where b.id = business_id
        and b.status = 'active'
    )
  );

drop policy if exists business_favorites_delete_own on public.business_favorites;
create policy business_favorites_delete_own
  on public.business_favorites
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Existing follow subscriptions are the canonical follow relationship. Keep the
-- table, but make its Data API grants explicit and authenticated-only.
revoke all on table public.business_notification_subscriptions from anon, authenticated;
grant select, insert, update, delete on table public.business_notification_subscriptions to authenticated;

revoke all on table public.notification_preferences from anon, authenticated;
grant select, insert, update, delete on table public.notification_preferences to authenticated;

revoke all on table public.notifications from anon, authenticated;
grant select, update on table public.notifications to authenticated;
