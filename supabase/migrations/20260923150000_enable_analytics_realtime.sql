-- Keep the admin analytics dashboard synchronized with new analytics events.
-- Safe to run repeatedly: the table is added only when it is not already in the Realtime publication.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'analytics_events'
  ) then
    alter publication supabase_realtime add table public.analytics_events;
  end if;
end $$;
