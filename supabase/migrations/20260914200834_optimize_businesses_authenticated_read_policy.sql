alter policy "Authenticated users can read active businesses"
  on public.businesses
  using (
    (status = 'active'::business_status)
    or (owner_id = (select auth.uid()))
    or (select private.is_admin())
  );
