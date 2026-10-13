-- Vagas de emprego no perfil da empresa (recurso dos planos Pro e Premium).

-- Verifica no servidor se o plano efetivo da empresa inclui vagas.
create or replace function public.business_plan_allows_jobs(p_business_id uuid)
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
      and coalesce((p.features ->> 'job_postings')::boolean, false)
  )
$$;

revoke all on function public.business_plan_allows_jobs(uuid) from public;
grant execute on function public.business_plan_allows_jobs(uuid) to anon, authenticated;

create table if not exists public.job_postings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text check (description is null or char_length(description) <= 1000),
  employment_type text not null default 'efetivo'
    check (employment_type in ('efetivo', 'temporario', 'freelance', 'estagio')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'published' check (status in ('published', 'paused', 'closed')),
  source text not null default 'owner' check (source in ('owner', 'admin')),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_postings_period_check check (ends_at > starts_at)
);

create index if not exists job_postings_business_status_idx
  on public.job_postings (business_id, status, ends_at);

alter table public.job_postings enable row level security;

-- Público vê só vagas publicadas, dentro do período, de empresa ativa e com plano que inclui vagas.
create policy "public read current job postings"
on public.job_postings for select
to anon, authenticated
using (
  status = 'published'
  and starts_at <= now()
  and ends_at > now()
  and public.business_plan_allows_jobs(business_id)
  and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'active')
);

-- Dono e admin gerenciam as vagas. Publicar exige plano com vagas; pausar ou encerrar não exige.
create policy "owners and admins manage job postings"
on public.job_postings for all
to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()))
)
with check (
  (
    public.is_admin()
    or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()))
  )
  and (status <> 'published' or public.business_plan_allows_jobs(business_id))
);

create table if not exists public.job_reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_postings(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null default auth.uid(),
  reason text not null check (char_length(reason) between 3 and 300),
  created_at timestamptz not null default now()
);

alter table public.job_reports enable row level security;

create policy "users report job postings"
on public.job_reports for insert
to authenticated
with check (reporter_id = (select auth.uid()));

create policy "admins read job reports"
on public.job_reports for select
to authenticated
using (public.is_admin());

create policy "admins resolve job reports"
on public.job_reports for delete
to authenticated
using (public.is_admin());

grant select on table public.job_postings to anon, authenticated;
grant insert, update, delete on table public.job_postings to authenticated;
grant insert, select, delete on table public.job_reports to authenticated;

-- Libera o recurso nos planos pagos.
update public.plans
set features = coalesce(features, '{}'::jsonb) || '{"job_postings": true}'::jsonb
where code in ('pro', 'premium');
