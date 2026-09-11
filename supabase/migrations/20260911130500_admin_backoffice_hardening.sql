-- Backoffice hardening: make admin plan CRUD work, reduce redundant RLS evaluation,
-- consolidate advertising read policies, and persist moderation review metadata.

CREATE OR REPLACE FUNCTION public.protect_business_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
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
  else
    if tg_op = 'INSERT' then
      if new.status <> 'pending'::business_status or coalesce(new.verified,false) or coalesce(new.featured,false) then
        new.reviewed_at := now();
        new.reviewed_by := (select auth.uid());
      end if;
    elsif tg_op = 'UPDATE' and (
      new.status is distinct from old.status
      or new.verified is distinct from old.verified
      or new.featured is distinct from old.featured
      or new.rejection_reason is distinct from old.rejection_reason
    ) then
      new.reviewed_at := now();
      new.reviewed_by := (select auth.uid());
    end if;
  end if;
  return new;
end;
$function$;

DROP POLICY IF EXISTS "authenticated owners or admins read businesses" ON public.businesses;
CREATE POLICY "authenticated owners or admins read businesses"
  ON public.businesses
  FOR SELECT TO authenticated
  USING ((owner_id = (select auth.uid())) OR (select private.is_admin()));

DROP POLICY IF EXISTS "owners or admins read plan usage cycles" ON public.business_plan_usage_cycles;
CREATE POLICY "owners or admins read plan usage cycles"
  ON public.business_plan_usage_cycles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_plan_usage_cycles.business_id
        AND (b.owner_id = (select auth.uid()) OR (select private.is_admin()))
    )
  );

DROP POLICY IF EXISTS "authenticated read ads" ON public.advertisements;
DROP POLICY IF EXISTS "owners read own advertisements" ON public.advertisements;
CREATE POLICY "authenticated read ads"
  ON public.advertisements
  FOR SELECT TO authenticated
  USING (
    (
      active = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at >= now())
      AND EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = advertisements.business_id
          AND b.city_id = advertisements.city_id
          AND b.status = 'active'
      )
      AND EXISTS (
        SELECT 1 FROM public.cities c
        WHERE c.id = advertisements.city_id
          AND c.active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = advertisements.business_id
        AND b.owner_id = (select auth.uid())
    )
    OR (select private.is_admin())
  );

DROP POLICY IF EXISTS "admins read advertising requests" ON public.advertising_requests;
DROP POLICY IF EXISTS "owners read own advertising requests" ON public.advertising_requests;
CREATE POLICY "authenticated read advertising requests"
  ON public.advertising_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = advertising_requests.business_id
        AND b.owner_id = (select auth.uid())
    )
    OR (select private.is_admin())
  );

DROP POLICY IF EXISTS "admins read all plans" ON public.plans;
DROP POLICY IF EXISTS "admins insert plans" ON public.plans;
DROP POLICY IF EXISTS "admins update plans" ON public.plans;
DROP POLICY IF EXISTS "admins delete plans" ON public.plans;
CREATE POLICY "admins read all plans"
  ON public.plans
  FOR SELECT TO authenticated
  USING ((select private.is_admin()));
CREATE POLICY "admins insert plans"
  ON public.plans
  FOR INSERT TO authenticated
  WITH CHECK ((select private.is_admin()));
CREATE POLICY "admins update plans"
  ON public.plans
  FOR UPDATE TO authenticated
  USING ((select private.is_admin()))
  WITH CHECK ((select private.is_admin()));
CREATE POLICY "admins delete plans"
  ON public.plans
  FOR DELETE TO authenticated
  USING ((select private.is_admin()));

-- Consolidate the plan SELECT policy so authenticated users evaluate one policy.
DROP POLICY IF EXISTS "public read active plans" ON public.plans;
DROP POLICY IF EXISTS "admins read all plans" ON public.plans;
CREATE POLICY "read plans"
  ON public.plans
  FOR SELECT TO anon, authenticated
  USING (
    active = true
    OR (select private.is_admin())
  );
