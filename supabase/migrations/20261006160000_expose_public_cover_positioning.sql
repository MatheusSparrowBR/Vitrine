-- Expose the saved cover framing through the narrow public business directory.
-- The cover position is presentation metadata, not private owner data.
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
  b.cover_position_desktop,
  b.cover_position_mobile,
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
  b.ifood_url
from public.businesses b
left join public.cities c on c.id=b.city_id
left join public.categories cat on cat.id=b.category_id
where b.status='active'::public.business_status
  and c.active=true
  and (cat.active=true or cat.id is null);

alter view public.public_business_directory set (security_invoker=false);

grant select on public.public_business_directory to anon, authenticated;
