-- Keep user-owned relationship policies equivalent while allowing Postgres to
-- evaluate auth.uid() once per statement instead of once per row.

drop policy if exists business_notification_subscriptions_select_own on public.business_notification_subscriptions;
create policy business_notification_subscriptions_select_own
  on public.business_notification_subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists business_notification_subscriptions_insert_own on public.business_notification_subscriptions;
create policy business_notification_subscriptions_insert_own
  on public.business_notification_subscriptions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists business_notification_subscriptions_update_own on public.business_notification_subscriptions;
create policy business_notification_subscriptions_update_own
  on public.business_notification_subscriptions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists business_notification_subscriptions_delete_own on public.business_notification_subscriptions;
create policy business_notification_subscriptions_delete_own
  on public.business_notification_subscriptions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own
  on public.notification_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own
  on public.notification_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own
  on public.notification_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists notification_preferences_delete_own on public.notification_preferences;
create policy notification_preferences_delete_own
  on public.notification_preferences
  for delete to authenticated
  using (user_id = (select auth.uid()));
