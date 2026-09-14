-- VitrineLocal: payment reset and catalog visibility hardening.
-- Payment providers are intentionally removed from the live schema. Historical migrations remain for schema history.

begin;

drop policy if exists "Authenticated users can read own or admin businesses" on public.businesses;
drop policy if exists "authenticated owners or admins read businesses" on public.businesses;
create policy "Authenticated users can read active businesses" on public.businesses
for select to authenticated
using (status='active' or owner_id=auth.uid() or private.is_admin());

alter table public.plans drop column if exists payment_provider;

alter table public.subscriptions drop column if exists external_customer_id;
alter table public.subscriptions drop column if exists external_subscription_id;
alter table public.subscriptions drop column if exists provider;
alter table public.subscriptions drop column if exists billing_interval;
alter table public.subscriptions drop column if exists provider_customer_id;
alter table public.subscriptions drop column if exists provider_subscription_id;
alter table public.subscriptions drop column if exists provider_price_id;
alter table public.subscriptions drop column if exists current_period_start;
alter table public.subscriptions drop column if exists current_period_end;
alter table public.subscriptions drop column if exists cancel_at_period_end;
alter table public.subscriptions drop column if exists mercadopago_payer_id;
alter table public.subscriptions drop column if exists scheduled_billing_interval;

create or replace function public.sync_advertising_request_approval()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if new.status='approved' and old.status is distinct from 'approved' then
    new.approved_at=coalesce(new.approved_at,now());
  end if;
  return new;
end;
$$;

alter table public.advertising_requests drop column if exists payment_status;
alter table public.advertising_requests drop column if exists payment_currency;
alter table public.advertising_requests drop column if exists paid_at;
alter table public.advertising_requests drop column if exists payment_provider;
alter table public.advertising_requests drop column if exists mercadopago_subscription_id;
alter table public.advertising_requests drop column if exists mercadopago_payment_id;

drop table if exists public.billing_events cascade;

commit;
