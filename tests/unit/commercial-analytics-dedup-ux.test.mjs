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
 const advancedMatch=page.match(/ca-advanced-card[sS]*?<section className="ca-card ca-opportunities-card">/)
 assert.ok(advancedMatch)
 assert.equal((advancedMatch[0].match(/ca-daily-chart/g)||[]).length,0)
 assert.equal((advancedMatch[0].match(/ca-channel-list/g)||[]).length,0)
})

test('comparações exibidas usam apenas métricas com base comparável',()=>{
 assert.ok(page.includes('trend={delta}'))
 assert.ok(!page.includes('previousContacts'))
 assert.ok(!page.includes('conversionChange'))
 assert.ok(css.includes('.ca-advanced-summary'))
})