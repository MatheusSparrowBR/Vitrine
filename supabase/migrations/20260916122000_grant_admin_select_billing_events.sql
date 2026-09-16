-- billing_events is protected by RLS: only administrators may read it.
-- The frontend still uses the authenticated Supabase role, so the table needs
-- an explicit SELECT grant in addition to the admin-only RLS policy.
grant select on table public.billing_events to authenticated;
