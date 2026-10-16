begin;

-- Banner premium de evento some quando o evento está em "Em breve": a política de leitura de
-- advertisements consultava events com as permissões do visitante, e o modo Em breve esconde o
-- evento do público. A função abaixo checa só o necessário (existe, ativo, não encerrado) e
-- devolve apenas verdadeiro ou falso, sem liberar a tabela events.
create or replace function public.advertisement_event_is_public(p_event_id uuid, p_city_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.city_id = p_city_id
      and e.active = true
      and e.event_end_date >= (now() at time zone 'America/Sao_Paulo')::date
  )
$$;

grant execute on function public.advertisement_event_is_public(uuid, uuid) to anon, authenticated;

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
    or public.advertisement_event_is_public(advertisements.event_id, advertisements.city_id)
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
      or public.advertisement_event_is_public(advertisements.event_id, advertisements.city_id)
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

notify pgrst, 'reload schema';
