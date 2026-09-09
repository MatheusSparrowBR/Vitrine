grant select on table public.events to anon, authenticated;
grant insert, update, delete on table public.events to authenticated;
revoke insert, update, delete on table public.events from anon;
drop policy if exists "public read future active events" on public.events;
drop policy if exists "admins manage events" on public.events;
create policy "public read future active events" on public.events for select to anon, authenticated using (active=true and event_date >= current_date);
create policy "admins manage events" on public.events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create unique index if not exists events_city_slug_unique_idx on public.events(city_id,slug);
create index if not exists events_city_date_idx on public.events(city_id,active,event_date,start_time);
