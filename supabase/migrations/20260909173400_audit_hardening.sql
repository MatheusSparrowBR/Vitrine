-- VitrineLocal audit hardening: plan pricing, duplicate indexes and RLS performance.
-- Applied to the connected Supabase project on 2026-09-09.

update public.plans set price_yearly=299.00, updated_at=now() where code='pro';
update public.plans set price_yearly=599.00, updated_at=now() where code='premium';

drop index if exists public.analytics_events_city_created_idx;
drop index if exists public.cities_slug_unique_idx;

alter policy "owners or admins read analytics events" on public.analytics_events
  using (
    ((user_id = (select auth.uid()))
      or exists (
        select 1 from public.businesses b
        where b.id = analytics_events.business_id
          and (b.owner_id = (select auth.uid()) or (select is_admin()))
      )
      or (select is_admin()))
  );

drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories
  for insert to authenticated with check ((select is_admin()));
create policy "admins update categories" on public.categories
  for update to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "admins delete categories" on public.categories
  for delete to authenticated using ((select is_admin()));

drop policy if exists "admins manage cities" on public.cities;
create policy "admins insert cities" on public.cities
  for insert to authenticated with check ((select is_admin()));
create policy "admins update cities" on public.cities
  for update to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "admins delete cities" on public.cities
  for delete to authenticated using ((select is_admin()));
