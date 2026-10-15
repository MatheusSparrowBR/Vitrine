begin;

-- Premium banners may represent either a business or a public event.
alter table public.advertisements
  alter column business_id drop not null;

alter table public.advertisements
  add column if not exists event_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'advertisements_event_id_fkey'
      and conrelid = 'public.advertisements'::regclass
  ) then
    alter table public.advertisements
      add constraint advertisements_event_id_fkey
      foreign key (event_id)
      references public.events(id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'advertisements_exactly_one_target_check'
      and conrelid = 'public.advertisements'::regclass
  ) then
    alter table public.advertisements
      add constraint advertisements_exactly_one_target_check
      check (
        (business_id is not null and event_id is null)
        or (business_id is null and event_id is not null)
      );
  end if;
end;
$$;

-- Preserve the existing business/city integrity trigger and extend it to event banners.
create or replace function public.validate_advertisement_business_city()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.event_id is not null then
    if new.business_id is not null then
      raise exception 'Advertisement must target either a business or an event, not both';
    end if;

    if not exists (
      select 1 from public.events e
      where e.id = new.event_id
        and e.city_id = new.city_id
    ) then
      raise exception 'Advertisement event must belong to the selected city';
    end if;
  else
    if new.business_id is null or not exists (
      select 1 from public.businesses b
      where b.id = new.business_id
        and b.city_id = new.city_id
        and b.status = 'active'::public.business_status
    ) then
      raise exception 'Advertisement business must be active and belong to the selected city';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists validate_advertisement_business_city on public.advertisements;
create trigger validate_advertisement_business_city
before insert or update of business_id, city_id, event_id
on public.advertisements
for each row
execute function public.validate_advertisement_business_city();

-- Keep existing company banners public and allow active, non-expired event banners.
drop policy if exists "anon read active ads" on public.advertisements;
create policy "anon read active ads"
on public.advertisements
for select
to anon
using (
  active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
  and (
    exists (
      select 1
      from public.businesses b
      where b.id = advertisements.business_id
        and b.city_id = advertisements.city_id
        and b.status = 'active'::public.business_status
    )
    or exists (
      select 1
      from public.events e
      where e.id = advertisements.event_id
        and e.city_id = advertisements.city_id
        and e.active = true
        and e.event_end_date >= (now() at time zone 'America/Sao_Paulo')::date
    )
  )
  and exists (
    select 1 from public.cities c
    where c.id = advertisements.city_id and c.active = true
  )
);

drop policy if exists "authenticated read ads" on public.advertisements;
create policy "authenticated read ads"
on public.advertisements
for select
to authenticated
using (
  (
    active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
    and (
      exists (
        select 1
        from public.businesses b
        where b.id = advertisements.business_id
          and b.city_id = advertisements.city_id
          and b.status = 'active'::public.business_status
      )
      or exists (
        select 1
        from public.events e
        where e.id = advertisements.event_id
          and e.city_id = advertisements.city_id
          and e.active = true
          and e.event_end_date >= (now() at time zone 'America/Sao_Paulo')::date
      )
    )
    and exists (
      select 1 from public.cities c
      where c.id = advertisements.city_id and c.active = true
    )
  )
  or exists (
    select 1
    from public.businesses b
    where b.id = advertisements.business_id
      and b.owner_id = (select auth.uid())
  )
  or (select private.is_admin())
);

commit;

-- Ensure PostgREST immediately discovers event_id and the new relationship.
notify pgrst, 'reload schema';
