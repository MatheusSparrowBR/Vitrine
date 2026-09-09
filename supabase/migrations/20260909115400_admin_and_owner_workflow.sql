create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path=public
as $$
  select exists (select 1 from public.profiles where id=(select auth.uid()) and role='admin');
$$;

create policy "admins read all businesses" on public.businesses for select to authenticated using (public.is_admin());
create policy "admins update all businesses" on public.businesses for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete all businesses" on public.businesses for delete to authenticated using (public.is_admin());
create policy "admins manage posts" on public.posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage community submissions" on public.community_submissions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage advertisements" on public.advertisements for all to authenticated using (public.is_admin()) with check (public.is_admin());

create index if not exists businesses_owner_status_idx on public.businesses(owner_id,status);
create index if not exists analytics_city_created_idx on public.analytics_events(city_id,created_at desc);
