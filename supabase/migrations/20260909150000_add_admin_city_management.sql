grant select on table public.cities to anon, authenticated;
grant insert, update, delete on table public.cities to authenticated;
drop policy if exists "admins manage cities" on public.cities;
create policy "admins manage cities" on public.cities for all to authenticated using (public.is_admin()) with check (public.is_admin());
create unique index if not exists cities_slug_unique_idx on public.cities (slug);
create index if not exists cities_active_name_idx on public.cities (active, name);
