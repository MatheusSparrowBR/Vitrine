create extension if not exists pgcrypto;

create type public.user_role as enum ('user','business_owner','admin');
create type public.business_status as enum ('pending','active','suspended','rejected');
create type public.post_type as enum ('promotion','news','event','community','business','general');
create type public.post_status as enum ('draft','pending_review','published','archived','rejected');
create type public.submission_status as enum ('pending','approved','rejected');
create type public.plan_code as enum ('free','pro','premium');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cities (
  id uuid primary key default gen_random_uuid(), name text not null, state text not null, slug text not null unique,
  country text not null default 'Brasil', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(name,state,country)
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, icon text,
  description text, active boolean not null default true, sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table public.businesses (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete restrict,
  city_id uuid not null references public.cities(id) on delete restrict, category_id uuid references public.categories(id) on delete set null,
  name text not null, slug text not null, description text, short_description text, logo_url text, cover_url text,
  phone text, whatsapp text, website_url text, instagram_url text, facebook_url text, address text, neighborhood text,
  latitude double precision, longitude double precision, opening_hours jsonb not null default '{}'::jsonb,
  status public.business_status not null default 'pending', verified boolean not null default false, featured boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(city_id,slug)
);
create table public.business_photos (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  url text not null, alt_text text, sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table public.business_items (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null check (type in ('product','service')), name text not null, description text, price numeric(12,2), image_url text,
  active boolean not null default true, sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.promotions (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null, description text, image_url text, price numeric(12,2), original_price numeric(12,2), starts_at timestamptz, ends_at timestamptz,
  status public.post_status not null default 'draft', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.posts (
  id uuid primary key default gen_random_uuid(), author_id uuid references public.profiles(id) on delete set null,
  city_id uuid references public.cities(id) on delete set null, business_id uuid references public.businesses(id) on delete cascade,
  type public.post_type not null default 'general', title text not null, content text, image_url text, video_url text,
  hashtags text[] not null default '{}', status public.post_status not null default 'draft', published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.community_submissions (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete set null,
  city_id uuid not null references public.cities(id) on delete restrict, title text, description text, image_url text, video_url text,
  status public.submission_status not null default 'pending', reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz, created_at timestamptz not null default now()
);
create table public.plans (
  id uuid primary key default gen_random_uuid(), code public.plan_code not null unique, name text not null,
  price_monthly numeric(12,2) not null default 0, features jsonb not null default '{}'::jsonb, active boolean not null default true, created_at timestamptz not null default now()
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict, business_id uuid references public.businesses(id) on delete cascade,
  status text not null default 'active', started_at timestamptz not null default now(), ends_at timestamptz,
  external_customer_id text, external_subscription_id text, created_at timestamptz not null default now(), unique(user_id,business_id)
);
create table public.advertisements (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  city_id uuid not null references public.cities(id) on delete restrict, title text not null, description text, image_url text, target_url text,
  starts_at timestamptz, ends_at timestamptz, active boolean not null default true, created_at timestamptz not null default now()
);
create table public.analytics_events (
  id bigint generated always as identity primary key, city_id uuid references public.cities(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null, post_id uuid references public.posts(id) on delete set null,
  event_type text not null, session_id text, user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index businesses_city_status_idx on public.businesses(city_id,status);
create index businesses_category_idx on public.businesses(category_id);
create index businesses_owner_idx on public.businesses(owner_id);
create index business_photos_business_idx on public.business_photos(business_id);
create index business_items_business_idx on public.business_items(business_id);
create index promotions_business_status_idx on public.promotions(business_id,status);
create index promotions_dates_idx on public.promotions(starts_at,ends_at);
create index posts_city_status_idx on public.posts(city_id,status,published_at desc);
create index posts_business_idx on public.posts(business_id,status,published_at desc);
create index submissions_city_status_idx on public.community_submissions(city_id,status,created_at desc);
create index subscriptions_user_idx on public.subscriptions(user_id);
create index subscriptions_business_idx on public.subscriptions(business_id);
create index ads_city_dates_idx on public.advertisements(city_id,active,starts_at,ends_at);
create index analytics_business_created_idx on public.analytics_events(business_id,created_at desc);

alter table public.profiles enable row level security;
alter table public.cities enable row level security;
alter table public.categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_photos enable row level security;
alter table public.business_items enable row level security;
alter table public.promotions enable row level security;
alter table public.posts enable row level security;\alter table public.community_submissions enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.advertisements enable row level security;
alter table public.analytics_events enable row level security;

revoke all on table public.profiles,public.cities,public.categories,public.businesses,public.business_photos,public.business_items,public.promotions,public.posts,public.community_submissions,public.plans,public.subscriptions,public.advertisements,public.analytics_events from anon,authenticated;
grant select on public.cities,public.categories,public.businesses,public.business_photos,public.business_items,public.promotions,public.posts,public.plans,public.advertisements to anon,authenticated;
grant select,insert,update on public.profiles to authenticated;
grant insert,update,delete on public.businesses,public.business_photos,public.business_items,public.promotions,public.posts to authenticated;
grant insert on public.community_submissions,public.analytics_events to anon,authenticated;
grant select,insert,update,delete on public.community_submissions,public.subscriptions to authenticated;

create policy "public read active cities" on public.cities for select to anon,authenticated using (active=true);
create policy "public read active categories" on public.categories for select to anon,authenticated using (active=true);
create policy "public read active businesses" on public.businesses for select to anon,authenticated using (status='active');
create policy "public read business photos" on public.business_photos for select to anon,authenticated using (exists(select 1 from public.businesses b where b.id=business_id and b.status='active'));
create policy "public read active business items" on public.business_items for select to anon,authenticated using (active=true and exists(select 1 from public.businesses b where b.id=business_id and b.status='active'));
create policy "public read published promotions" on public.promotions for select to anon,authenticated using (status='published' and (ends_at is null or ends_at>=now()));
create policy "public read published posts" on public.posts for select to anon,authenticated using (status='published');
create policy "public read active plans" on public.plans for select to anon,authenticated using (active=true);
create policy "public read active ads" on public.advertisements for select to anon,authenticated using (active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()));
create policy "users read own profile" on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy "users insert own profile" on public.profiles for insert to authenticated with check ((select auth.uid())=id);
create policy "users update own profile" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy "owners insert businesses" on public.businesses for insert to authenticated with check ((select auth.uid())=owner_id);
create policy "owners update businesses" on public.businesses for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy "owners delete businesses" on public.businesses for delete to authenticated using ((select auth.uid())=owner_id);
create policy "owners manage business photos" on public.business_photos for all to authenticated using (exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()))) with check (exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy "owners manage business items" on public.business_items for all to authenticated using (exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()))) with check (exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy "owners manage promotions" on public.promotions for all to authenticated using (exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()))) with check (exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy "authors manage posts" on public.posts for all to authenticated using ((select auth.uid())=author_id) with check ((select auth.uid())=author_id);
create policy "users submit community" on public.community_submissions for insert to authenticated with check ((select auth.uid())=user_id);
create policy "anonymous submit community" on public.community_submissions for insert to anon with check (user_id is null);
create policy "users read own submissions" on public.community_submissions for select to authenticated using ((select auth.uid())=user_id);
create policy "users delete own submissions" on public.community_submissions for delete to authenticated using ((select auth.uid())=user_id);
create policy "users read own subscriptions" on public.subscriptions for select to authenticated using ((select auth.uid())=user_id);
create policy "users insert own subscriptions" on public.subscriptions for insert to authenticated with check ((select auth.uid())=user_id);
create policy "users update own subscriptions" on public.subscriptions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "users delete own subscriptions" on public.subscriptions for delete to authenticated using ((select auth.uid())=user_id);
create policy "anonymous analytics insert" on public.analytics_events for insert to anon with check (user_id is null);
create policy "authenticated analytics insert" on public.analytics_events for insert to authenticated with check ((select auth.uid())=user_id or user_id is null);

create or replace function public.handle_new_user() returns trigger language plpgsql security invoker set search_path=public as $$ begin
  insert into public.profiles(id,full_name,avatar_url) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'),new.raw_user_meta_data->>'avatar_url') on conflict(id) do nothing;
  return new;
end; $$;
revoke execute on function public.handle_new_user() from public,anon,authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.cities(name,state,slug) values('Laguna','SC','laguna') on conflict(slug) do nothing;
insert into public.categories(name,slug,icon,sort_order) values
('Restaurantes','restaurantes','utensils',1),('Lojas','lojas','shopping-bag',2),('Serviços','servicos','briefcase',3),('Saúde','saude','heart-pulse',4),('Beleza','beleza','sparkles',5),('Turismo','turismo','map',6),('Automóveis','automoveis','car',7),('Imóveis','imoveis','home',8),('Pets','pets','paw-print',9),('Outros','outros','grid-2x2',10) on conflict(slug) do nothing;
insert into public.plans(code,name,price_monthly,features) values
('free','Grátis',0,'{"business_profile":true,"photos":5,"ai_posts":3,"featured":false}'::jsonb),
('pro','Pro',29.90,'{"business_profile":true,"photos":30,"ai_posts":30,"featured":true,"analytics":true}'::jsonb),
('premium','Premium',59.90,'{"business_profile":true,"photos":100,"ai_posts":100,"featured":true,"city_instagram":true,"advanced_analytics":true}'::jsonb) on conflict(code) do nothing;
