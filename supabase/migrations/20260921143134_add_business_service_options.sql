alter table public.businesses
  add column if not exists has_delivery boolean not null default false,
  add column if not exists has_pickup boolean not null default false,
  add column if not exists has_dine_in boolean not null default false;

comment on column public.businesses.has_delivery is 'Empresa oferece atendimento por delivery.';
comment on column public.businesses.has_pickup is 'Empresa oferece retirada no local.';
comment on column public.businesses.has_dine_in is 'Empresa oferece consumo no local.';

create or replace view public.public_business_directory
with (security_invoker = true)
as
select
  b.id,
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
  b.has_dine_in
from public.businesses b
left join public.cities c on c.id = b.city_id
left join public.categories cat on cat.id = b.category_id
where b.status = 'active'::public.business_status
  and c.active = true
  and (cat.active = true or cat.id is null);
