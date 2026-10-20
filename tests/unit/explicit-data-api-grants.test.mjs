import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')
const dir='supabase/migrations'
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()
const noComments=sql=>sql.replace(/--.*$/gm,'')

// Tabelas criadas nas migrações e os papéis que cada uma recebeu em algum GRANT.
const created=new Map(),granted=new Map()
for(const f of files){
 const sql=noComments(read(path.join(dir,f)))
 for(const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi)){
  if(!created.has(m[1]))created.set(m[1],f)
 }
 for(const m of sql.matchAll(/\bgrant\s+([\s\S]*?)\s+on\s+(?:table\s+)?([\s\S]*?)\s+to\s+([a-z_,\s]+?)\s*;/gi)){
  const roles=m[3].split(',').map(r=>r.trim()).filter(Boolean)
  for(const t of [...m[2].matchAll(/(?:public\.)?([a-z_][a-z0-9_]*)/gi)].map(x=>x[1])){
   if(!granted.has(t))granted.set(t,new Set())
   roles.forEach(r=>granted.get(t).add(r))
  }
 }
}

test('toda tabela criada nas migrações tem GRANT para o service_role (Edge Functions e reconstrução do zero)',()=>{
 const missing=[...created.keys()].filter(t=>!(granted.get(t)||new Set()).has('service_role'))
 assert.deepEqual(missing,[])
})

test('tabelas usadas pelas Edge Functions ganham o GRANT na migração de 20/10',()=>{
 const sql=read('supabase/migrations/20261020130000_service_role_grants_for_recent_tables.sql')
 for(const t of ['business_favorites','event_favorites','job_postings','job_reports','home_highlights']){
  assert.ok(sql.includes('public.'+t),t+' sem GRANT na migração')
 }
 assert.match(sql,/to service_role;/)
})

test('tabelas privadas não recebem acesso anônimo por engano',()=>{
 for(const t of ['profiles','subscriptions','billing_events','admin_audit_logs']){
  assert.ok(!(granted.get(t)||new Set()).has('anon'),t+' não deveria ter GRANT para anon')
 }
})
