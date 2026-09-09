alter table public.advertisements add column if not exists placement text not null default 'home_banner';
alter table public.advertisements add column if not exists priority integer not null default 0;
alter table public.advertisements drop constraint if exists advertisements_placement_check;
alter table public.advertisements add constraint advertisements_placement_check check (placement in ('home_banner','sponsored_card'));
create index if not exists advertisements_home_banner_idx on public.advertisements (city_id, active, placement, priority desc, created_at desc);
