create index if not exists advertisements_paid_schedule_idx on public.advertisements(billing_status,active,starts_at,ends_at);
create or replace function public.run_operational_maintenance()
returns integer language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare v_run_id uuid:=gen_random_uuid(); v_archived integer:=0; v_activated integer:=0; v_deactivated integer:=0;
begin
 insert into public.operational_maintenance_runs(id,status) values(v_run_id,'running');
 begin
  update public.promotions set status='archived',updated_at=now() where ends_at is not null and ends_at<=now() and status in ('published','pending_review');
  get diagnostics v_archived=row_count;
  update public.advertisements a set active=true where a.placement='home_banner' and a.billing_status='paid' and a.image_url is not null and a.starts_at is not null and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now()) and a.active=false;
  get diagnostics v_activated=row_count;
  update public.advertisements a set active=false where a.placement='home_banner' and ((a.ends_at is not null and a.ends_at<=now()) or a.billing_status in ('canceled','overdue')) and a.active=true;
  get diagnostics v_deactivated=row_count;
  update public.operational_maintenance_runs set finished_at=now(),archived_promotions=v_archived,status='success',error_message=concat('ads_activated=',v_activated,'; ads_deactivated=',v_deactivated) where id=v_run_id;
  return v_archived;
 exception when others then
  update public.operational_maintenance_runs set finished_at=now(),status='error',error_message=sqlerrm where id=v_run_id;
  raise;
 end;
end; $function$;
revoke all on function public.run_operational_maintenance() from public,anon,authenticated;
grant execute on function public.run_operational_maintenance() to postgres;
