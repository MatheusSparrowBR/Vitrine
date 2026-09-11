import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(path,'utf8')

test('pré-lançamento possui SEO público e rotas privadas protegidas contra indexação',()=>{
 const html=read('index.html')
 const seo=read('src/seo-runtime.js')
 const vercel=read('vercel.json')
 assert.match(html,/meta name="description"/)
 assert.match(html,/property="og:title"/)
 assert.match(html,/property="og:image"/)
 assert.match(html,/link rel="canonical"/)
 assert.match(html,/site\.webmanifest/)
 assert.match(html,/favicon\.svg/)
 assert.match(html,/src="\/src\/seo-runtime\.js"/)
 assert.match(seo,/document\.title=title/)
 assert.match(seo,/meta','robots',robots/)
 assert.match(seo,/linkRel\('canonical'/)
 assert.match(seo,/application\/ld\+json/)
 assert.match(seo,/noindex,nofollow,noarchive/)
 assert.match(vercel,/\/sitemap\.xml/)
 assert.match(vercel,/Strict-Transport-Security/)
 assert.match(vercel,/X-Robots-Tag/)
})

test('sitemap dinâmico cobre cidades, catálogos e perfis públicos sem expor rotas privadas',()=>{
 const sitemap=read('api/sitemap.js')
 assert.match(sitemap,/application\/xml/)
 assert.match(sitemap,/public_business_directory/)
 assert.match(sitemap,/active=eq\.true/)
 assert.match(sitemap,/\/empresas/)
 assert.match(sitemap,/\/promocoes/)
 assert.match(sitemap,/\/eventos/)
 assert.doesNotMatch(sitemap,/\/admin/)
 assert.doesNotMatch(sitemap,/\/conta/)
})

test('analytics mede passos de conversão do funil comercial',()=>{
 const tracker=read('src/analytics-tracker.jsx')
 assert.match(tracker,/record\('plan_view'/)
 assert.match(tracker,/record\('business_signup_start'/)
 assert.match(tracker,/\/planos/)
 assert.match(tracker,/conta\?new=business/)
})

test('identidade de lançamento permanece com azul VitrineLocal',()=>{
 const css=read('src/vitrine-identity.css')
 const manifest=read('public/site.webmanifest')
 const favicon=read('public/favicon.svg')
 assert.match(css,/--vl-blue:#1677ff/)
 assert.match(manifest,/"theme_color": "#1677ff"/)
 assert.match(favicon,/#1677ff/)
})
