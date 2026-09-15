alter table public.plans
  add column if not exists mercadopago_plan_monthly_id text,
  add column if not exists mercadopago_plan_yearly_id text;

alter table public.subscriptions
  add column if not exists provider text not null default 'manual',
  add column if not exists billing_interval text,
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists provider_price_id text,
  add column if not exists provider_checkout_url text,
  add column if not exists external_reference text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists last_payment_id text,
  add column if not exists last_payment_status text,
  add column if not exists last_payment_at timestamptz,
  add column if not exists provider_status text;

create unique index if not exists subscriptions_provider_subscription_uidx
  on public.subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;
create index if not exists subscriptions_business_provider_status_idx
  on public.subscriptions(business_id, provider, status);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);
create unique index if not exists billing_events_provider_event_uidx
  on public.billing_events(provider, provider_event_id);
create index if not exists billing_events_processed_at_idx
  on public.billing_events(processed_at desc);

alter table public.billing_events enable row level security;
drop policy if exists "Admins read billing events" on public.billing_events;
create policy "Admins read billing events"
  on public.billing_events for select to authenticated
  using ((select private.is_admin()));

create or replace function public.touch_subscription_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.touch_subscription_updated_at();
