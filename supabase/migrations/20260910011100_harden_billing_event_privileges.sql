-- billing_events é escrita pelo webhook via service role e não deve ser diretamente gravável pelo cliente.
revoke all on table public.billing_events from anon, authenticated;
grant select on table public.billing_events to authenticated;
