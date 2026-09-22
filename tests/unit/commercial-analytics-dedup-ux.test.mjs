import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const page=fs.readFileSync('src/CommercialAnalyticsPage.jsx','utf8')
const css=fs.readFileSync('src/commercial-analytics.css','utf8')

test('desempenho não duplica tendência e canais',()=>{
 assert.ok(page.includes('ca-trend-card'))
 assert.ok(page.includes('ca-channels-card'))
 assert.ok(page.includes('O que os dados avançados acrescentam'))
 const advancedBlock=page.slice(page.indexOf('ca-advanced-card'),page.indexOf('ca-opportunities-card'))
 assert.equal((advancedBlock.match(/ca-daily-chart/g)||[]).length,0)
 assert.equal((advancedBlock.match(/ca-channel-list/g)||[]).length,0)
 assert.ok(!page.includes('ca-advanced-summary'))
 assert.ok(!css.includes('.ca-advanced-summary'))
})

test('comparações exibidas usam apenas métricas com base comparável',()=>{
 assert.ok(page.includes('trend={delta}'))
 assert.ok(!page.includes('previousContacts'))
 assert.ok(!page.includes('conversionChange'))
})

test('métricas e estados do desempenho não sugerem dados que a base não mede',()=>{
 assert.ok(page.includes('Taxa de contato'))
 assert.ok(page.includes("const funnel=[['Visualizações',currentViews,100],['Contatos',leadCount,Number(conversion)]]"))
 assert.ok(page.includes('Visualizações adicionais'))
 assert.ok(page.includes('Ações por visitante'))
 assert.ok(page.includes('currentViews===0'))
 assert.ok(page.includes('adsError'))
 assert.ok(!page.includes('Visitantes recorrentes'))
})

test('tendência avançada explica corretamente a limitação do plano',()=>{
 assert.ok(page.includes('Tendência diária'))
 assert.ok(page.includes('Conhecer o Premium'))
 assert.ok(css.includes('.ca-chart-upgrade'))
})
