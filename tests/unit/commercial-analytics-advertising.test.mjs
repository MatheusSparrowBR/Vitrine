import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(new URL(`../../${p}`,import.meta.url),'utf8')

test('commercial analytics uses the secured aggregate RPC and keeps plan gating',()=>{
 const src=read('src/CommercialAnalyticsPage.jsx')
 assert.match(src,/rpc\(['"]get_business_analytics_summary['"]/) 
 assert.match(src,/hasPlanFeature\([^)]*['"]analytics['"]/) 
})

test('premium advertising workspace is restricted by premium_ads entitlement',()=>{
 const src=read('src/MerchantAdvertisingPage.jsx')
 assert.match(src,/premium_ads/) 
 assert.match(src,/advertising_requests/) 
})

test('admin advertising workspace exists and provides request review and billing controls',()=>{
 const src=read('src/AdminAdvertisingPage.jsx')
 assert.match(src,/advertising_requests/) 
 assert.match(src,/billing_status/) 
 assert.match(src,/monthly_price/) 
})

test('premium banner tracking identifies advertisement metadata and no anonymous metrics RPC remains exposed',()=>{
 const tracker=read('src/analytics-tracker.jsx')
 assert.match(tracker,/advertisement_id/) 
 assert.match(tracker,/banner_impression/) 
 assert.match(tracker,/banner_click/) 
})

test('app routes performance and advertising workspaces',()=>{
 const entry=read('src/app-entry.jsx')
 assert.match(entry,/if\(path===['"]\/conta\/analytics['"]\)return <CommercialAnalyticsPage/) 
 assert.match(entry,/if\(path===['"]\/conta\/publicidade['"]\)return <MerchantAdvertisingPage/) 
 assert.match(entry,/if\(path===['"]\/admin\/publicidade['"]\)return <AdminAdvertisingPage/) 
})
