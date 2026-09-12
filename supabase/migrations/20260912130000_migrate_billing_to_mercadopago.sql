alter table public.plans add column if not exists payment_provider text not null default 'mercadopago';
alter table public.advertising_requests add column if not exists payment_provider text;
alter table public.advertising_requests add column if not exists mercadopago_subscription_id text;
alter table public.advertising_requests add column if not exists mercadopago_payment_id text;
alter table public.subscriptions add column if not exists mercadopago_payer_id text;

update public.plans set payment_provider='mercadopago' where active=true;

create unique index if not exists subscriptions_mercadopago_sub_uidx on public.subscriptions(provider,provider_subscription_id) where provider='mercadopago' and provider_subscription_id is not null;
create index if not exists advertising_requests_mp_sub_idx on public.advertising_requests(mercadopago_subscription_id) where mercadopago_subscription_id is not null;
create unique index if not exists billing_events_mercadopago_event_uidx on public.billing_events(provider,provider_event_id) where provider='mercadopago' and provider_event_id is not null;
