alter table public.businesses
  add column if not exists search_featured_mode text not null default 'auto';

alter table public.businesses
  add constraint businesses_search_featured_mode_check
  check (search_featured_mode in ('auto','on','off'));

update public.businesses
set search_featured_mode = case when search_featured then 'on' else 'auto' end
where search_featured_mode = 'auto';

create index if not exists businesses_search_featured_mode_idx
  on public.businesses(city_id, search_featured_mode, featured, created_at desc);

create or replace function public.business_search_featured_enabled(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select case
    when b.search_featured_mode='on' then true
    when b.search_featured_mode='off' then false
    else exists (
      select 1
      from public.plans p
      where p.id=public.get_effective_plan_id(b.id)
        and p.code in ('pro'::public.plan_code,'premium'::public.plan_code)
        and p.active=true
    )
  end
  from public.businesses b
  where b.id=p_business_id;
$function$;

create or replace view public.public_business_directory
with (security_invoker=true)
as
select b.id,
       b.city_id,
       b.category_id,
       b.name,
       b.slug,
       b.short_description,
       b.description,
       b.logo_url,
       b.cover_url,
       b.phone,
       b.whatsapp,
       b.website_url,
       b.instagram_url,
       b.facebook_url,
       b.address,
       b.neighborhood,
       b.latitude,
       b.longitude,
       b.opening_hours,
       b.verified,
       b.featured,
       b.created_at,
       b.updated_at,
       c.name as city_name,
       c.state as city_state,
       cat.name as category_name,
       cat.slug as category_slug,
       b.has_delivery,
       b.has_pickup,
       b.has_dine_in,
       public.business_search_featured_enabled(b.id) as search_featured
  from public.businesses b
  left join public.cities c on c.id=b.city_id
  left join public.categories cat on cat.id=b.category_id
 where b.status='active'::public.business_status
   and c.active=true
   and (cat.active=true or cat.id is null);

create or replace function public.protect_search_featured_mode()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if not private.is_admin() and new.search_featured_mode is distinct from old.search_featured_mode then
    raise exception 'Somente administradores podem alterar o modo da busca em destaque.'
      using errcode='42501';
  end if;

  if new.search_featured_mode not in ('auto','on','off') then
    raise exception 'Modo de busca em destaque inválido.'
      using errcode='22P02';
  end if;

  new.search_featured := (new.search_featured_mode='on');
  return new;
end;
$function$;

drop trigger if exists trg_protect_search_featured_mode on public.businesses;
create trigger trg_protect_search_featured_mode
before insert or update of search_featured_mode, search_featured
on public.businesses
for each row
execute function public.protect_search_featured_mode();
