import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const page=fs.readFileSync('src/AccountWorkspacePage.jsx','utf8')
const css=fs.readFileSync('src/account-workspace.css','utf8')
test('visão geral orienta o empreendedor para a próxima ação',()=>{
 assert.ok(page.includes('account-next-step-card'))
 assert.ok(page.includes('Como sua empresa está indo'))
 assert.ok(page.includes('Próximas ações'))
 assert.ok(page.includes('account-nav-section-label'))
 assert.ok(css.includes('.account-next-step-card'))
 assert.ok(css.includes('.account-overview-performance'))
 assert.ok(css.includes('.account-next-actions .account-quick-grid'))
})