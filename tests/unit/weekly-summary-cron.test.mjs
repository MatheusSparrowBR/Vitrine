import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('agendamento semanal chama a função com o segredo do GitHub',()=>{
 const workflow=read('.github/workflows/weekly-merchant-summary.yml')
 assert.match(workflow,/cron: '0 11 \* \* 1'/)
 assert.match(workflow,/CRON_SECRET: \$\{\{ secrets\.CRON_SECRET \}\}/)
 assert.match(workflow,/send-weekly-merchant-summary/)
 assert.match(workflow,/--fail-with-body/)
})
