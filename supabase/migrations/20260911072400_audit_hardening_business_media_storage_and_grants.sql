-- Hardening identified during the full project audit.
-- 1) Fix public business-media visibility for both current and legacy object paths.
drop policy if exists "Public can read active business media" on storage.objects;
create policy "Public can read active business media"
on storage.objects
for select to public
using (
  bucket_id = 'business-media'
  and exists (
    select 1
    from public.businesses b
    where b.status = 'active'::public.business_status
      and b.id::text = case
        when (storage.foldername(objects.name))[1] = 'business'
          then (storage.foldername(objects.name))[2]
        else (storage.foldername(objects.name))[1]
      end
  )
);

-- 2) Remove unnecessary SQL privileges from public-facing roles.
revoke all on public.admin_audit_logs from anon;
revoke delete, update, truncate, references, trigger on public.admin_audit_logs from authenticated;
grant insert, select on public.admin_audit_logs to authenticated;

revoke all on public.business_plan_usage_monthly from anon;
revoke insert, update, delete, truncate, references, trigger on public.business_plan_usage_monthly from authenticated;
grant select on public.business_plan_usage_monthly to authenticated;

revoke references, trigger, truncate on public.events from anon;
grant select on public.events to anon;
revoke references, trigger, truncate on public.events from authenticated;

-- 3) Remove an explicitly granted anonymous execution path for the admin-only
--    promotion archival helper. The function remains callable by authenticated
--    admins through its internal is_admin() guard.
revoke execute on function public.archive_expired_promotions() from anon, public;
grant execute on function public.archive_expired_promotions() to authenticated;
