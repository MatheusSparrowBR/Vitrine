import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('reputação e resposta às avaliações são recursos Premium e IA não está no catálogo comercial',()=>{
 const plans=read('src/BillingPlansPage.jsx')
 const mount=read('src/review-ui-mount.js')
 const migration=read('supabase/migrations/20260914190000_premium_review_controls_and_remove_ai.sql')
 assert.match(plans,/review_management/)
 assert.match(plans,/Reputação \+ respostas às avaliações/)
 assert.doesNotMatch(plans,/ai_posts/)
 assert.doesNotMatch(plans,/usos de IA por mês/)
 assert.match(mount,/isPremiumBusiness/)
 assert.match(mount,/EXCLUSIVO PREMIUM/)
 assert.match(mount,/plan\.code === 'premium'/)
 assert.match(migration,/review_management/)
 assert.match(migration,/resposta às avaliações está disponível apenas no plano Premium/)
 assert.match(migration,/features - 'ai_posts'/)
})

test('admin possui editor amigável de planos sem depender de JSON para os benefícios comuns',()=>{
 const page=read('src/AdminPlansPage.jsx')
 const platform=read('src/AdminPlatformPage.jsx')
 assert.match(platform,/tab==='plans'\?<AdminPlansPage supabase=\{supabase\}\/\>/)
 assert.match(page,/Descrição/)
 assert.match(page,/Preço mensal/)
 assert.match(page,/Mídias por ciclo/)
 assert.match(page,/Produtos e serviços por ciclo/)
 assert.match(page,/Promoções por ciclo/)
 assert.match(page,/Reputação \+ respostas às avaliações/)
 assert.match(page,/review_management/)
 assert.match(page,/delete features\.ai_posts/)
 assert.doesNotMatch(page,/Benefícios \/ limites \(JSON\)/)
})
