import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(p,'utf8')

test('Supabase hardening revokes trigger-only RPC access and protects internal usage data',()=>{
 const migration=read('supabase/migrations/20260911123500_security_hardening.sql')
 assert.match(migration,/REVOKE EXECUTE ON FUNCTION public\.enforce_business_workflow_rules\(\) FROM PUBLIC, anon, authenticated/)
 assert.match(migration,/REVOKE EXECUTE ON FUNCTION public\.sync_business_plan_entitlements\(uuid\) FROM PUBLIC, anon, authenticated/)
 assert.match(migration,/business_plan_usage_cycles/)
 assert.match(migration,/owners or admins read plan usage cycles/)
 assert.match(migration,/get_business_advanced_analytics\(uuid, integer\)/)
 assert.match(migration,/REVOKE SELECT ON public\.businesses FROM anon/)
 assert.match(migration,/authenticated owners or admins read businesses/)
})

test('public business access uses an invoker directory view with column-limited anonymous access',()=>{
 const migration=read('supabase/migrations/20260911123500_security_hardening.sql')
 const home=read('src/CityHomePage.jsx')
 const listing=read('src/ModernBusinessesPage.jsx')
 const profile=read('src/ModernBusinessProfilePage.jsx')
 assert.match(migration,/ALTER VIEW public\.public_business_directory SET \(security_invoker = true\)/)
 assert.match(migration,/GRANT SELECT ON public\.public_business_directory TO anon, authenticated/)
 assert.match(migration,/GRANT SELECT \(id,city_id,category_id,name,slug,short_description,description,logo_url,cover_url,phone,whatsapp,website_url,instagram_url,facebook_url,address,neighborhood,latitude,longitude,opening_hours,status,verified,featured,created_at,updated_at\) ON public\.businesses TO anon/)
 assert.match(migration,/REVOKE SELECT ON public\.businesses FROM anon/)
 assert.match(home,/from\('public_business_directory'\)/)
 assert.match(listing,/from\('public_business_directory'\)/)
 assert.match(profile,/from\('public_business_directory'\)/)
})

test('analytics telemetry and subscriptions are validated at the database boundary',()=>{
 const migration=read('supabase/migrations/20260911123500_security_hardening.sql')
 assert.match(migration,/validate_analytics_event_integrity/)
 assert.match(migration,/trg_validate_analytics_event_integrity/)
 assert.match(migration,/Cidade do evento não corresponde à empresa/)
 assert.match(migration,/validate_subscription_business_owner/)
 assert.match(migration,/A assinatura deve pertencer ao proprietário da empresa/)
 assert.match(migration,/trg_validate_subscription_business_owner/)
})

test('public event media is gated by active future events and active cities',()=>{
 const migration=read('supabase/migrations/20260911123500_security_hardening.sql')
 assert.match(migration,/bucket_id = 'events-media'/)
 assert.match(migration,/e\.active = true/)
 assert.match(migration,/e\.event_date >= \(now\(\) AT TIME ZONE 'America\/Sao_Paulo'\)::date/)
 assert.match(migration,/c\.active = true/)
})
