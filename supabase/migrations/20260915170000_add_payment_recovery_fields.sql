alter table public.subscriptions
  add column if not exists last_payment_status_detail text,
  add column if not exists last_payment_retry_at timestamptz;

comment on column public.subscriptions.last_payment_status_detail is 'Detalhe do resultado da última cobrança retornado pelo Mercado Pago.';
comment on column public.subscriptions.last_payment_retry_at is 'Próxima data conhecida de nova tentativa da cobrança recorrente.';
