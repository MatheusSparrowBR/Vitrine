import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('admin mostra a caixa de vagas de emprego na edição dos planos',()=>{
 assert.match(read('src/AdminPlansPage.jsx'),/\['job_postings','Vagas de emprego no perfil'\]/)
})

test('página pública de planos lista vagas de emprego quando o plano tem o recurso',()=>{
 assert.match(read('src/BillingPlansPage.jsx'),/'review_management','job_postings'(,'event_publishing')?\]\.map\(/)
})
