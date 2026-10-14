-- Eventos: empresa ligada, envio por empresas (com aprovação do admin), contador de interessados e lembretes.

alter table public.events add column if not exists business_id uuid references public.businesses(id) on delete set null;
alter table public.events add column if not exists review_status text not null default 'approved';
alter table public.events add column if not exists submitted_by uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.events'::regclass and conname = 'events_review_status_check'
  ) then
    alter table public.events
      add constraint events_review_status_check check (review_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists events_business_end_date_idx
  on public.events (business_id, event_end_date)
  where business_id is not null;

-- Verifica no servidor se o plano efetivo da empresa permite publicar eventos.
create or replace function public.business_plan_allows_events(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.plans p
    where p.id = public.get_effective_plan_id(p_business_id)
      and coalesce((p.features ->> 'event_publishing')::boolean, false)
  )
$$;

revoke all on function public.business_plan_allows_events(uuid) from public;
grant execute on function public.business_plan_allows_events(uuid) to anon, authenticated;

-- Leitura pública: só eventos aprovados e ativos que ainda não terminaram.
-- Usa a data final: antes, um evento de vários dias sumia a partir do segundo dia.
drop policy if exists "public read future active events" on public.events;
drop policy if exists "authenticated read future active events or admin" on public.events;

create policy "public read future active events"
on public.events for select
to anon
using (active = true and review_status = 'approved' and event_end_date >= current_date);

create policy "authenticated read future active events or admin"
on public.events for select
to authenticated
using (
  (active = true and review_status = 'approved' and event_end_date >= current_date)
  or public.is_admin()
  or exists (select 1 from public.businesses b where b.id = events.business_id and b.owner_id = (select auth.uid()))
);

-- Empresas com o recurso enviam eventos para análise. Nunca publicam nem destacam sozinhas.
drop policy if exists "owners submit events" on public.events;
create policy "owners submit events"
on public.events for insert
to authenticated
with check (
  events.business_id is not null
  and exists (
    select 1 from public.businesses b
    where b.id = events.business_id and b.owner_id = (select auth.uid()) and b.city_id = events.city_id
  )
  and public.business_plan_allows_events(events.business_id)
  and events.active = false
  and events.featured = false
  and events.review_status = 'pending'
);

drop policy if exists "owners edit pending events" on public.events;
create policy "owners edit pending events"
on public.events for update
to authenticated
using (
  events.review_status in ('pending', 'rejected')
  and exists (select 1 from public.businesses b where b.id = events.business_id and b.owner_id = (select auth.uid()))
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = events.business_id and b.owner_id = (select auth.uid()) and b.city_id = events.city_id
  )
  and public.business_plan_allows_events(events.business_id)
  and events.active = false
  and events.featured = false
  and events.review_status = 'pending'
);

drop policy if exists "owners delete own events" on public.events;
create policy "owners delete own events"
on public.events for delete
to authenticated
using (exists (select 1 from public.businesses b where b.id = events.business_id and b.owner_id = (select auth.uid())));

-- Quantas pessoas salvaram um evento público. Não expõe quem salvou.
create or replace function public.event_interest_count(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int
  from public.event_favorites f
  join public.events e on e.id = f.event_id
  where f.event_id = p_event_id
    and e.active = true
    and e.review_status = 'approved'
$$;

revoke all on function public.event_interest_count(uuid) from public;
grant execute on function public.event_interest_count(uuid) to anon, authenticated;

-- Registro dos lembretes enviados, para não repetir o aviso. Usado só pela função agendada.
create table if not exists public.event_reminders_sent (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_reminders_sent enable row level security;
grant all on table public.event_reminders_sent to service_role;

-- Libera a publicação de eventos nos planos pagos.
update public.plans
set features = coalesce(features, '{}'::jsonb) || '{"event_publishing": true}'::jsonb
where code in ('pro', 'premium');
