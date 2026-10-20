import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('avaliação ocultada pelo admin sai da página pública e da média',()=>{
 const sql=read('supabase/migrations/20261020120000_hidden_reviews_public_filter.sql')
 // As duas funções públicas decidem pelo status, e não pelo log de auditoria.
 const fns=sql.split(/create (?:or replace )?function /).slice(1)
 assert.equal(fns.length,2)
 for(const fn of fns){
  assert.match(fn,/r\.status is distinct from 'hidden'/)
  assert.doesNotMatch(fn,/business_review_audit_log a\s+where a\.review_id = r\.id\s+and a\.action in \('published','hidden'\)/)
 }
 // O resumo (média e contagem) usa o mesmo filtro da lista.
 assert.match(sql,/get_public_business_review_summaries[\s\S]*r\.status is distinct from 'hidden'/)
 // Registros sem status continuam visíveis, como antes.
 assert.doesNotMatch(sql,/r\.status = 'published'/)
})

test('admin oculta gravando o status que as funções públicas leem',()=>{
 const admin=read('src/AdminReviewsPage.jsx')
 assert.match(admin,/update\(\{status,hidden_at:status==='hidden'/)
})
