import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('busca em destaque automática depende de Pro/Premium e o admin mantém override',()=>{
 const migration=read('supabase/migrations/20260921200000_auto_search_featured_for_pro_premium.sql')
 const admin=read('src/AdminBusinessesPage.jsx')
 assert.match(migration,/search_featured_mode text not null default 'auto'/)
 assert.match(migration,/when b\.search_featured_mode='on' then true/)
 assert.match(migration,/when b\.search_featured_mode='off' then false/)
 assert.match(migration,/p\.code in \('pro'::public\.plan_code,'premium'::public\.plan_code\)/)
 assert.match(migration,/Somente administradores podem alterar o modo/)
 assert.match(admin,/Automático — Pro\/Premium/)
 assert.match(admin,/Ativado manualmente/)
 assert.match(admin,/Desativado manualmente/)
 assert.match(admin,/function setSearchFeaturedMode/)
})

test('catálogo público lê o estado efetivo calculado para a busca',()=>{
 const migration=read('supabase/migrations/20260921200000_auto_search_featured_for_pro_premium.sql')
 const page=read('src/ModernBusinessesPage.jsx')
 assert.match(migration,/business_search_featured_enabled\(b\.id\) as search_featured/)
 assert.match(page,/search_featured/)
 assert.match(page,/searchScore/)
})
