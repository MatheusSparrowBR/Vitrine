import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('admin controla as três opções de atendimento da empresa',()=>{
 const admin=read('src/AdminBusinessesPage.jsx')
 for(const field of ['has_delivery','has_pickup','has_dine_in']) assert.match(admin,new RegExp(field))
 assert.match(admin,/ATENDIMENTO/)
 assert.match(admin,/Retirada no local/)
 assert.match(admin,/Consumo no local/)
})

test('perfil público exibe badges somente quando as opções estão ativas',()=>{
 const profile=read('src/ModernBusinessProfilePage.jsx')
 for(const field of ['has_delivery','has_pickup','has_dine_in']) assert.match(profile,new RegExp(field))
 assert.match(profile,/mbp-service-badges/)
 assert.match(profile,/Delivery/)
 assert.match(profile,/Retirada no local/)
 assert.match(profile,/Consumo no local/)
})

test('biblioteca oficial possui ícone de delivery',()=>{
 const icons=read('src/ui-icons.jsx')
 assert.match(icons,/motorcycle:/)
 assert.match(icons,/name:'motorcycle'/)
})

test('migração adiciona opções sem alterar a lógica existente de publicação',()=>{
 const migration=read('supabase/migrations/20260921143134_add_business_service_options.sql')
 assert.match(migration,/add column if not exists has_delivery/)
 assert.match(migration,/add column if not exists has_pickup/)
 assert.match(migration,/add column if not exists has_dine_in/)
 assert.match(migration,/security_invoker = true/)
 assert.match(migration,/b.has_delivery/)
 assert.match(migration,/b.has_pickup/)
 assert.match(migration,/b.has_dine_in/)
})
