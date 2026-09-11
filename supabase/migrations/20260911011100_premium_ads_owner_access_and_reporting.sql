drop policy if exists "owners read own advertisements" on public.advertisements;
create policy "owners read own advertisements"
on public.advertisements
for select
to authenticated
using (
  exists(select 1 from public.businesses b where b.id=advertisements.business_id and b.owner_id=(select auth.uid()))
  or (select private.is_admin())
);
