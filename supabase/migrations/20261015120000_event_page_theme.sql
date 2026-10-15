-- Página personalizada de evento (eventos patrocinados). Só o admin edita.

alter table public.events add column if not exists page_theme jsonb;
alter table public.events add column if not exists page_slug text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.events'::regclass and conname = 'events_page_slug_format_check'
  ) then
    alter table public.events
      add constraint events_page_slug_format_check
      check (page_slug is null or page_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(page_slug) between 3 and 60);
  end if;
end $$;

-- Endereço próprio: único por cidade (ex.: /laguna/evento/carnaval-2027).
create unique index if not exists events_city_page_slug_uidx
  on public.events (city_id, page_slug)
  where page_slug is not null;

-- Empresas podem editar os próprios eventos em análise; o tema e o endereço próprio continuam só do admin.
create or replace function public.protect_event_page_theme()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Sem usuário (service role) ou admin: pode tudo.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.page_theme := null;
    new.page_slug := null;
  else
    new.page_theme := old.page_theme;
    new.page_slug := old.page_slug;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_event_page_theme() from public, anon, authenticated;

drop trigger if exists events_protect_page_theme on public.events;
create trigger events_protect_page_theme
before insert or update on public.events
for each row execute function public.protect_event_page_theme();
