
import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const read=file=>fs.readFileSync(path.join(root,file),'utf8')

test('SEO público mantém metadados base e enriquecimento de empresas',()=>{
 const seo=read('src/seo-runtime.js')
 assert.match(seo,/noindex,nofollow,noarchive/)
 assert.match(seo,/rel="canonical"|link[rel=/)
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
 assert.match(sitemap,/public_business_directory\?select=slug,city_id,updated_at/)
})
