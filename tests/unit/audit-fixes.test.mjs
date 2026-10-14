import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('só o supabase-client.js cria cliente do Supabase (evita várias sessões na mesma página)',()=>{
 const offenders=fs.readdirSync('src')
  .filter(name=>/\.(js|jsx)$/.test(name)&&name!=='supabase-client.js')
  .filter(name=>/createClient\(/.test(read(path.join('src',name))))
 assert.deepEqual(offenders,[])
})

test('cartão de vagas da home só consulta com o UUID real da cidade',()=>{
 const teaser=read('src/JobsTeaser.jsx')
 assert.match(teaser,/const UUID = \/\^\[0-9a-f\]\{8\}/)
 assert.match(teaser,/if \(!db \|\| !UUID\.test\(String\(cityId \|\| ''\)\)\) return undefined/)
})

test('página da empresa só consulta o dono quando há usuário logado',()=>{
 const page=read('src/ModernBusinessProfilePage.jsx')
 assert.doesNotMatch(page,/select\('cover_position_desktop,cover_position_mobile,owner_id'\)/)
 assert.match(page,/if\(user\)\{const\[\{data:profile\},\{data:ownerRow\}\]=await Promise\.all/)
})

test('cidade inexistente mostra "Cidade não encontrada"',()=>{
 const home=read('src/CityHomePage.jsx')
 assert.match(home,/if\(!error&&!data\)setCityMissing\(true\)/)
 assert.match(home,/if\(cityMissing\)return <main/)
 assert.match(home,/Cidade não encontrada/)
})

test('SEO: vagas, páginas institucionais e páginas não encontradas',()=>{
 const seo=read('src/seo-runtime.js')
 assert.match(seo,/title='Vagas em '\+cityName\+' \| VitrineLocal'/)
 assert.match(seo,/title='Política de Privacidade \| VitrineLocal'/)
 assert.match(seo,/title='Termos de Uso \| VitrineLocal'/)
 assert.match(seo,/title='Página não encontrada \| VitrineLocal'/)
 assert.match(seo,/title='Empresa não encontrada \| VitrineLocal'/)
 assert.match(seo,/knownCityChildren=\['empresas','promocoes','eventos','vagas'\]/)
})

test('evento inexistente sai do índice',()=>{
 const page=read('src/EventProfilePage.jsx')
 assert.match(page,/document\.title='Evento não encontrado \| VitrineLocal'/)
 assert.match(page,/setAttribute\('content','noindex,follow'\)/)
})

test('código morto removido não volta',()=>{
 for(const file of ['AccountPage.jsx','business-hours-status-v3.js','MerchantAnalyticsPage.jsx','promotions-admin.js','promotions-admin-v2.js','saas-dashboard.js']){
  assert.equal(fs.existsSync(path.join('src',file)),false,file)
 }
})
