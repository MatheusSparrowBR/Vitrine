
import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const read=file=>fs.readFileSync(path.join(root,file),'utf8')

test('SEO público mantém metadados base e enriquecimento de empresas',()=>{
 const seo=read('src/seo-runtime.js')
 assert.match(seo,/noindex,nofollow,noarchive/)
 assert.match(seo,/canonical/)
 assert.match(seo,/application\/ld\+json/)
 assert.match(seo,/'@type':'LocalBusiness'/)
 assert.match(seo,/'@type':'BreadcrumbList'/)
 assert.match(seo,/public_business_directory/)
 assert.match(seo,/VITE_SUPABASE_PUBLISHABLE_KEY/)
})

test('robots e sitemap apontam para o catálogo público',()=>{
 const robots=read('public/robots.txt')
 const sitemap=read('scripts/generate-sitemap.mjs')
 assert.match(robots,/Disallow: \/usuario/)
 assert.match(robots,/Sitemap: https:\/\/vitrinelocal\.net\/sitemap\.xml/)
 assert.match(sitemap,/lastmod/)
 assert.match(sitemap,/public_business_directory\?select=slug,city_id,updated_at,category_slug/)
 assert.match(sitemap,/categories\?select=slug&active=eq.true/)
 assert.match(sitemap,/empresas\?categoria=/)
})


test('SEO de eventos publica Event e ItemList para a agenda da cidade',()=>{
 const seo=read('src/seo-runtime.js')
 assert.match(seo,/parts\[1\]==='eventos'/)
 assert.match(seo,/'@type':'Event'/)
 assert.match(seo,/'@type':'ItemList'/)
 assert.match(seo,/eventAttendanceMode/)
 assert.match(seo,/OfflineEventAttendanceMode/)
})

test('sitemap mantém fallback público mínimo quando Supabase não está configurado',()=>{
 const sitemap=read('scripts/generate-sitemap.mjs')
 assert.match(sitemap,/Supabase public configuration is unavailable/)
 assert.match(sitemap,/\/laguna\/empresas/)
 assert.match(sitemap,/\/laguna\/eventos/)
})


test('SEO usa uma origem canônica única para evitar duplicidade entre www e domínio raiz',()=>{
 const seo=read('src/seo-runtime.js')
 assert.match(seo,/CANONICAL_ORIGIN='https:\/\/vitrinelocal\.net'/)
 assert.doesNotMatch(seo,/linkRel\('canonical',location\.origin/)
 assert.doesNotMatch(seo,/firstMeta\('property','og:url',location\.origin/)
})


test('URLs internas do JSON-LD usam a mesma origem canônica',()=>{
 const seo=read('src/seo-runtime.js')
 assert.doesNotMatch(seo,/location\.href/)
})


test('SEO de categorias cria página indexável específica com CollectionPage e ItemList',()=>{
 const seo=read('src/seo-runtime.js')
 assert.match(seo,/requestedCategorySlug/)
 assert.match(seo,/CollectionPage/)
 assert.match(seo,/'@type':'DefinedTerm'/)
 assert.match(seo,/'@type':'ItemList'/)
 assert.match(seo,/category_slug:'eq.'/)
 assert.match(seo,/categoria=/)
})

test('Combinações de filtros do catálogo não são indexadas como páginas SEO',()=>{
 const seo=read('src/seo-runtime.js')
 assert.match(seo,/noindex,follow,max-image-preview:large/)
 assert.match(seo,/isCleanCategoryRoute/)
})


test('Catálogo público apresenta contexto textual específico quando uma categoria está selecionada',()=>{
 const app=read('src/ModernBusinessesPage.jsx')
 assert.match(app,/selectedCategory/)
 assert.match(app,/catalogHeading/)
 assert.match(app,/CATEGORIA LOCAL/)
})


test('página pública da cidade contém conteúdo local específico e links de descoberta',()=>{
 const app=read('src/CityHomePage.jsx')
 assert.match(app,/GUIA LOCAL/)
 assert.match(app,/localCategoryNames/)
 assert.match(app,/lvp-local-guide/)
 assert.match(app,/Explorar empresas em/)
})

test('sitemap avançado inclui apenas categorias ativas presentes em empresas públicas',()=>{
 const sitemap=read('scripts/generate-sitemap.mjs')
 assert.match(sitemap,/activeCategorySlugs/)
 assert.match(sitemap,/categoryLastmod/)
 assert.match(sitemap,/business\.category_slug/)
 assert.match(sitemap,/daily','0\.85'/)
})


test('GUIA LOCAL permanece abaixo da agenda e antes do CTA final',()=>{
 const app=read('src/CityHomePage.jsx')
 const guide=app.indexOf("className='lvp-wrap lvp-local-guide'")
 const events=app.indexOf("id='eventos'")
 const cta=app.indexOf("className='lvp-business-cta-section'")
 assert.ok(guide>events)
 assert.ok(guide<cta)
})


test('rota limpa de categoria evita o 404 da URL com querystring',()=>{
 const app=read('src/app-entry.jsx')
 const seo=read('src/seo-runtime.js')
 const sitemap=read('scripts/generate-sitemap.mjs')
 const ht=read('public/.htaccess')
 assert.match(app,/categorySlug/)
 assert.match(app,/p\[2\]\.toLowerCase\(\)==='categoria'/)
 assert.match(seo,/pathCategorySlug/)
 assert.match(seo,/isPathCategoryRoute/)
 assert.match(seo,/empresas\/categoria/)
 assert.match(sitemap,/empresas\/categoria/)
 assert.match(ht,/QUERY_STRING\} \^categoria=/)
})


test('catálogo e home usam links de categoria no caminho limpo',()=>{
 const catalog=read('src/ModernBusinessesPage.jsx')
 const home=read('src/CityHomePage.jsx')
 assert.match(catalog,/empresas\/categoria/)
 assert.match(home,/empresas\/categoria/)
})
