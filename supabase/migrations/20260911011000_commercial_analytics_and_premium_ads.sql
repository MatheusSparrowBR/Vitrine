update public.plans set features=jsonb_set(coalesce(features,'{}'::jsonb),'{premium_ads}',case when code='premium' then 'true'::jsonb else 'false'::jsonb end,true);

alter table public.advertisements add column if not exists monthly_price numeric(10,2) not null default 0;
alter table public.advertisements add column if not exists billing_status text not null default 'not_billed';
alter table public.advertisements add column if not exists billing_started_at timestamptz;
alter table public.advertisements add column if not exists billing_ends_at timestamptz;
alter table public.advertisements drop constraint if exists advertisements_billing_status_check;
alter table public.advertisements add constraint advertisements_billing_status_check check (billing_status in ('not_billed','pending','paid','overdue','canceled'));
alter table public.advertisements add constraint advertisements_monthly_price_check check (monthly_price >= 0);

create table if not exists public.advertising_requests (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  requested_placement text not null default 'home_banner', title text not null, description text, target_url text,
  desired_start_at timestamptz, desired_end_at timestamptz, monthly_budget numeric(10,2) not null default 0 check (monthly_budget >= 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','canceled')),
  admin_note text, reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists advertising_requests_business_idx on public.advertising_requests(business_id,created_at desc);
create index if not exists advertising_requests_status_idx on public.advertising_requests(status,created_at desc);
alter table public.advertising_requests enable row level security;
drop policy if exists "owners read own advertising requests" on public.advertising_requests;
drop policy if exists "owners create advertising requests" on public.advertising_requests;
drop policy if exists "admins read advertising requests" on public.advertising_requests;
drop policy if exists "admins update advertising requests" on public.advertising_requests;
create policy "owners read own advertising requests" on public.advertising_requests for select to authenticated using (exists(select 1 from public.businesses b where b.id=advertising_requests.business_id and b.owner_id=(select auth.uid())) or (select private.is_admin()));
create policy "owners create advertising requests" on public.advertising_requests for insert to authenticated with check (exists(select 1 from public.businesses b where b.id=advertising_requests.business_id and b.owner_id=(select auth.uid()) and private.business_has_feature(b.id,'premium_ads')));
create policy "admins read advertising requests" on public.advertising_requests for select to authenticated using ((select private.is_admin()));
create policy "admins update advertising requests" on public.advertising_requests for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create or replace function public.touch_advertising_request_updated_at() returns trigger language plpgsql set search_path=public,pg_temp as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists advertising_requests_set_updated_at on public.advertising_requests;
create trigger advertising_requests_set_updated_at before update on public.advertising_requests for each row execute function public.touch_advertising_request_updated_at();
revoke all on function public.touch_advertising_request_updated_at() from public,anon,authenticated;

create or replace function public.get_business_analytics_summary(p_business_id uuid, p_days integer default 30)
returns table(profile_views bigint,unique_visitors bigint,whatsapp_clicks bigint,instagram_clicks bigint,website_clicks bigint,promotion_clicks bigint,event_clicks bigint,gallery_opens bigint,banner_impressions bigint,banner_clicks bigint,total_interactions bigint,previous_profile_views bigint,previous_unique_visitors bigint,previous_whatsapp_clicks bigint)
language plpgsql stable set search_path=public,pg_temp as $$
declare v_days integer:=greatest(1,least(coalesce(p_days,30),365)); v_start timestamptz:=now()-make_interval(days=>v_days); v_prev_start timestamptz:=v_start-make_interval(days=>v_days); begin
 if not exists(select 1 from public.businesses b where b.id=p_business_id and (b.owner_id=(select auth.uid()) or (select private.is_admin()))) then raise exception 'Acesso negado.' using errcode='42501'; end if;
 return query select count(*) filter(where e.event_type='profile_view' and e.created_at>=v_start),count(distinct e.session_id) filter(where e.created_at>=v_start and e.session_id is not null),count(*) filter(where e.event_type='whatsapp_click' and e.created_at>=v_start),count(*) filter(where e.event_type='instagram_click' and e.created_at>=v_start),count(*) filter(where e.event_type='website_click' and e.created_at>=v_start),count(*) filter(where e.event_type='promotion_click' and e.created_at>=v_start),count(*) filter(where e.event_type='event_click' and e.created_at>=v_start),count(*) filter(where e.event_type='gallery_open' and e.created_at>=v_start),count(*) filter(where e.event_type='banner_impression' and e.created_at>=v_start),count(*) filter(where e.event_type='banner_click' and e.created_at>=v_start),count(*) filter(where e.created_at>=v_start),count(*) filter(where e.event_type='profile_view' and e.created_at>=v_prev_start and e.created_at<v_start),count(distinct e.session_id) filter(where e.created_at>=v_prev_start and e.created_at<v_start and e.session_id is not null),count(*) filter(where e.event_type='whatsapp_click' and e.created_at>=v_prev_start and e.created_at<v_start) from public.analytics_events e where e.business_id=p_business_id and e.created_at>=v_prev_start;
end; $$;
revoke all on function public.get_business_analytics_summary(uuid,integer) from public,anon;
grant execute on function public.get_business_analytics_summary(uuid,integer) to authenticated;
