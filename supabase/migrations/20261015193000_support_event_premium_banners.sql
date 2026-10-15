begin;

-- Premium banners may represent either a business or a public event.
alter table public.advertisements
  alter column business_id drop not null;

alter table public.advertisements
  add column if not exists event_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'advertisements_event_id_fkey'
      and conrelid = 'public.advertisements'::regclass
  ) then
    alter table public.advertisements
      add constraint advertisements_event_id_fkey
      foreign key (event_id)
      references public.events(id)
      on delete cascade;
  end if;
end;
$$;

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
