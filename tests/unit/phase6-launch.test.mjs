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
 assert.match(seo,/firstMeta\('name','robots'/)
 assert.match(seo,/linkRel\('canonical'/)
 assert.match(seo,/application\/ld\+json/)
 assert.match(seo,/noindex,nofollow,noarchive/)
 assert.match(vercel,/\/sitemap\.xml/)
 assert.match(vercel,/Strict-Transport-Security/)
 assert.match(vercel,/X-Robots-Tag/)
})

test('sitemap dinâmico cobre cidades, catálogos e perfis públicos sem expor rotas privadas',async()=>{
 const sitemap=read('api/sitemap.js')
 assert.match(sitemap,/application\/xml/)
 assert.match(sitemap,/public_business_directory/)
 assert.match(sitemap,/active=eq\.true/)
 assert.match(sitemap,/\/empresas/)
 assert.match(sitemap,/\/promocoes/)
 assert.match(sitemap,/\/eventos/)
 assert.doesNotMatch(sitemap,/\/admin/)
 assert.doesNotMatch(sitemap,/\/conta/)
 const {default:handler}=await import('../../api/sitemap.js')
 let status=0,body=''
 const res={setHeader(){},end(value=''){body=String(value);return value}}
 const oldUrl=process.env.VITE_SUPABASE_URL,oldKey=process.env.VITE_SUPABASE_PUBLISHABLE_KEY
 delete process.env.VITE_SUPABASE_URL;delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY
 await handler({method:'GET',headers:{host:'example.test','x-forwarded-proto':'https'}},{...res,set statusCode(v){status=v}})
 process.env.VITE_SUPABASE_URL=oldUrl;process.env.VITE_SUPABASE_PUBLISHABLE_KEY=oldKey
 assert.equal(status,200)
 assert.match(body,/urlset/)
 assert.match(body,/https:\/\/example\.test\/laguna/)
})

test('analytics mede passos de conversão do funil comercial',()=>{
 const tracker=read('src/analytics-tracker.jsx')
 assert.match(tracker,/record\('plan_view'/)
 assert.match(tracker,/record\('business_signup_start'/)
 assert.match(tracker,/\/planos/)
 assert.match(tracker,/business_signup_start/)
 assert.match(tracker,/new=business/)
})

test('identidade de lançamento permanece com azul VitrineLocal',()=>{
 const css=read('src/vitrine-identity.css')
 const manifest=read('public/site.webmanifest')
 const favicon=read('public/favicon.svg')
 const robots=read('public/robots.txt')
 assert.match(css,/--vl-blue:#1677ff/)
 assert.match(manifest,/"theme_color": "#1677ff"/)
 assert.match(favicon,/#1677ff/)
 assert.match(robots,/Allow: \/sitemap\.xml/)
 assert.match(robots,/Disallow: \/admin/)
 assert.match(robots,/Disallow: \/api\//)
})
