-- Prepare the project for Supabase's October 30, 2026 Data API default.
-- Existing table access is preserved; only future automatic grants are disabled.
--
-- Keep these three concerns explicit in future migrations:
--   1. CREATE TABLE
--   2. GRANT the minimum Data API privileges required by each role
--   3. RLS + policies for row-level authorization

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

grant all on table
  public.admin_audit_logs,
  public.advertisements,
  public.advertising_requests,
  public.analytics_events,
  public.billing_events,
  public.business_items,
  public.business_needs,
  public.business_notification_subscriptions,
  public.business_photos,
  public.business_plan_usage_cycles,
  public.business_plan_usage_monthly,
  public.business_review_audit_log,
  public.business_review_reports,
  public.business_review_response_log,
  public.business_reviews,
  public.businesses,
  public.categories,
  public.category_needs,
  public.cities,
  public.community_submissions,
  public.events,
  public.notification_preferences,
  public.notification_send_limits,
  public.notifications,
  public.operational_maintenance_runs,
  public.plans,
  public.posts,
  public.profiles,
  public.promotions,
  public.push_subscriptions,
  public.subscriptions,
  public.user_status_history
to service_role;

grant select on table
  public.advertisements,
  public.business_items,
  public.business_photos,
  public.categories,
  public.cities,
  public.events,
  public.plans,
  public.posts,
  public.promotions
to anon;

grant insert on table public.analytics_events to anon;

grant select, insert, update, delete on table
  public.business_needs,
  public.category_needs,
  public.business_review_audit_log,
  public.business_review_reports,
  public.business_review_response_log,
  public.business_reviews,
  public.notification_preferences,
  public.notification_send_limits,
  public.notifications,
  public.push_subscriptions,
  public.user_status_history
to anon;

grant select, insert, update on table public.admin_audit_logs to authenticated;
grant select, insert, update on table public.advertising_requests to authenticated;
grant select on table public.analytics_events to authenticated;
grant select on table public.billing_events to authenticated;

grant select, insert, update, delete on table
  public.advertisements,
  public.business_items,
  public.business_needs,
  public.business_notification_subscriptions,
  public.business_photos,
  public.business_reviews,
  public.business_review_audit_log,
  public.business_review_reports,
  public.business_review_response_log,
  public.businesses,
  public.categories,
  public.category_needs,
  public.cities,
  public.events,
  public.notification_preferences,
  public.notification_send_limits,
  public.posts,
  public.promotions,
  public.push_subscriptions,
  public.user_status_history
to authenticated;

grant select on table
  public.business_plan_usage_cycles,
  public.business_plan_usage_monthly,
  public.operational_maintenance_runs,
  public.plans,
  public.subscriptions
to authenticated;

grant select, update on table public.notifications to authenticated;
grant select, insert, update on table public.profiles to authenticated;

grant usage, select on sequence public.analytics_events_id_seq
  to anon, authenticated, service_role;
