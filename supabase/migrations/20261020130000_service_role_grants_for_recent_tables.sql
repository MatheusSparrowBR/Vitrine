begin;

-- A partir de 30/10/2026 o Supabase não concede acesso automático às tabelas novas de public.
-- Estas tabelas foram criadas sem GRANT para o service_role. As Edge Functions de aviso
-- (send-event-reminders, send-event-reveal-notices, send-promotion-notification) leem favoritos
-- com a chave de serviço, então um projeto reconstruído a partir das migrações falharia.
-- Só o service_role ganha acesso total; anon e authenticated seguem com as permissões que já existem.
grant select, insert, update, delete on table
  public.business_favorites,
  public.event_favorites,
  public.job_postings,
  public.job_reports,
  public.home_highlights
to service_role;

commit;

notify pgrst, 'reload schema';
