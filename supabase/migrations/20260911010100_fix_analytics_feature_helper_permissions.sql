create schema if not exists private;

create or replace function private.business_has_feature(p_business_id uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(((p.features ->> p_feature)::boolean), false)
    from public.plans p
   where p.id = public.get_effective_plan_id(p_business_id)
   limit 1;
$$;

revoke all on function private.business_has_feature(uuid,text) from public;
grant usage on schema private to authenticated;
grant execute on function private.business_has_feature(uuid,text) to authenticated;

revoke all on function public.business_has_feature(uuid,text) from public, authenticated, anon;

alter table public.analytics_events enable row level security;

drop policy if exists "owners with analytics or admins read analytics events" on public.analytics_events;
create policy "owners with analytics or admins read analytics events"
on public.analytics_events
for select
to authenticated
using (
  (select private.is_admin())
  or ((user_id = (select auth.uid())) and private.business_has_feature(business_id, 'analytics'))
  or exists (
    select 1
      from public.businesses b
     where b.id = analytics_events.business_id
       and b.owner_id = (select auth.uid())
       and private.business_has_feature(b.id, 'analytics')
  )
);
