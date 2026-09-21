import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const page=fs.readFileSync('src/AdminHomePage.jsx','utf8')
const css=fs.readFileSync('src/admin-home.css','utf8')

test('visão geral do admin usa blocos visuais dedicados para KPIs, atalhos e saúde',()=>{
 assert.match(page,/admin-home-kpis/)
 assert.match(page,/admin-home-main-grid/)
 assert.match(page,/admin-home-actions-card/)
 assert.match(page,/admin-home-health-card/)
 assert.match(page,/admin-home-attention-badge/)
 assert.match(page,/admin-home.css/)
 assert.match(css,/\.admin-home-kpi\{min-height:150px/)
 assert.match(css,/\.admin-home-quick-grid\{grid-template-columns:repeat\(2/)
 assert.match(css,/\.admin-home-health-row\{min-height:58px/)
})
