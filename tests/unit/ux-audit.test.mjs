import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
import path from'node:path'
const root=process.cwd()
const read=p=>fs.readFileSync(path.join(root,p),'utf8')

test('rotas públicas, cliente, empresa e admin permanecem registradas',()=>{
 const app=read('src/app-entry.jsx')
 for(const route of [
  "path==='/login'","path==='/usuario/login'","path==='/usuario/perfil'","path==='/planos'",
  "path==='/conta'","path==='/conta/analytics'","path==='/conta/publicidade'","path==='/conta/nova'",
  "path==='/admin'","path==='/admin/analytics'","path==='/admin/empresas'","path==='/admin/usuarios'",
  "path==='/admin/avaliacoes'","path==='/admin/banners'","path==='/admin/publicidade'","path==='/admin/gestao'"
 ])assert.match(app,new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))
 assert.match(app,/kind==='events'/)
 assert.match(app,/kind==='businesses'/)
 assert.match(app,/kind==='promotions'/)
 assert.match(app,/kind==='business'/)
})

test('navegação pública expõe categorias sem alterar os destinos existentes',()=>{
 const header=read('src/SiteHeader.jsx')
 assert.match(header,/CATEGORY_MENU/)
 for(const label of ['Restaurantes','Lojas','Serviços','Saúde','Beleza','Turismo','Automóveis','Imóveis','Pets','Outros'])assert.match(header,new RegExp(label))
 assert.match(header,/\/empresas\?categoria=/)
 assert.match(header,/Minha conta/)
})

test('área administrativa mantém navegação completa e editor de planos',()=>{
 const shell=read('src/AdminShell.jsx'),plans=read('src/AdminPlansPage.jsx')
 for(const label of ['Empresas','Usuários','Promoções','Eventos','Publicidade','Banners','Avaliações','Analytics','Categorias','Cidades','Planos','Planos por empresa'])assert.match(shell,new RegExp(label))
 assert.match(plans,/review_management/)
 assert.match(plans,/delete features\.ai_posts/)
 assert.match(plans,/delete features\.ai_posts_limit/)
 assert.match(plans,/Não é necessário alterar código/)
})

test('regra Premium para reputação e respostas permanece protegida',()=>{
 const plans=read('src/AdminPlansPage.jsx'), phase2=read('src/phase2-product.css')
 assert.match(plans,/review_management/)
 assert.match(plans,/Reputação \+ respostas às avaliações/)
 assert.match(phase2,/vl-phase2-analytics-lock/)
})

test('camadas de UX e responsividade são carregadas globalmente',()=>{
 const app=read('src/app-entry.jsx')
 assert.match(app,/ux-refinement\.css/)
 assert.match(app,/site-header-v3\.css/)
 const ux=read('src/ux-refinement.css')
 assert.match(ux,/\.admin-v2-content/)
 assert.match(ux,/\.analytics-page/)
 assert.match(ux,/\.mbl-card/)
 assert.match(ux,/\.legal-content/)
 assert.match(ux,/@media\(max-width:760px\)/)
})


