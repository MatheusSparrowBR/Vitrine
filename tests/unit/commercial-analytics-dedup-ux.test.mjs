import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const page=fs.readFileSync('src/CommercialAnalyticsPage.jsx','utf8')
const css=fs.readFileSync('src/commercial-analytics.css','utf8')

test('desempenho não duplica tendência e canais',()=>{
 assert.ok(page.includes('ca-trend-card'))
 assert.ok(page.includes('ca-channels-card'))
 assert.ok(page.includes('O que os dados avançados acrescentam'))
 assert.ok(page.includes('ca-advanced-summary'))
 const advancedBlock=page.slice(page.indexOf('ca-advanced-card'),page.indexOf('ca-opportunities-card'))
 assert.equal((advancedBlock.match(/ca-daily-chart/g)||[]).length,0)
 assert.equal((advancedBlock.match(/ca-channel-list/g)||[]).length,0)
})

test('comparações exibidas usam apenas métricas com base comparável',()=>{
 assert.ok(page.includes('trend={delta}'))
 assert.ok(!page.includes('previousContacts'))
 assert.ok(!page.includes('conversionChange'))
 assert.ok(!css.includes('.ca-advanced-summary'))
})
test('métricas e estados do desempenho não sugerem dados que a base não mede',()=>{
 assert.ok(t.includes('Taxa de contato'))
 assert.ok(t.includes("const funnel=[['Visualizações',currentViews,100],['Contatos',leadCount,Number(conversion)]]"))
 assert.ok(t.includes('Visualizações adicionais'))
 assert.ok(t.includes('Ações por visitante'))
 assert.ok(t.includes('currentViews===0'))
 assert.ok(t.includes('adsError'))
 assert.ok(!t.includes('Visitantes recorrentes'))
 assert.ok(!t.includes('ca-advanced-summary'))
})

test('tendência avançada explica corretamente a limitação do plano',()=>{
 assert.ok(t.includes('Tendência diária'))
 assert.ok(t.includes('Conhecer o Premium'))
 assert.ok(t.includes('ca-chart-upgrade'))
})
