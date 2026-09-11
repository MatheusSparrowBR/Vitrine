create or replace function public.admin_list_business_plans()
returns table(business_id uuid,business_name text,owner_id uuid,owner_name text,city_name text,plan_id uuid,plan_code public.plan_code,plan_name text,subscription_status text,subscription_ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  if not private.is_admin() then
    raise exception 'Apenas administradores podem consultar planos por empresa.' using errcode='42501';
  end if;
  return query
  select b.id,b.name,b.owner_id,pr.full_name,c.name,p.id,p.code,p.name,s.status,s.ends_at
    from public.businesses b
    left join public.profiles pr on pr.id=b.owner_id
    left join public.cities c on c.id=b.city_id
    left join lateral (
      select s1.* from public.subscriptions s1
      where s1.business_id=b.id and s1.status in ('active','trialing')
      order by s1.started_at desc nulls last,s1.created_at desc
      limit 1
    ) s on true
    join public.plans p on p.id=coalesce(s.plan_id,(select fp.id from public.plans fp where fp.code='free' and fp.active=true limit 1))
   order by c.name,b.name;
end;
$$;
