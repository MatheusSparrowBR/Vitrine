begin;

-- Índice para os filtros por período do analytics (antes só havia índice por empresa + data).
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at);

-- Resumo do painel de analytics calculado no banco, com comparação com o período anterior.
-- Dias em horário de São Paulo. Só administradores.
create or replace function public.admin_analytics_overview(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_tz constant text := 'America/Sao_Paulo';
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
  v_today date := (now() at time zone v_tz)::date;
  v_cur_start date;
  v_prev_start date;
  v_cur_ts timestamptz;
  v_prev_ts timestamptz;
  v_end_ts timestamptz;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  v_cur_start := v_today - (v_days - 1);
  v_prev_start := v_cur_start - v_days;
  v_cur_ts := v_cur_start::timestamp at time zone v_tz;
  v_prev_ts := v_prev_start::timestamp at time zone v_tz;
  v_end_ts := (v_today + 1)::timestamp at time zone v_tz;

  select jsonb_build_object(
    'period', jsonb_build_object('days', v_days, 'start', v_cur_start, 'end', v_today),

    -- Contagem por tipo de evento, período atual e anterior.
    'totals', jsonb_build_object(
      'current', (select coalesce(jsonb_object_agg(t.event_type, t.n), '{}'::jsonb)
                  from (select e.event_type, count(*) as n from public.analytics_events e
                        where e.created_at >= v_cur_ts and e.created_at < v_end_ts group by e.event_type) t),
      'previous', (select coalesce(jsonb_object_agg(t.event_type, t.n), '{}'::jsonb)
                   from (select e.event_type, count(*) as n from public.analytics_events e
                         where e.created_at >= v_prev_ts and e.created_at < v_cur_ts group by e.event_type) t)
    ),

    -- Uma linha por dia do período atual (dias sem evento aparecem com zero).
    'daily', (select coalesce(jsonb_agg(jsonb_build_object(
                'day', d.day::date,
                'page_views', d.pv,
                'profile_views', d.pw,
                'contacts', d.ct,
                'business_clicks', d.bc,
                'banner_impressions', d.bi
              ) order by d.day), '[]'::jsonb)
              from (select g.day,
                      count(e.id) filter (where e.event_type = 'page_view') as pv,
                      count(e.id) filter (where e.event_type = 'profile_view') as pw,
                      count(e.id) filter (where e.event_type in ('whatsapp_click', 'instagram_click', 'website_click')) as ct,
                      count(e.id) filter (where e.event_type = 'business_click') as bc,
                      count(e.id) filter (where e.event_type = 'banner_impression') as bi
                    from generate_series(v_cur_start::timestamp, v_today::timestamp, interval '1 day') as g(day)
                    left join public.analytics_events e
                      on e.created_at >= (g.day at time zone v_tz)
                     and e.created_at < ((g.day + interval '1 day') at time zone v_tz)
                    group by g.day) d),

    -- Empresas com mais movimento no período.
    'top_businesses', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', x.id, 'name', x.name, 'total', x.total, 'views', x.views,
                'contacts', x.contacts, 'engagement', x.engagement
              ) order by x.total desc), '[]'::jsonb)
              from (select b.id, b.name,
                      count(*) as total,
                      count(*) filter (where e.event_type = 'profile_view') as views,
                      count(*) filter (where e.event_type in ('whatsapp_click', 'instagram_click', 'website_click')) as contacts,
                      count(*) filter (where e.event_type in ('business_click', 'promotion_click', 'event_click', 'save_click', 'share_click', 'gallery_open')) as engagement
                    from public.analytics_events e
                    join public.businesses b on b.id = e.business_id
                    where e.created_at >= v_cur_ts and e.created_at < v_end_ts
                    group by b.id, b.name
                    order by total desc
                    limit 10) x),

    -- Categorias mais buscadas pelo público.
    'top_categories', (select coalesce(jsonb_agg(jsonb_build_object('category', x.category, 'count', x.n) order by x.n desc), '[]'::jsonb)
                       from (select e.metadata->>'category' as category, count(*) as n
                             from public.analytics_events e
                             where e.event_type = 'category_click'
                               and e.created_at >= v_cur_ts and e.created_at < v_end_ts
                               and coalesce(e.metadata->>'category', '') <> ''
                             group by e.metadata->>'category'
                             order by n desc
                             limit 10) x),

    -- Anúncios em banner: impressões e cliques no período.
    'banners', (select jsonb_build_object(
                  'impressions', count(*) filter (where e.event_type = 'banner_impression'),
                  'clicks', count(*) filter (where e.event_type = 'banner_click'))
                from public.analytics_events e
                where e.event_type in ('banner_impression', 'banner_click')
                  and e.created_at >= v_cur_ts and e.created_at < v_end_ts),
    'top_banners', (select coalesce(jsonb_agg(jsonb_build_object(
                      'id', x.id, 'title', x.title, 'impressions', x.imp, 'clicks', x.clk
                    ) order by x.clk desc, x.imp desc), '[]'::jsonb)
                    from (select a.id, a.title,
                            count(*) filter (where e.event_type = 'banner_impression') as imp,
                            count(*) filter (where e.event_type = 'banner_click') as clk
                          from public.analytics_events e
                          join public.advertisements a
                            on a.id = case when e.metadata->>'advertisement_id' ~ '^[0-9a-fA-F-]{36}$'
                                           then (e.metadata->>'advertisement_id')::uuid end
                          where e.event_type in ('banner_impression', 'banner_click')
                            and e.created_at >= v_cur_ts and e.created_at < v_end_ts
                          group by a.id, a.title
                          order by clk desc, imp desc
                          limit 5) x),

    -- Crescimento: novos cadastros e publicações, atual e anterior.
    'growth', jsonb_build_object(
      'businesses', (select jsonb_build_object(
                       'current', count(*) filter (where t.created_at >= v_cur_ts),
                       'previous', count(*) filter (where t.created_at >= v_prev_ts and t.created_at < v_cur_ts))
                     from public.businesses t where t.created_at >= v_prev_ts and t.created_at < v_end_ts),
      'users', (select jsonb_build_object(
                  'current', count(*) filter (where t.created_at >= v_cur_ts),
                  'previous', count(*) filter (where t.created_at >= v_prev_ts and t.created_at < v_cur_ts))
                from public.profiles t where t.created_at >= v_prev_ts and t.created_at < v_end_ts),
      'reviews', (select jsonb_build_object(
                    'current', count(*) filter (where t.created_at >= v_cur_ts),
                    'previous', count(*) filter (where t.created_at >= v_prev_ts and t.created_at < v_cur_ts))
                  from public.business_reviews t where t.created_at >= v_prev_ts and t.created_at < v_end_ts),
      'events', (select jsonb_build_object(
                   'current', count(*) filter (where t.created_at >= v_cur_ts),
                   'previous', count(*) filter (where t.created_at >= v_prev_ts and t.created_at < v_cur_ts))
                 from public.events t where t.created_at >= v_prev_ts and t.created_at < v_end_ts)
    ),

    -- Operação: empresas ativas, assinaturas e receita recorrente estimada.
    'businesses_active', (select count(*) from public.businesses b where b.status = 'active'),
    'subscriptions', (select jsonb_build_object(
                        'active', count(*),
                        'mrr', coalesce(sum(case when s.billing_interval = 'yearly'
                                                 then coalesce(p.price_yearly, 0) / 12
                                                 else coalesce(p.price_monthly, 0) end), 0))
                      from public.subscriptions s
                      left join public.plans p on p.id = s.plan_id
                      where s.status in ('active', 'trialing')),

    -- Instalações do app (PWA).
    'pwa', (select jsonb_build_object(
              'total', count(*),
              'current', count(*) filter (where e.created_at >= v_cur_ts and e.created_at < v_end_ts),
              'previous', count(*) filter (where e.created_at >= v_prev_ts and e.created_at < v_cur_ts))
            from public.analytics_events e
            where e.event_type = 'pwa_install')
  ) into v_result;

  return v_result;
end
$fn$;

revoke all on function public.admin_analytics_overview(integer) from public, anon;
grant execute on function public.admin_analytics_overview(integer) to authenticated;

commit;

notify pgrst, 'reload schema';
