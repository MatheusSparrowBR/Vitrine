import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(p,'utf8')

test('Admin Analytics oferece contexto de período, funil e canais sem duplicar métricas',()=>{
 const page=read('src/AdminAnalyticsPage.jsx')
 const css=read('src/admin-analytics.css')
 assert.match(page,/Últimos 7 dias/)
 assert.match(page,/Últimos 30 dias/)
 assert.match(page,/Últimos 90 dias/)
 assert.match(page,/RESUMO EXECUTIVO/)
 assert.match(page,/FUNIL DE DESCOBERTA/)
 assert.match(page,/CANAIS/)
 assert.match(page,/Taxa de contato/)
 assert.match(page,/previousEvents/)
 assert.match(page,/contactsFrom/)
 assert.match(css,/\.aa-toolbar/)
 assert.match(css,/\.aa-insight/)
 assert.match(css,/\.aa-two-column/)
 assert.match(css,/\.aa-funnel/)
 assert.match(css,/\.aa-channel/)
})

test('Analytics mantém acesso administrativo e MRR baseado nas assinaturas ativas',()=>{
 const page=read('src/AdminAnalyticsPage.jsx')
 assert.match(page,/p\?\.role!=='admin'/)
 assert.match(page,/subscriptions/)
 assert.match(page,/billing_interval==='yearly'/)
 assert.match(page,/price_yearly/)
 assert.match(page,/price_monthly/)
})
