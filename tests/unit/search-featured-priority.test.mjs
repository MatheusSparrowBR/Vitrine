import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('empresa possui controle separado de busca em destaque',()=>{
 const migration=read('supabase/migrations/20260921200000_auto_search_featured_for_pro_premium.sql')
 const admin=read('src/AdminBusinessesPage.jsx')
 assert.match(migration,/add column if not exists search_featured_mode text not null default 'auto'/)
 assert.match(migration,/businesses_search_featured_mode_idx/)
 assert.match(migration,/search_featured_mode/)
 assert.match(migration,/p\.code in .*pro.*premium/)
 assert.match(migration,/business_search_featured_enabled/)
 assert.match(admin,/search_featured_mode/)
 assert.match(admin,/Busca em destaque/)
 assert.match(admin,/business_search_featured_manual_on/)
 assert.match(admin,/business_search_featured_manual_off/)
 assert.match(admin,/business_search_featured_auto/)
 assert.match(admin,/business_search_featured_manual_on/)
})

test('busca do catálogo usa prioridade patrocinada somente nos resultados relevantes',()=>{
 const page=read('src/ModernBusinessesPage.jsx')
 const css=read('src/search-featured.css')
 assert.match(page,/search_featured/)
 assert.match(page,/searchScore/)
 assert.match(page,/if\(term\)/)
 assert.match(page,/scoreA=searchScore\(a,term,Boolean\(a\.search_featured\)\)/)
 assert.match(page,/scoreB=searchScore\(b,term,Boolean\(b\.search_featured\)\)/)
 assert.match(page,/Busca em destaque/)
 assert.match(css,/\.mbl-search-featured/)
})
