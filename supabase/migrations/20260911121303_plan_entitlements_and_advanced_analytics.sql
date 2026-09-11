-- Paid-plan entitlements and Premium-only advanced analytics.

create or replace function public.sync_business_plan_entitlements(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
begin
  if p_business_id is null then return; end if;
  update public.businesses b
     set verified = coalesce(public.plan_feature_enabled(b.id, 'verified'), false),
         featured = coalesce(public.plan_feature_enabled(b.id, 'featured'), false),
         updated_at = now()
   where b.id = p_business_id;
end;
$function$;

create or replace function public.sync_business_plan_entitlements_from_subscription()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
begin
  perform public.sync_business_plan_entitlements(coalesce(new.business_id, old.business_id));
  return coalesce(new, old);
end;
$function$;

drop trigger if exists trg_sync_business_plan_entitlements on public.subscriptions;
create trigger trg_sync_business_plan_entitlements
after insert or update of business_id, plan_id, status, started_at, ends_at or delete
on public.subscriptions
for each row execute function public.sync_business_plan_entitlements_from_subscription();

update public.businesses b
   set verified = coalesce(public.plan_feature_enabled(b.id, 'verified'), false),
       featured = coalesce(public.plan_feature_enabled(b.id, 'featured'), false),
       updated_at = now();

create or replace function public.enforce_paid_business_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
begin
  if coalesce(public.plan_feature_enabled(new.id, 'verified'), false) then
    new.verified := true;
  elsif coalesce(new.verified, false) then
    raise exception 'Selo de verificação disponível apenas nos planos Pro e Premium.' using errcode = 'check_violation';
  end if;
  if coalesce(public.plan_feature_enabled(new.id, 'featured'), false) then
    new.featured := true;
  elsif coalesce(new.featured, false) then
    raise exception 'Destaque nas buscas disponível apenas nos planos Pro e Premium.' using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_enforce_paid_business_entitlements on public.businesses;
create trigger trg_enforce_paid_business_entitlements
before insert or update of verified, featured
on public.businesses
for each row execute function public.enforce_paid_business_entitlements();

create or replace function public.get_business_advanced_analytics(
  p_business_id uuid,
  p_days integer default 30
)
returns table(
  profile_views bigint,
  unique_visitors bigint,
  whatsapp_clicks bigint,
  instagram_clicks bigint,
  website_clicks bigint,
  total_contacts bigint,
  promotion_clicks bigint,
  event_clicks bigint,
  gallery_opens bigint,
  engaged_interactions bigint,
  engagement_rate numeric,
  previous_profile_views bigint,
  previous_unique_visitors bigint,
  previous_contacts bigint,
  daily jsonb,
  channels jsonb
)
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_start date := v_today - (v_days - 1);
  v_prev_start date := v_start - v_days;
  v_prev_end date := v_start - 1;
  v_start_ts timestamptz := v_start::timestamp at time zone 'America/Sao_Paulo';
  v_end_ts timestamptz := (v_today + 1)::timestamp at time zone 'America/Sao_Paulo';
  v_prev_start_ts timestamptz := v_prev_start::timestamp at time zone 'America/Sao_Paulo';
  v_prev_end_ts timestamptz := (v_prev_end + 1)::timestamp at time zone 'America/Sao_Paulo';
  v_is_admin boolean := coalesce(private.is_admin(), false);
begin
  if not exists (select 1 from public.businesses b where b.id = p_business_id and (b.owner_id = auth.uid() or v_is_admin)) then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if not v_is_admin and not coalesce(public.plan_feature_enabled(p_business_id, 'advanced_analytics'), false) then
    raise exception 'Estatísticas avançadas estão disponíveis apenas no plano Premium.' using errcode = 'check_violation';
  end if;
  return query
  with current_events as (
    select e.event_type,e.session_id,e.created_at
      from public.analytics_events e
     where e.business_id=p_business_id and e.created_at>=v_start_ts and e.created_at<v_end_ts
  ), previous_events as (
    select e.event_type,e.session_id,e.created_at
      from public.analytics_events e
     where e.business_id=p_business_id and e.created_at>=v_prev_start_ts and e.created_at<v_prev_end_ts
  ), daily_rows as (
    select gs.day::date as day,
           count(ce.*) filter(where ce.event_type='profile_view') as profile_views,
           count(distinct ce.session_id) filter(where ce.event_type='profile_view' and ce.session_id is not null) as unique_visitors,
           count(ce.*) filter(where ce.event_type in ('whatsapp_click','instagram_click','website_click')) as contacts,
           count(ce.*) filter(where ce.event_type in ('whatsapp_click','instagram_click','website_click','promotion_click','event_click','gallery_open','share_click','save_click','business_click')) as engaged_interactions
      from generate_series(v_start,v_today,interval '1 day') gs(day)
      left join current_events ce on (ce.created_at at time zone 'America/Sao_Paulo')::date=gs.day::date
     group by gs.day order by gs.day
  ), current_totals as (
    select count(*) filter(where event_type='profile_view') as profile_views,
           count(distinct session_id) filter(where event_type='profile_view' and session_id is not null) as unique_visitors,
           count(*) filter(where event_type='whatsapp_click') as whatsapp_clicks,
           count(*) filter(where event_type='instagram_click') as instagram_clicks,
           count(*) filter(where event_type='website_click') as website_clicks,
           count(*) filter(where event_type in ('whatsapp_click','instagram_click','website_click')) as total_contacts,
           count(*) filter(where event_type='promotion_click') as promotion_clicks,
           count(*) filter(where event_type='event_click') as event_clicks,
           count(*) filter(where event_type='gallery_open') as gallery_opens,
           count(*) filter(where event_type in ('whatsapp_click','instagram_click','website_click','promotion_click','event_click','gallery_open','share_click','save_click','business_click')) as engaged_interactions
      from current_events
  ), previous_totals as (
    select count(*) filter(where event_type='profile_view') as profile_views,
           count(distinct session_id) filter(where event_type='profile_view' and session_id is not null) as unique_visitors,
           count(*) filter(where event_type in ('whatsapp_click','instagram_click','website_click')) as contacts
      from previous_events
  )
  select ct.profile_views,ct.unique_visitors,ct.whatsapp_clicks,ct.instagram_clicks,ct.website_clicks,ct.total_contacts,ct.promotion_clicks,ct.event_clicks,ct.gallery_opens,ct.engaged_interactions,
         round((ct.total_contacts::numeric/nullif(ct.profile_views,0))*100,1),pt.profile_views,pt.unique_visitors,pt.contacts,
         coalesce((select jsonb_agg(jsonb_build_object('day',dr.day,'profile_views',dr.profile_views,'unique_visitors',dr.unique_visitors,'contacts',dr.contacts,'engaged_interactions',dr.engaged_interactions) order by dr.day) from daily_rows dr),'[]'::jsonb),
         jsonb_build_object('whatsapp',ct.whatsapp_clicks,'instagram',ct.instagram_clicks,'website',ct.website_clicks)
    from current_totals ct cross join previous_totals pt;
end;
$function$;

revoke all on function public.sync_business_plan_entitlements(uuid) from public;
revoke all on function public.sync_business_plan_entitlements_from_subscription() from public;
revoke all on function public.enforce_paid_business_entitlements() from public;
revoke all on function public.get_business_advanced_analytics(uuid,integer) from public;
grant execute on function public.get_business_advanced_analytics(uuid,integer) to authenticated;
