create table if not exists public.business_needs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text not null default 'grid',
  description text,
  sort_order integer not null default 0 check (sort_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.category_needs (
  category_id uuid not null references public.categories(id) on delete cascade,
  need_id uuid not null references public.business_needs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (category_id, need_id)
);

create index if not exists idx_business_needs_active_order
  on public.business_needs(active, sort_order, name);

create index if not exists idx_category_needs_need
  on public.category_needs(need_id, category_id);

alter table public.business_needs enable row level security;
alter table public.category_needs enable row level security;

drop policy if exists "public read active business needs" on public.business_needs;
create policy "public read active business needs"
  on public.business_needs for select
  using (active = true);

drop policy if exists "admins manage business needs" on public.business_needs;
create policy "admins manage business needs"
  on public.business_needs for all
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "public read category needs" on public.category_needs;
create policy "public read category needs"
  on public.category_needs for select
  using (
    exists (
      select 1
      from public.business_needs n
      where n.id = category_needs.need_id
        and n.active = true
    )
  );

drop policy if exists "admins manage category needs" on public.category_needs;
create policy "admins manage category needs"
  on public.category_needs for all
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

insert into public.business_needs (name, slug, icon, description, sort_order, active)
values
  ('Quero comer', 'quero-comer', 'store', 'Restaurantes, pizzarias, padarias, lanchonetes, cafeterias, doces e outras opções de alimentação.', 1, true),
  ('Quero comprar', 'quero-comprar', 'bag', 'Mercados, lojas, conveniências e outros estabelecimentos para compras.', 2, true),
  ('Preciso resolver', 'preciso-resolver', 'wrench', 'Serviços, automóveis, assistência, manutenção e profissionais locais.', 3, true),
  ('Quero cuidar de mim', 'quero-cuidar-de-mim', 'heart', 'Saúde, beleza, academia, estética e bem-estar.', 4, true)
on conflict (slug) do update set
  name = excluded.name,
  icon = excluded.icon,
  description = excluded.description,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();

insert into public.category_needs (category_id, need_id)
select c.id, n.id
from public.categories c
join public.business_needs n on n.slug = 'quero-comer'
where c.slug in ('restaurantes','pizzaria','hamburgueria','lanchonete','cafeteria','padaria','doceria','sorveteria')
on conflict do nothing;

insert into public.category_needs (category_id, need_id)
select c.id, n.id
from public.categories c
join public.business_needs n on n.slug = 'quero-comprar'
where c.slug in ('supermercado','lojas','conveniencia')
on conflict do nothing;

insert into public.category_needs (category_id, need_id)
select c.id, n.id
from public.categories c
join public.business_needs n on n.slug = 'preciso-resolver'
where c.slug in ('servicos','internet','automoveis')
on conflict do nothing;

insert into public.category_needs (category_id, need_id)
select c.id, n.id
from public.categories c
join public.business_needs n on n.slug = 'quero-cuidar-de-mim'
where c.slug in ('saude','beleza','academia')
on conflict do nothing;

