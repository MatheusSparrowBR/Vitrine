import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const read=path=>fs.readFileSync(path,'utf8')
const onboarding=read('src/AdminOnboardingPage.jsx')
const businesses=read('src/AdminBusinessesPage.jsx')
const edge=read('supabase/functions/admin-onboarding/index.ts')
const migration=read('supabase/migrations/20260920100000_unowned_businesses_and_owner_linking.sql')

test('admin pode criar empresa gratuita sem proprietário e vincular depois',()=>{
 assert.match(onboarding,/Sem proprietário — vincular depois/)
 assert.match(onboarding,/business\.plan_code==='free'\|\|business\.owner_id/)
 assert.match(onboarding,/admin_list_business_owners/)
 assert.match(businesses,/owner_id:form\.owner_id\|\|null/)
 assert.match(businesses,/admin_list_business_owners/)
 assert.match(businesses,/Sem vínculo/)
})

test('edge function rejeita plano pago quando a empresa ainda não tem proprietário',()=>{
 assert.match(edge,/!ownerId && planCode !== 'free'/)
 assert.match(edge,/owner_id: ownerId/)
})

test('schema permite vínculo posterior mas mantém plano pago protegido',()=>{
 assert.match(migration,/alter column owner_id drop not null/)
 assert.match(migration,/create or replace function public\.admin_list_business_owners/) 
 assert.match(migration,/if v_business\.owner_id is null/)
 assert.match(migration,/Vincule um proprietário antes de atribuir um plano pago/)
})

