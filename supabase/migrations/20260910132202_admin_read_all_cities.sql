create policy "admins read all cities"
on public.cities
for select
to authenticated
using (public.is_admin());
