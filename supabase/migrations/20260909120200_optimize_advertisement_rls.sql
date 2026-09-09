drop policy if exists "public read active ads" on public.advertisements;
drop policy if exists "admins manage advertisements" on public.advertisements;
create policy "anon read active ads" on public.advertisements for select to anon using(active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()));
create policy "authenticated read ads" on public.advertisements for select to authenticated using((active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now())) or public.is_admin());
create policy "admins insert ads" on public.advertisements for insert to authenticated with check(public.is_admin());
create policy "admins update ads" on public.advertisements for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "admins delete ads" on public.advertisements for delete to authenticated using(public.is_admin());
