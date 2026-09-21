alter table public.events add column if not exists event_end_date date;

update public.events
set event_end_date = event_date
where event_end_date is null;

alter table public.events alter column event_end_date set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.events'::regclass
      and conname = 'events_date_range_check'
  ) then
    alter table public.events
      add constraint events_date_range_check
      check (event_end_date >= event_date);
  end if;
end $$;

create index if not exists events_city_end_date_idx
  on public.events(city_id, active, event_end_date, start_time);
