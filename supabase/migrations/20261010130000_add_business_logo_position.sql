-- Enquadramento da logo (posição, zoom e preenchimento) salvo pelo dono ou pelo admin.
-- A posição é metadado de apresentação, por isso também é exposta pela visão pública da diretoria.

alter table public.businesses
  add column if not exists logo_position jsonb not null default '{}'::jsonb;

-- Recria a visão pública com a mesma definição atual, acrescentando logo_position no fim.
create or replace view public.public_business_directory as
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
  b.has_dine_in,
  public.business_search_featured_enabled(b.id) as search_featured,
  b.ifood_url,
  b.cover_position_desktop,
  b.cover_position_mobile,
  b.logo_position
from public.businesses b
left join public.cities c on c.id=b.city_id
left join public.categories cat on cat.id=b.category_id
where b.status='active'::public.business_status
  and c.active=true
  and (cat.active=true or cat.id is null);

alter view public.public_business_directory set (security_invoker=false);

grant select on public.public_business_directory to anon, authenticated;
