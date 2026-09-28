import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const home=fs.readFileSync('src/CityHomePage.jsx','utf8')
const homeCss=fs.readFileSync('src/public-home.css','utf8')
const page=fs.readFileSync('src/ModernBusinessesPage.jsx','utf8')
const listCss=fs.readFileSync('src/modern-business-list.css','utf8')

test('Home oferece atalhos de descoberta rápida',()=>{
 assert.ok(home.includes('Encontre mais rápido:'))
 assert.ok(home.includes("aberto=1"))
 assert.ok(home.includes('Quero comer'))
 assert.ok(home.includes('Quero comprar'))
 assert.ok(homeCss.includes('.lvp-discovery-actions'))
})

test('Página de empresas possui filtros rápidos orientados à decisão',()=>{
 assert.ok(page.includes('quickFilters'))
 assert.ok(page.includes('Aberto agora'))
 assert.ok(page.includes('Delivery'))
 assert.ok(page.includes('Retirada'))
 assert.ok(page.includes('Consumo no local'))
 assert.ok(page.includes('Verificada'))
 assert.ok(page.includes('Busca em destaque'))
 assert.ok(page.includes('opening_hours'))
 assert.ok(page.includes('isOpenNow'))
 assert.ok(listCss.includes('.mbl-quick-filters'))
 assert.ok(listCss.includes('.mbl-card-statuses'))
})

test('Home exibe o total de empresas da cidade sem limitar o contador aos cards carregados',()=>{
 assert.match(home,/select\('id,name,slug,short_description,cover_url,logo_url,address,featured,verified,category_name,created_at',\{count:'exact'\}\)/)
 assert.match(home,/\.limit\(8\)/)
 assert.match(home,/setBusinessCount\(Number\.isFinite\(r\.count\)\?r\.count:rows\.length\)/)
 assert.match(home,/<b>\{businessCount\} empresas cadastradas<\/b>/)
})
