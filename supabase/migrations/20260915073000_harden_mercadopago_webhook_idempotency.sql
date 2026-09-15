alter table public.billing_events
  add column if not exists processing_status text not null default 'received',
  add column if not exists error_message text;
alter table public.billing_events alter column processed_at drop not null;
create index if not exists billing_events_processing_status_idx
  on public.billing_events(provider, processing_status);
