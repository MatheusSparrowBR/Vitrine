drop policy if exists "users read own subscriptions" on public.subscriptions;
drop policy if exists "Admins read all subscriptions" on public.subscriptions;
create policy "Read subscriptions by owner or admin" on public.subscriptions
for select to authenticated
using ((select auth.uid()) = user_id or (select public.is_admin()));
