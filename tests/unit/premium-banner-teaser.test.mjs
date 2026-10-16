import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('banner premium de evento aparece mesmo com o evento em Em breve',()=>{
 const sql=read('supabase/migrations/20261017130000_premium_banner_event_teaser.sql')
 assert.match(sql,/create or replace function public\.advertisement_event_is_public\(p_event_id uuid, p_city_id uuid\)/)
 assert.match(sql,/security definer/)
 assert.match(sql,/grant execute on function public\.advertisement_event_is_public\(uuid, uuid\) to anon, authenticated;/)
 // A função só checa existência, cidade, ativo e data; não lê o modo Em breve.
 assert.doesNotMatch(sql,/teaser/)
 // As duas políticas de leitura usam a função, e nenhuma consulta events direto.
 const policies=sql.split(/create policy /).slice(1)
 assert.equal(policies.length,2)
 for(const policy of policies){
  assert.match(policy,/public\.advertisement_event_is_public\(advertisements\.event_id, advertisements\.city_id\)/)
  assert.doesNotMatch(policy,/from public\.events/)
 }
})

test('a migração não libera a tabela events para o público',()=>{
 const sql=read('supabase/migrations/20261017130000_premium_banner_event_teaser.sql')
 assert.doesNotMatch(sql,/on public\.events/)
 assert.doesNotMatch(sql,/grant select on (table )?public\.events/i)
})
