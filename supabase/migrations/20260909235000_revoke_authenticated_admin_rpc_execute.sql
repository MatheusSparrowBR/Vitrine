-- Security hardening: admin-only SECURITY DEFINER RPCs must not be callable
-- directly by signed-in clients through the exposed public schema.
revoke execute on function public.admin_list_business_plans() from authenticated;
revoke execute on function public.admin_set_business_plan(uuid, public.plan_code, timestamptz) from authenticated;
