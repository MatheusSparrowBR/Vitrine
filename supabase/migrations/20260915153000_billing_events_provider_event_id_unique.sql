-- Make webhook event processing idempotent at the database level.
-- The Mercado Pago webhook treats an existing (provider, provider_event_id)
-- as a duplicate event, so the database must enforce that invariant.

create unique index if not exists billing_events_provider_event_id_uidx
  on public.billing_events (provider, provider_event_id);
