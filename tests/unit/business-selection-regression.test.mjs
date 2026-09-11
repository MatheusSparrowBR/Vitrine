import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(new URL(`../../${p}`,import.meta.url),'utf8')

test('seleção de empresa é compartilhada entre conta, analytics e publicidade',()=>{
 const helper=read('src/business-selection.js')
 const account=read('src/AccountWorkspacePage.jsx')
 const analytics=read('src/CommercialAnalyticsPage.jsx')
 const advertising=read('src/MerchantAdvertisingPage.jsx')
 assert.match(helper,/vitrine:selectedBusinessId/)
 assert.match(helper,/URLSearchParams\(window\.location\.search\)/)
 assert.match(account,/persistBusinessId/)
 assert.match(account,/\/conta\/analytics\?business_id=/)
 assert.match(analytics,/getRequestedBusinessId/)
 assert.match(analytics,/persistBusinessId\(e\.target\.value\)/)
 assert.match(analytics,/\/conta\/publicidade\?business_id=/)
 assert.match(advertising,/getRequestedBusinessId/)
 assert.match(advertising,/aria-label="Empresa anunciada"/)
 assert.match(advertising,/persistBusinessId\(id\)/)
})

test('minha conta mantém os recursos de catálogo, IA e planos governados por entitlements',()=>{
 const panel=read('src/PlanUsageReact.jsx')
 const rules=read('src/phase2-rules.js')
 assert.match(panel,/LABELS=.*photos.*items.*promotions/)
 assert.match(panel,/ai_posts/)
 assert.match(panel,/hasPlanFeature\([^)]*'analytics'/)
 assert.match(panel,/hasPlanFeature\([^)]*'featured'/)
 assert.match(panel,/hasPlanFeature\([^)]*'verified'/)
 assert.match(rules,/PLAN_CODES = \['free','pro','premium'\]/)
})

test('aprovação administrativa de publicidade gera rascunho de banner antes da publicação',()=>{
 const src=read('src/AdminAdvertisingPage.jsx')
 assert.match(src,/status==='approved'/)
 assert.match(src,/db\.from\('advertisements'\)\.insert/)
 assert.match(src,/active:false/)
 assert.match(src,/reviewed_at/)
 assert.match(src,/Abra Banners Premium/)
})
