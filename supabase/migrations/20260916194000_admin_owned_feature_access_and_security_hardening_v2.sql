-- Admin-owned test businesses are a privileged test tenant: unlimited quotas and all plan-gated features.
-- Tenant isolation remains enforced for all non-admin-owned businesses.

create or replace function private.is_admin_owned_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses b
    join public.profiles p on p.id = b.owner_id
    where b.id = p_business_id
      and p.role = 'admin'
  );
$$;

revoke all on function private.is_admin_owned_business(uuid) from public, anon;
grant execute on function private.is_admin_owned_business(uuid) to authenticated;

create or replace function public.plan_limit(p_business_id uuid, p_key text)
returns integer
language sql
stable
set search_path = 'public','pg_temp'
as $$
  select case
    when private.is_admin_owned_business(p_business_id) then -1
    when jsonb_typeof(p.features->p_key)='number' then greatest(0,(p.features->>p_key)::integer)
    when p.features->>p_key='true' then -1
    else 0
  end
  from public.plans p
  where p.id=public.get_effective_plan_id(p_business_id);
$$;

grant execute on function public.plan_limit(uuid,text) to authenticated;

create or replace function public.plan_feature_enabled(p_business_id uuid, p_key text)
returns boolean
language sql
stable
set search_path = 'public','pg_temp'
as $$
  select case
    when private.is_admin_owned_business(p_business_id) then true
    else coalesce((p.features->>p_key)::boolean,false)
  end
  from public.plans p
  where p.id=public.get_effective_plan_id(p_business_id);
$$;

grant execute on function public.plan_feature_enabled(uuid,text) to authenticated;

create or replace function private.business_has_feature(p_business_id uuid, p_feature text)
returns boolean
language plpgsql
stable
security definer
set search_path = 'public','pg_temp'
as $$
begin
  if private.is_admin_owned_business(p_business_id) then
    return true;
  end if;
  if not ((select private.is_admin()) or (select private.is_business_owner(p_business_id))) then
    return false;
  end if;
  return coalesce((
    select (p.features ->> p_feature)::boolean
    from public.plans p
    where p.id = public.get_effective_plan_id(p_business_id)
    limit 1
  ), false);
end;
$$;

revoke all on function private.business_has_feature(uuid,text) from public, anon;
grant execute on function private.business_has_feature(uuid,text) to authenticated;

-- The business-delete RPC is administrative and must never be anonymously callable.
revoke execute on function public.delete_business_admin(uuid) from anon;
grant execute on function public.delete_business_admin(uuid) to authenticated;
