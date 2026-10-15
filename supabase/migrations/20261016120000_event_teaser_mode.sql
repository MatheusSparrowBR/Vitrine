-- Modo "Em breve": o evento aparece na agenda, mas os detalhes ficam escondidos até a revelação.
-- Enquanto o modo está ativo, o público não lê a linha do evento; só a visão public_event_teasers,
-- que expõe título, imagem e a configuração da página Em breve.

alter table public.events add column if not exists teaser_enabled boolean not null default false;
alter table public.events add column if not exists teaser_auto_reveal boolean not null default true;
alter table public.events add column if not exists teaser_reveal_at timestamptz;
alter table public.events add column if not exists teaser jsonb;
alter table public.events add column if not exists teaser_reveal_notified_at timestamptz;
-- Quando o modo foi ligado: só eventos que estiveram escondidos geram aviso de revelação.
alter table public.events add column if not exists teaser_started_at timestamptz;

-- O modo está ativo quando ligado e ainda não chegou a hora da revelação automática.
create or replace function public.event_teaser_active(p_enabled boolean, p_auto boolean, p_reveal_at timestamptz)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(p_enabled, false)
    and (not coalesce(p_auto, true) or p_reveal_at is null or p_reveal_at > now())
$$;

grant execute on function public.event_teaser_active(boolean, boolean, timestamptz) to anon, authenticated;

drop policy if exists "public read future active events" on public.events;
drop policy if exists "authenticated read future active events or admin" on public.events;

create policy "public read future active events"
on public.events for select
to anon
using (
  active = true and review_status = 'approved' and event_end_date >= current_date
  and not public.event_teaser_active(teaser_enabled, teaser_auto_reveal, teaser_reveal_at)
);

create policy "authenticated read future active events or admin"
on public.events for select
to authenticated
using (
  (
    active = true and review_status = 'approved' and event_end_date >= current_date
    and not public.event_teaser_active(teaser_enabled, teaser_auto_reveal, teaser_reveal_at)
  )
  or public.is_admin()
  or exists (select 1 from public.businesses b where b.id = events.business_id and b.owner_id = (select auth.uid()))
);

-- Dados públicos dos eventos em modo Em breve. Sem descrição, local, preço, data ou horário.
create or replace view public.public_event_teasers
with (security_invoker = false)
as
select
  e.id,
  e.city_id,
  e.title,
  e.image_url,
  e.category,
  e.page_slug,
  e.teaser,
  e.teaser_reveal_at,
  e.teaser_auto_reveal
from public.events e
where e.active = true
  and e.review_status = 'approved'
  and e.event_end_date >= current_date
  and public.event_teaser_active(e.teaser_enabled, e.teaser_auto_reveal, e.teaser_reveal_at);

grant select on table public.public_event_teasers to anon, authenticated;

-- "Me avise" salva o evento mesmo em modo Em breve (o usuário não lê a linha do evento nesse período).
create or replace function public.event_is_savable(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and e.active = true and e.review_status = 'approved' and e.event_end_date >= current_date
  )
$$;

revoke all on function public.event_is_savable(uuid) from public;
grant execute on function public.event_is_savable(uuid) to authenticated;

drop policy if exists event_favorites_insert_own on public.event_favorites;
create policy event_favorites_insert_own
  on public.event_favorites
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.event_is_savable(event_id));

-- Empresas não alteram tema, endereço próprio nem o modo Em breve dos eventos delas.
create or replace function public.protect_event_page_theme()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Ligar o modo Em breve registra o início e libera um novo aviso de revelação.
  if new.teaser_enabled and (tg_op = 'INSERT' or not coalesce(old.teaser_enabled, false)) then
    new.teaser_started_at := now();
    new.teaser_reveal_notified_at := null;
  end if;
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.page_theme := null;
    new.page_slug := null;
    new.teaser_enabled := false;
    new.teaser_auto_reveal := true;
    new.teaser_reveal_at := null;
    new.teaser := null;
    new.teaser_reveal_notified_at := null;
    new.teaser_started_at := null;
  else
    new.page_theme := old.page_theme;
    new.page_slug := old.page_slug;
    new.teaser_enabled := old.teaser_enabled;
    new.teaser_auto_reveal := old.teaser_auto_reveal;
    new.teaser_reveal_at := old.teaser_reveal_at;
    new.teaser := old.teaser;
    new.teaser_reveal_notified_at := old.teaser_reveal_notified_at;
    new.teaser_started_at := old.teaser_started_at;
  end if;
  return new;
end;
$$;
