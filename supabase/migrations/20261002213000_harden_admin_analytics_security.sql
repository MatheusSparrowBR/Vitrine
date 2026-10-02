alter view public.public_business_directory set (security_invoker = true);

revoke execute on function public.validate_analytics_event_integrity() from public, anon, authenticated;

-- Keep admin role helpers callable by authenticated RLS policies, but not directly by anonymous clients.
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "admins manage business needs" on public.business_needs;
drop policy if exists "public read active business needs" on public.business_needs;
create policy "public read active business needs" on public.business_needs
  for select to anon, authenticated
  using (active = true or (select private.is_admin()));
create policy "admins insert business needs" on public.business_needs
  for insert to authenticated
  with check ((select private.is_admin()));
create policy "admins update business needs" on public.business_needs
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "admins delete business needs" on public.business_needs
  for delete to authenticated
  using ((select private.is_admin()));

drop policy if exists "admins manage category needs" on public.category_needs;
drop policy if exists "public read category needs" on public.category_needs;
create policy "public read category needs" on public.category_needs
  for select to anon, authenticated
  using (exists (select 1 from public.business_needs n where n.id = category_needs.need_id and n.active = true) or (select private.is_admin()));
create policy "admins insert category needs" on public.category_needs
  for insert to authenticated
  with check ((select private.is_admin()));
create policy "admins update category needs" on public.category_needs
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "admins delete category needs" on public.category_needs
  for delete to authenticated
  using ((select private.is_admin()));

create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_event_created_idx on public.analytics_events (event_type, created_at desc);
