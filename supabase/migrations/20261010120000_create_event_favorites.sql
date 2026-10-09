-- Eventos salvos pelo usuário. Segue o mesmo padrão de business_favorites.

create table if not exists public.event_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists event_favorites_event_created_idx
  on public.event_favorites (event_id, created_at desc);

alter table public.event_favorites enable row level security;

revoke all on table public.event_favorites from anon, authenticated;
grant select, insert, delete on table public.event_favorites to authenticated;

drop policy if exists event_favorites_select_own on public.event_favorites;
create policy event_favorites_select_own
  on public.event_favorites
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists event_favorites_insert_own on public.event_favorites;
create policy event_favorites_insert_own
  on public.event_favorites
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.active = true
    )
  );

drop policy if exists event_favorites_delete_own on public.event_favorites;
create policy event_favorites_delete_own
  on public.event_favorites
  for delete to authenticated
  using ((select auth.uid()) = user_id);