test('home real usa centralização para item único e rodapé da UX de lançamento',()=>{
 const page=read('src/CityHomePage.jsx'),css=read('src/public-home.css')
 assert.match(page,/lvp-business-grid-single/)
 assert.match(page,/lvp-promo-grid-single/)
 assert.match(page,/lvp-footer/)
 assert.match(page,/contato@vitrinelocal\.net/)
 assert.match(css,/\.lvp-business-grid-single\{/)
 assert.match(css,/\.lvp-promo-grid-single\{/)
})

test('rodapé usa a logo original sem filtro que a transforme em bloco branco',()=>{
 const css=read('src/public-home.css')
 assert.match(css,/\.lvp-footer-grid>div:first-child img\{width:210px;height:auto;display:block;opacity:1\}/)
 assert.doesNotMatch(css,/\.lvp-footer-grid>div:first-child img\{[^}]*filter:/)
})


test('Home Lab é isolada da Home oficial e não deve ser indexada',()=>{
 const app=read('src/app-entry.jsx')
 const page=read('src/HomeTestPage.jsx')
 const css=read('src/home-test.css')
 assert.match(app,/path==='\/home-teste'/)
 assert.match(app,/isHomeLab/)
 assert.match(page,/noindex,nofollow,noarchive/)
 assert.match(page,/dados simulados/i)
 assert.doesNotMatch(page,/supabase\./)
 assert.doesNotMatch(css,/linear-gradient\(/)
 assert.doesNotMatch(css,/backdrop-filter/)
})


test('Home Lab usa hero compacto e navegação mobile app-like',()=>{
 const page=read('src/HomeTestPage.jsx')
 const css=read('src/home-test.css')
 assert.match(page,/GUIA COMERCIAL REGIONAL/)
 assert.match(page,/Comércios e serviços locais/)
 assert.match(page,/O que procura\?/)
 assert.match(page,/Bairro \/ Região/)
 assert.match(page,/Gastronomia &amp; Pizzas/)
 assert.match(page,/Pousadas &amp; Hotéis/)
 assert.match(page,/Navegação móvel/)
 assert.match(page,/Categorias/)
 assert.match(css,/home-lab-bottom-nav/)
 assert.match(css,/safe-area-inset-bottom/)
 assert.match(css,/@media\(max-width:767px\)/)
})

test('Home Lab usa grade minimalista de categorias',()=>{
 const page=read('src/HomeTestPage.jsx'),css=read('src/home-test.css')
 assert.match(page,/Categorias Principais/)
 assert.match(page,/Ver todas \(22\)/)
 assert.match(page,/city\.categories\.slice\(0,8\)/)
 assert.match(css,/grid-template-columns:repeat\(8,minmax\(0,1fr\)\)/)
 assert.match(css,/scroll-snap-type:x mandatory/)
 assert.match(css,/min-width:84px/)
})


test('Perfil da Empresa Lab é isolado e não toca no banco',()=>{
 const app=read('src/app-entry.jsx')
 const page=read('src/CompanyProfileTestPage.jsx')
 const css=read('src/company-profile-test.css')
 assert.ok(app.includes("path==='/perfil-teste'"))
 assert.match(app,/isProfileLab/)
 assert.match(page,/noindex,nofollow,noarchive/)
 assert.match(page,/Dados simulados/)
 assert.doesNotMatch(page,/supabase/)
 assert.doesNotMatch(page,/from\(/)
 assert.match(page,/Falar no WhatsApp/)
 assert.match(page,/Salvar/)
 assert.match(page,/Horários/)
 assert.match(css,/cpl-bottom/)
 assert.match(css,/safe-area-inset-bottom/)
})

test('Perfil Lab usa galeria compacta e conversão prioritária',()=>{
 const page=read('src/CompanyProfileTestPage.jsx'),css=read('src/company-profile-test.css')
 assert.match(page,/cpl-gallery/)
 assert.match(page,/Falar no WhatsApp/)
 assert.match(page,/Mais pedidos no local/)
 assert.match(page,/Horários/)
 assert.match(page,/Abrir no Google Maps/)
 assert.ok(css.includes('grid-template-columns:minmax(0,2fr) minmax(180px,1fr)'))
 assert.ok(css.includes('.cpl-side-sticky{position:sticky'))
 assert.ok(css.includes('safe-area-inset-bottom'))
 assert.doesNotMatch(css,/linear-gradient\(/)
})


test('Home Lab mantém navegação mobile em quatro colunas sem compressão do container',()=>{
 const page=read('src/HomeTestPage.jsx'),css=read('src/home-test.css')
 assert.match(page,/home-lab-bottom-nav-inner/)
 assert.match(css,/\.home-lab-bottom-nav-inner\{width:100%;height:64px;display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)/)
 assert.match(css,/\.home-lab-bottom-nav\{position:fixed;[^}]*display:block/)
 assert.match(css,/\.home-lab-bottom-nav a\{[^}]*min-width:0/)
 assert.match(css,/font-size:10px;line-height:1\.15/)
})


test('Home Lab usa a paleta cromática oficial',()=>{
 const css=read('src/home-test.css')
 assert.match(css,/--hlab-primary:#082b52;--hlab-brand:#216df3/)
 assert.match(css,/#f6f8fc/)
 assert.match(css,/#216df3/)
 assert.match(css,/#71859b/)
})


test('Perfil Lab usa a paleta cromática oficial',()=>{
 const css=read('src/company-profile-test.css')
 assert.match(css,/--cpl-primary:#082b52;--cpl-brand:#216df3/)
 assert.match(css,/#f6f8fc/)
 assert.match(css,/#216df3/)
 assert.match(css,/#71859b/)
})
