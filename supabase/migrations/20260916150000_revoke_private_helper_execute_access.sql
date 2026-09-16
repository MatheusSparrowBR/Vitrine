revoke execute on function private.is_admin() from anon, authenticated;
revoke execute on function private.is_business_owner(uuid) from anon, authenticated;
revoke execute on function private.business_has_feature(uuid, text) from anon, authenticated;
revoke execute on function private.get_business_plan_cycle(uuid) from anon, authenticated;
