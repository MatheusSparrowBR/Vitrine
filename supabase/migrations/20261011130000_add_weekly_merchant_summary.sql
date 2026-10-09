-- Resumo semanal por e-mail para o comerciante (opt-in por empresa).
alter table public.businesses
  add column if not exists weekly_summary_enabled boolean not null default false;

-- Agrega os eventos de analytics de cada empresa desde uma data.
-- Agregar no banco evita o limite de linhas da API ao contar muitos eventos.
create or replace function public.weekly_business_metrics(p_since timestamptz)
returns table(business_id uuid, visits bigint, promotion_clicks bigint, contact_clicks bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    e.business_id,
    count(*) filter (where e.event_type = 'profile_view'),
    count(*) filter (where e.event_type = 'promotion_click'),
    count(*) filter (where e.event_type in ('whatsapp_click','instagram_click','website_click','directions_click'))
  from public.analytics_events e
  where e.business_id is not null
    and e.created_at >= p_since
  group by e.business_id
$$;

revoke all on function public.weekly_business_metrics(timestamptz) from public, anon, authenticated;
grant execute on function public.weekly_business_metrics(timestamptz) to service_role;
