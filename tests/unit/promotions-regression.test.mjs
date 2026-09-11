import {test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('home and public listing both use the shared promotion service',()=>{
 const home=read('src/CityHomePage.jsx')
 const catalog=read('src/PublicCatalogPages.jsx')
 assert.match(home,/getActiveCityPromotions\(db,city\.id/)
 assert.match(catalog,/getActiveCityPromotions\(db,c\.id/)
})

test('home promotion cards are complete without DOM post-processing',()=>{
 const home=read('src/CityHomePage.jsx')
 assert.match(home,/p\.image_url\|\|DEFAULT_PROMOTION_IMAGE/)
 assert.match(home,/p\.businesses\?\.name/)
 assert.match(home,/p\.original_price/)
 assert.match(home,/p\.price/)
})

test('promotion service guards publication, dates and active business',()=>{
 const source=read('src/promotion-service.js')
 assert.match(source,/\.eq\('status','published'\)/)
 assert.match(source,/\.eq\('status','active'\)/)
 assert.match(source,/filter\(p=>isPromotionCurrent\(p,now\)\)/)
 assert.match(source,/p\.businesses&&isPromotionCurrent/)
})

test('promotion status changes remain governed by database workflow',()=>{
 const component=read('src/OwnerPromotionsSection.jsx')
 const admin=read('src/AdminPromotionsPage.jsx')
 assert.match(component,/status:'pending_review'/)
 assert.match(admin,/quickStatus\(row,status\)/)
 assert.match(admin,/status,updated_at:new Date\(\)\.toISOString\(\)/)
})

test('merchant promotion creation uses the React form and not browser prompts',()=>{
 const account=read('src/AccountWorkspacePage.jsx')
 const component=read('src/OwnerPromotionsSection.jsx')
 assert.match(account,/OwnerPromotionsSection/)
 assert.doesNotMatch(account,/function addPromotion\(/)
 assert.doesNotMatch(account,/window\.prompt\(['\"]Título da promoção/)
 assert.match(component,/type="datetime-local"/)
 assert.match(component,/input type="file"/)
 assert.match(component,/status:'pending_review'/)
})

test('merchant promotion creation enforces the plan limit before insert',()=>{
 const component=read('src/OwnerPromotionsSection.jsx')
 assert.match(component,/getPlanCycleFeatureUsage\(businessId,'promotions'\)/)
 assert.match(component,/used>=planLimit/)
 assert.match(component,/get_effective_plan_id/)
 assert.match(component,/latest=await getPlanCycleFeatureUsage\(businessId,'promotions'\)/)
 assert.match(component,/Limite de .* promoções neste ciclo/)
})

test('plan limit hardening is versioned and covers all catalog resources',()=>{
 const migration=read('supabase/migrations/20260910233000_harden_plan_limits_and_monthly_quotas.sql')
 assert.match(migration,/business_photos_plan_limit/)
 assert.match(migration,/business_items_plan_limit/)
 assert.match(migration,/promotions_plan_limit/)
 assert.match(migration,/v_limit>=0 and v_used>=v_limit/)
 assert.match(migration,/ends_at>now\(\)/)
})

test('monthly AI quota is atomic and calendar-month based',()=>{
 const migration=read('supabase/migrations/20260910233000_harden_plan_limits_and_monthly_quotas.sql')
 assert.match(migration,/business_plan_usage_monthly/)
 assert.match(migration,/consume_monthly_plan_quota/)
 assert.match(migration,/date_trunc\('month',now\(\) at time zone 'America\/Sao_Paulo'\)/)
 assert.match(migration,/used_count\+excluded\.used_count<=v_limit/)
})

test('subscription history does not use a one-row-per-business unique constraint',()=>{
 const migration=read('supabase/migrations/20260910233000_harden_plan_limits_and_monthly_quotas.sql')
 assert.match(migration,/drop constraint if exists subscriptions_user_id_business_id_key/)
 assert.match(migration,/subscriptions_one_current_plan_per_business_idx/)
 assert.match(migration,/subscriptions_provider_subscription_id_idx/)
})

test('promotion usage is cumulative and not tied to expiry status',()=>{
 const component=read('src/OwnerPromotionsSection.jsx')
 assert.match(component,/getPlanCycleFeatureUsage\(businessId,'promotions'\)/)
 assert.match(component,/Exclu(ir|ir ou encerrar)/)
 assert.match(component,/consumo.*ciclo/)
})
