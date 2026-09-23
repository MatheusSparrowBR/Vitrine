create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  promotion_id uuid references public.promotions(id) on delete set null,
  title text not null,
  body text not null,
  image_url text,
  url text,
  type text not null default 'general',
  status text not null default 'queued',
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('general', 'promotion', 'business', 'system')),
  constraint notifications_status_check check (status in ('queued', 'sent', 'delivered', 'failed'))
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;

create index if not exists notifications_promotion_idx
  on public.notifications(promotion_id)
  where promotion_id is not null;

create index if not exists notifications_business_idx
  on public.notifications(business_id)
  where business_id is not null;

create or replace function public.set_notifications_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at
before update on public.notifications
for each row
execute function public.set_notifications_updated_at();

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
on public.notifications
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
on public.notifications
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke insert, delete on public.notifications from authenticated;
