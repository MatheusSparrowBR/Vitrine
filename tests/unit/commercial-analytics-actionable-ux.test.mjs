import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const page=fs.readFileSync('src/CommercialAnalyticsPage.jsx','utf8')
const css=fs.readFileSync('src/commercial-analytics.css','utf8')

test('desempenho apresenta leitura executiva, recomendação e ações',()=>{
 assert.ok(page.includes('ca-insight-card'))
 assert.ok(page.includes('O que aconteceu nos últimos'))
 assert.ok(page.includes('TENDÊNCIA'))
 assert.ok(page.includes('CANAIS DE CONTATO'))
 assert.ok(page.includes('O que vale fazer agora'))
 assert.ok(page.includes('deltaLabel'))
 assert.ok(page.includes('recommendation'))
 assert.ok(css.includes('.ca-insight-card'))
 assert.ok(css.includes('.ca-story-grid'))
 assert.ok(css.includes('.ca-daily-chart-large'))
 assert.ok(css.includes('.ca-kpi-trend'))
})