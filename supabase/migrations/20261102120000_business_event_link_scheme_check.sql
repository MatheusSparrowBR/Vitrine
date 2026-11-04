begin;

-- Links preenchidos por empresas e eventos só podem começar com http:// ou https://.
-- NOT VALID: vale para linhas novas e alteradas sem travar a tabela para checar as antigas.
-- Idempotente: se as constraints já existirem (execução anterior), são recriadas.
alter table public.businesses drop constraint if exists businesses_links_http_check;
alter table public.businesses add constraint businesses_links_http_check check (
  (ifood_url is null or ifood_url ~* '^https?://') and
  (instagram_url is null or instagram_url ~* '^https?://') and
  (website_url is null or website_url ~* '^https?://')
) not valid;

alter table public.events drop constraint if exists events_external_url_http_check;
alter table public.events add constraint events_external_url_http_check
  check (external_url is null or external_url ~* '^https?://') not valid;

commit;

-- Rodar depois de conferir os dados antigos:
-- alter table public.businesses validate constraint businesses_links_http_check;
-- alter table public.events validate constraint events_external_url_http_check;
