import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {planFeatureLines,formatPlanPrice} from '../../src/plan-presentation.js'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('lista do Pro sai dos recursos do banco, na ordem da página de planos',()=>{
 const lines=planFeatureLines({photos:30,items:50,promotions:5,analytics:true,featured:true,verified:true,job_postings:true})
 assert.deepEqual(lines,['Até 30 fotos/mídias','Até 50 produtos/serviços','Até 5 promoções','Analytics comercial','Destaque nas buscas','Selo de verificação','Vagas de emprego no perfil'])
})

test('plano grátis mostra só limites e não lista recursos desligados',()=>{
 assert.deepEqual(planFeatureLines({photos:5,items:10,promotions:1,analytics:false,job_postings:false}),['Até 5 fotos/mídias','Até 10 produtos/serviços','Até 1 promoção'])
})

test('limite zero não aparece e promoção singular usa "promoção"',()=>{
 assert.deepEqual(planFeatureLines({photos:0,promotions:1}),['Até 1 promoção'])
})

test('preço vem em reais no formato brasileiro',()=>{
 assert.match(formatPlanPrice(29.9),/^R\$\s?29,90$/)
 assert.equal(formatPlanPrice(null),'')
})

test('telas de apresentação leem os planos do banco, sem lista fixa',()=>{
 const prelaunch=read('src/PrelaunchPlansPage.jsx')
 const onboarding=read('src/AccountOnboardingPage.jsx')
 assert.match(prelaunch,/loadPublicPlans\(db\)/)
 assert.match(onboarding,/loadPublicPlans\(db\)/)
 assert.doesNotMatch(prelaunch,/const plans=\[/)
 assert.doesNotMatch(onboarding,/const plans=\[/)
 assert.match(prelaunch,/href=\{`mailto:contato@vitrinelocal\.net\?subject=Interesse%20no%20plano%20\$\{encodeURIComponent\(plan\.name\)\}`\}/)
})

test('sem banco, as telas usam os planos de reserva com os preços de sempre',async()=>{
 const {loadPublicPlans}=await import('../../src/plan-presentation.js')
 const plans=await loadPublicPlans(null)
 assert.deepEqual(plans.map(plan=>plan.name),['Grátis','Pro','Premium'])
 assert.equal(plans[1].price,'R$ 29,90')
 assert.equal(plans[2].price,'R$ 59,90')
})
