import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {safeHttpUrl} from '../../src/safe-url.js'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('só http(s) passa; javascript:, data: e lixo viram vazio',()=>{
 assert.equal(safeHttpUrl('https://www.ifood.com.br/loja'),'https://www.ifood.com.br/loja')
 assert.equal(safeHttpUrl('http://empresa.com.br'),'http://empresa.com.br/')
 assert.equal(safeHttpUrl('  https://x.com  '),'https://x.com/')
 assert.equal(safeHttpUrl('javascript:alert(document.cookie)'),'')
 assert.equal(safeHttpUrl('JaVaScRiPt:alert(1)'),'')
 assert.equal(safeHttpUrl('data:text/html,<script>alert(1)</script>'),'')
 assert.equal(safeHttpUrl('vbscript:msgbox(1)'),'')
 assert.equal(safeHttpUrl('nao-e-url'),'')
 assert.equal(safeHttpUrl(null),'')
 assert.equal(safeHttpUrl(undefined),'')
})

test('perfil, catálogo e evento usam safeHttpUrl nos links vindos do cadastro',()=>{
 const profile=read('src/ModernBusinessProfilePage.jsx')
 const catalog=read('src/PublicCatalogPages.jsx')
 const event=read('src/EventProfilePage.jsx')
 assert.doesNotMatch(profile,/href=\{business\.(ifood_url|instagram_url)\}/)
 assert.doesNotMatch(catalog,/href=\{business\.(ifood_url|instagram_url|website_url)\}/)
 assert.doesNotMatch(event,/href=\{event\.external_url\}/)
 assert.match(profile,/href=\{safeHttpUrl\(business\.ifood_url\)\}/)
 assert.match(catalog,/href=\{safeHttpUrl\(business\.website_url\)\}/)
 assert.match(event,/safeHttpUrl\(event\.external_url\)&&/)
 assert.match(read('src/ModernBusinessProfilePage.jsx'),/import \{ safeHttpUrl \} from '\.\/safe-url\.js'/)
})

test('banco rejeita links fora de http(s) em linhas novas',()=>{
 const sql=read('supabase/migrations/20261102120000_business_event_link_scheme_check.sql')
 assert.match(sql,/businesses_links_http_check/)
 assert.match(sql,/events_external_url_http_check/)
 assert.match(sql,/~\* '\^https\?:\/\/'/)
 assert.equal((sql.match(/not valid;/g)||[]).length,2)
})
