-- Security hardening: close internal RPCs, isolate usage data, validate analytics,
-- protect event media, and prevent direct exposure of internal business columns.

-- Trigger-only functions must not be callable through the PostgREST RPC surface.
REVOKE EXECUTE ON FUNCTION public.enforce_business_city_rules() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_business_collection_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_business_item_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_business_photo_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_business_promotion_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_business_workflow_rules() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_paid_business_entitlements() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_promotion_review_workflow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_business_moderation_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_business_slug() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_events_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_advertising_request_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_subscription_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_advertisement_business_city() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_business_plan_entitlements(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_business_plan_entitlements_from_subscription() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_analytics_event_integrity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_subscription_business_owner() FROM PUBLIC, anon, authenticated;

-- Advanced analytics is a signed-in Premium/admin capability, never anonymous.
REVOKE EXECUTE ON FUNCTION public.get_business_advanced_analytics(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_business_advanced_analytics(uuid, integer) TO authenticated;

-- Internal usage-cycle rows: owners can see their own usage; admins can see all.
DROP POLICY IF EXISTS "owners or admins read plan usage cycles" ON public.business_plan_usage_cycles;
CREATE POLICY "owners or admins read plan usage cycles"
  ON public.business_plan_usage_cycles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_plan_usage_cycles.business_id
        AND (b.owner_id = auth.uid() OR private.is_admin())
    )
  );
GRANT SELECT ON public.business_plan_usage_cycles TO authenticated;

-- Analytics telemetry integrity: never allow cross-user or cross-city metadata.
CREATE OR REPLACE FUNCTION public.validate_analytics_event_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','private','pg_temp'
AS $function$
begin
  if new.event_type not in (
    'page_view','profile_view','business_click','category_click','promotion_click',
    'event_click','gallery_open','share_click','save_click','whatsapp_click',
    'instagram_click','website_click','banner_impression','banner_click'
  ) then
    raise exception 'Tipo de evento analítico inválido.' using errcode='22023';
  end if;

  if length(coalesce(new.session_id,'')) > 200 then
    raise exception 'Identificador de sessão inválido.' using errcode='22023';
  end if;

  if auth.uid() is not null and new.user_id is not null and new.user_id <> auth.uid() then
    raise exception 'Usuário do evento não corresponde à sessão autenticada.' using errcode='42501';
  end if;

  if new.business_id is not null then
    if not exists (
      select 1 from public.businesses b
      where b.id = new.business_id
        and b.status = 'active'
    ) then
      raise exception 'Empresa inválida ou inativa para telemetria.' using errcode='23514';
    end if;

    if new.city_id is not null and not exists (
      select 1 from public.businesses b
      where b.id = new.business_id and b.city_id = new.city_id
    ) then
      raise exception 'Cidade do evento não corresponde à empresa.' using errcode='23514';
    end if;
  elsif new.city_id is not null then
    if not exists (
      select 1 from public.cities c
      where c.id = new.city_id and c.active = true
    ) then
      raise exception 'Cidade inválida ou inativa para telemetria.' using errcode='23514';
    end if;
  end if;

  return new;
end;
$function$;

DROP TRIGGER IF EXISTS trg_validate_analytics_event_integrity ON public.analytics_events;
CREATE TRIGGER trg_validate_analytics_event_integrity
  BEFORE INSERT OR UPDATE ON public.analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_analytics_event_integrity();

-- Public catalog uses an invoker view plus column-level grants so internal business columns remain private.
ALTER VIEW public.public_business_directory SET (security_invoker = true);
GRANT SELECT ON public.public_business_directory TO anon, authenticated;
DROP POLICY IF EXISTS "anon read active businesses" ON public.businesses;
CREATE POLICY "anon read active businesses"
  ON public.businesses
  FOR SELECT TO anon
  USING (status = 'active');
DROP POLICY IF EXISTS "authenticated read active or admin businesses" ON public.businesses;
CREATE POLICY "authenticated owners or admins read businesses"
  ON public.businesses
  FOR SELECT TO authenticated
  USING ((owner_id = auth.uid()) OR private.is_admin());
REVOKE SELECT ON public.businesses FROM anon;
GRANT SELECT (id,city_id,category_id,name,slug,short_description,description,logo_url,cover_url,phone,whatsapp,website_url,instagram_url,facebook_url,address,neighborhood,latitude,longitude,opening_hours,status,verified,featured,created_at,updated_at) ON public.businesses TO anon;
GRANT SELECT ON public.businesses TO authenticated;

-- Subscription rows are service-managed; enforce the business -> owner relationship at the database boundary.
CREATE OR REPLACE FUNCTION public.validate_subscription_business_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','private','pg_temp'
AS $function$
begin
  if not exists (
    select 1 from public.businesses b
    where b.id = new.business_id
      and b.owner_id = new.user_id
  ) then
    raise exception 'A assinatura deve pertencer ao proprietário da empresa.' using errcode='23514';
  end if;
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS trg_validate_subscription_business_owner ON public.subscriptions;
CREATE TRIGGER trg_validate_subscription_business_owner
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_subscription_business_owner();

-- Public event media is available only for active, future events in active cities.
DROP POLICY IF EXISTS "Public can read event media" ON storage.objects;
CREATE POLICY "Public can read event media"
  ON storage.objects
  FOR SELECT TO public
  USING (
    bucket_id = 'events-media'
    AND EXISTS (
      SELECT 1
      FROM public.events e
      JOIN public.cities c ON c.id = e.city_id
      WHERE e.id::text = (storage.foldername(storage.objects.name))[1]
        AND e.active = true
        AND e.event_date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
        AND c.active = true
    )
  );
