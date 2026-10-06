begin;

alter table public.cities
  add column if not exists home_background_position_desktop jsonb not null default '{"xPct":0,"yPct":0,"zoom":1,"scaleX":1,"scaleY":1,"unit":"percent"}'::jsonb,
  add column if not exists home_background_position_mobile jsonb not null default '{"xPct":0,"yPct":0,"zoom":1,"scaleX":1,"scaleY":1,"unit":"percent"}'::jsonb;

commit;
