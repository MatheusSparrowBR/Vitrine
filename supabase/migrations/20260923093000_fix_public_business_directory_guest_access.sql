-- Public business directory is intentionally public and already filters to active businesses/cities/categories.
-- Keep the underlying businesses table protected by RLS while allowing the public view
-- to execute with the view owner's privileges rather than the anonymous invoker's privileges.
alter view public.public_business_directory set (security_invoker = false);

grant select on public.public_business_directory to anon, authenticated;
