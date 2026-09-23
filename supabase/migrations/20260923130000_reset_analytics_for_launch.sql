-- Reset site engagement analytics for the public launch baseline.
-- Keep businesses, subscriptions, billing events and admin audit history intact.
delete from public.analytics_events;
