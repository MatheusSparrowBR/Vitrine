create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  title text not null,
  slug text not null,
  description text,
  image_url text,
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  address text,
  category text,
  price numeric(12,2),
  external_url text,
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
revoke insert, update, delete on public.events from anon;

create or replace function public.set_events_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_events_updated_at() from public, anon, authenticated;

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at
before update on public.events
for each row execute function public.set_events_updated_at();

create unique index if not exists events_city_slug_unique_idx on public.events(city_id, slug);
create index if not exists events_city_date_idx on public.events(city_id, active, event_date, start_time);
