import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('dashboard administrativo exibe sinais de saúde operacional',()=>{
 const page=read('src/AdminHomePage.jsx')
 assert.match(page,/operational_maintenance_runs/)
 assert.match(page,/billing_events/)
 assert.match(page,/past_due','unpaid','incomplete','incomplete_expired/)
 assert.match(page,/Manutenção automática/)
 assert.match(page,/Billing \/ webhooks/)
 assert.match(page,/Assinaturas com problema/)
 assert.match(page,/maintenanceStatus/)
})
