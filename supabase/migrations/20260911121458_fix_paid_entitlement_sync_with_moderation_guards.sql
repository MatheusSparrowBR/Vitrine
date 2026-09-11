-- Allow the plan entitlement synchronizer to update moderation fields without being
-- reverted by the owner-facing moderation guards.

create or replace function public.enforce_business_workflow_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if tg_op = 'INSERT' then
    if not private.is_admin() then
      new.status := 'pending';
      new.verified := false;
      new.featured := false;
      new.reviewed_at := null;
      new.reviewed_by := null;
      new.rejection_reason := null;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if private.is_admin() then
      if new.status is distinct from old.status then
        new.reviewed_at := now();
        new.reviewed_by := auth.uid();
        if new.status = 'active' then new.rejection_reason := null; end if;
      end if;
    else
      if new.status is distinct from old.status then new.status := old.status; end if;
      if current_setting('vitrine.plan_sync', true) <> 'on' then
        if new.verified is distinct from old.verified then new.verified := old.verified; end if;
        if new.featured is distinct from old.featured then
          if new.featured and public.business_has_feature(old.id, 'featured') then
            new.featured := true;
          else
            new.featured := old.featured;
          end if;
        end if;
      end if;
      if new.reviewed_at is distinct from old.reviewed_at then new.reviewed_at := old.reviewed_at; end if;
      if new.reviewed_by is distinct from old.reviewed_by then new.reviewed_by := old.reviewed_by; end if;
      if new.rejection_reason is distinct from old.rejection_reason then new.rejection_reason := old.rejection_reason; end if;
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.protect_business_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if not private.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending'::business_status;
      new.verified := false;
      new.featured := false;
    else
      new.status := old.status;
      if current_setting('vitrine.plan_sync', true) <> 'on' then
        new.verified := old.verified;
        new.featured := old.featured;
      end if;
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.sync_business_plan_entitlements(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
begin
  if p_business_id is null then return; end if;
  perform set_config('vitrine.plan_sync', 'on', true);
  update public.businesses b
     set verified = coalesce(public.plan_feature_enabled(b.id, 'verified'), false),
         featured = coalesce(public.plan_feature_enabled(b.id, 'featured'), false),
         updated_at = now()
   where b.id = p_business_id;
  perform set_config('vitrine.plan_sync', 'off', true);
end;
$function$;

do $do$
declare r record;
begin
  for r in select id from public.businesses loop
    perform public.sync_business_plan_entitlements(r.id);
  end loop;
end;
$do$;
