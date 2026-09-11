revoke all on table public.advertising_requests from anon;
revoke all on table public.advertising_requests from authenticated;
grant select, insert, update on table public.advertising_requests to authenticated;
