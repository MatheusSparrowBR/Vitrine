import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const migration=fs.readFileSync('supabase/migrations/20260924180000_enforce_explicit_data_api_grants.sql','utf8')

test('Data API defaults are revoked for future public tables and sequences',()=>{
  assert.match(migration,/alter default privileges for role postgres in schema public/)
  assert.match(migration,/revoke select, insert, update, delete on tables from anon, authenticated, service_role/)
  assert.match(migration,/revoke usage, select on sequences from anon, authenticated, service_role/)
})

test('current public Data API grants are explicit',()=>{
  assert.match(migration,/grant all on table[\s\S]*to service_role;/)
  assert.match(migration,/grant select on table[\s\S]*to anon;/)
  assert.match(migration,/grant select, insert, update, delete on table[\s\S]*to anon;/)
  assert.match(migration,/grant select, insert, update, delete on table[\s\S]*to authenticated;/)
  assert.match(migration,/grant select, update on table public\.notifications to authenticated;/)
  assert.match(migration,/grant usage, select on sequence public\.analytics_events_id_seq/)
})

test('future migrations must contain explicit grants for new public tables',()=>{
  const tree=fs.readdirSync('supabase/migrations').filter(name=>name.endsWith('.sql')).sort()
  const hardening='20260924180000_enforce_explicit_data_api_grants.sql'
  for(const name of tree){
    if(name<=hardening)continue
    const content=fs.readFileSync('supabase/migrations/'+name,'utf8')
    if(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\./i.test(content)){
      assert.match(content,/grant\s+[\s\S]*on\s+table\s+public\./i,'Migration '+name+' creates a public table without an explicit GRANT')
    }
  }
})