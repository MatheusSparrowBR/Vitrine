alter table public.businesses
  add column if not exists cover_position_desktop jsonb not null default '{"x":0,"y":0,"zoom":1}'::jsonb,
  add column if not exists cover_position_mobile jsonb not null default '{"x":0,"y":0,"zoom":1}'::jsonb;
