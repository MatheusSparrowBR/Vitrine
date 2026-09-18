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
 const page=read('src/CityHomePage.jsx'),css=read('src/launch-home-preview.css')
 assert.match(page,/lvp-business-grid-single/)
 assert.match(page,/lvp-promo-grid-single/)
 assert.match(page,/lvp-footer/)
 assert.match(page,/contato@vitrinelocal\.net/)
 assert.match(css,/\.lvp-business-grid-single\{/)
 assert.match(css,/\.lvp-promo-grid-single\{/)
})

test('rodapé usa a logo original sem filtro que a transforme em bloco branco',()=>{
 const css=read('src/launch-home-preview.css')
 assert.match(css,/\.lvp-footer-grid>div:first-child img\{width:210px;height:auto;display:block;opacity:1\}/)
 assert.doesNotMatch(css,/\.lvp-footer-grid>div:first-child img\{[^}]*filter:/)
})