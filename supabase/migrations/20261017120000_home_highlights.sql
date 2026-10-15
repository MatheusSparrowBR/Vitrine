-- Destaque de evento na home (faixa abaixo do topo ou topo da home). Só o admin cria.
-- A home mostra um destaque por vez: o ativo com início mais recente.

create table if not exists public.home_highlights (
  event_id uuid primary key references public.events(id) on delete cascade,
  city_id uuid not null references public.cities(id) on delete cascade,
  mode text not null default 'strip' check (mode in ('strip', 'hero')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_highlights_period_check check (ends_at > starts_at)
);

create index if not exists home_highlights_city_period_idx
  on public.home_highlights (city_id, starts_at desc, ends_at);

alter table public.home_highlights enable row level security;

-- Público vê só o que está dentro do período. Os dados do evento continuam protegidos pelas
-- regras do próprio evento (inclusive o modo Em breve).
drop policy if exists "public read active home highlights" on public.home_highlights;
create policy "public read active home highlights"
on public.home_highlights for select
to anon, authenticated
using (starts_at <= now() and ends_at > now());

drop policy if exists "admins manage home highlights" on public.home_highlights;
create policy "admins manage home highlights"
on public.home_highlights for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on table public.home_highlights to anon, authenticated;
grant insert, update, delete on table public.home_highlights to authenticated;
