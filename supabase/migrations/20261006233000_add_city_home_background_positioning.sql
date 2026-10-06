begin;

alter table public.cities
  add column if not exists home_background_position_desktop jsonb,
  add column if not exists home_background_position_mobile jsonb;

commit;
