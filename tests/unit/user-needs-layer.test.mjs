import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(p,'utf8')

test('Camada de necessidades existe no banco e começa com as quatro intenções principais',()=>{
 const migration=fs.readdirSync('supabase/migrations').find(name=>name.includes('user_needs_layer'))
 assert.ok(migration)
 const sql=read('supabase/migrations/'+migration)
 assert.match(sql,/create table if not exists public\.business_needs/)
 assert.match(sql,/create table if not exists public\.category_needs/)
 for(const slug of ['quero-comer','quero-comprar','preciso-resolver','quero-cuidar-de-mim']) assert.match(sql,new RegExp(slug))
 assert.match(sql,/pizzaria/)
 assert.match(sql,/hamburgueria/)
 assert.match(sql,/conveniencia/)
})

test('Admin pode gerenciar necessidades e vincular uma categoria a múltiplas necessidades',()=>{
 const admin=read('src/admin-tools.jsx')
 assert.match(admin,/from\('business_needs'\)/)
 assert.match(admin,/from\('category_needs'\)/)
 assert.match(admin,/need_ids/)
 assert.match(admin,/Necessidades relacionadas/)
 assert.match(admin,/tab==='needs'/)
 assert.match(admin,/Buscar categoria\.\.\./)
 assert.match(admin,/Categorias relacionadas/)
 assert.match(admin,/setCategorySearch/)
 assert.match(admin,/delete\(\)\.eq\('need_id',needId\)/)
 assert.match(admin,/categoryIds\.map\(category_id=>\(\{category_id,need_id:needId\}\)\)/)
})

test('A home usa necessidades configuráveis em vez de filtrar por uma categoria única',()=>{
 const home=read('src/CityHomePage.jsx')
 assert.match(home,/from\('business_needs'\)/)
 assert.match(home,/necessidade=/)
 assert.match(home,/visibleNeeds/)
 assert.match(home,/Quero comer/)
 assert.match(home,/Quero comprar/)
})

test('O catálogo aplica a necessidade sobre as categorias vinculadas',()=>{
 const catalog=read('src/ModernBusinessesPage.jsx')
 assert.match(catalog,/initialNeed/)
 assert.match(catalog,/needCategorySlugs/)
 assert.match(catalog,/matchesNeed/)
 assert.match(catalog,/setNeedFilter/)
 assert.match(catalog,/searchParams\.set\('necessidade'/)
})

test('Cadastro de empresa continua escolhendo apenas a categoria',()=>{
 const registration=read('src/BusinessRegistrationPage.jsx')
 assert.match(registration,/name:form\.name\.trim\(\)/)
 assert.match(registration,/category_id:form\.category_id/)
 assert.doesNotMatch(registration,/need_id/)
 assert.doesNotMatch(registration,/business_needs/)
})
