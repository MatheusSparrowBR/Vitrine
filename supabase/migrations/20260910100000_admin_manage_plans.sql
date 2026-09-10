-- Allow platform administrators to fully manage commercial plans.
create policy "admins read all plans" on public.plans
for select to authenticated
using (public.is_admin());

create policy "admins insert plans" on public.plans
for insert to authenticated
with check (public.is_admin());

create policy "admins update plans" on public.plans
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins delete plans" on public.plans
for delete to authenticated
using (public.is_admin());
