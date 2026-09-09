-- Keeps the banner source path alongside the public URL so admin deletes can
-- remove the corresponding object from Supabase Storage.
alter table public.advertisements
  add column if not exists image_path text;

create index if not exists advertisements_home_banner_active_idx
  on public.advertisements (city_id, placement, active, starts_at, ends_at);