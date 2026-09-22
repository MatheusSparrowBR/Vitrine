-- Post-audit security hardening.
-- The demo directory is public by design, but must respect invoker RLS.
alter view public.demo_public_business_directory set (security_invoker = true);

-- This helper already enforces owner/admin access internally; anonymous clients
-- should not be able to call it over the PostgREST RPC surface.
revoke execute on function public.get_business_collection_usage(uuid) from public, anon;
grant execute on function public.get_business_collection_usage(uuid) to authenticated;

-- Trigger-only function: clients do not need direct RPC access.
revoke execute on function public.protect_search_featured_mode() from public, anon, authenticated;
