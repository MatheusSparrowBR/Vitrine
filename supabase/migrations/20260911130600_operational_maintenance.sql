-- VitrineLocal production operations: move expired-promotion maintenance out of the browser.

create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.operational_maintenance_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  archived_promotions integer not null default 0,
  status text not null default 'running',
  error_message text
);

alter table public.operational_maintenance_runs enable row level security;

drop policy if exists "admins read maintenance runs" on public.operational_maintenance_runs;
create policy "admins read maintenance runs"
  on public.operational_maintenance_runs
  for select to authenticated
  using ((select private.is_admin()));

create or replace function public.run_operational_maintenance()
returns integer
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_run_id uuid := gen_random_uuid();
  v_archived integer := 0;
begin
  insert into public.operational_maintenance_runs (id, status)
  values (v_run_id, 'running');

  begin
    update public.promotions
       set status='archived',
           updated_at=now()
     where ends_at is not null
       and ends_at <= now()
       and status in ('published','pending_review');

    get diagnostics v_archived = row_count;

    update public.operational_maintenance_runs
       set finished_at = now(),
           archived_promotions = v_archived,
           status = 'success'
     where id = v_run_id;

    return v_archived;
  exception when others then
    update public.operational_maintenance_runs
       set finished_at = now(),
           status = 'error',
           error_message = sqlerrm
     where id = v_run_id;
    raise;
  end;
end;
$function$;

revoke all on function public.run_operational_maintenance() from public, anon, authenticated;
grant execute on function public.run_operational_maintenance() to postgres;

select cron.unschedule(jobid)
from cron.job
where jobname='vitrine-local-operational-maintenance';

select cron.schedule(
  'vitrine-local-operational-maintenance',
  '0 * * * *',
  'select public.run_operational_maintenance();'
);
