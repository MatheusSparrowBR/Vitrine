import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const require_=p=>fs.readFileSync(p,'utf8')

const css=()=>fs.readFileSync('src/public-home.css','utf8')
const page=()=>fs.readFileSync('src/CityHomePage.jsx','utf8')

test('home mobile mostra empresas logo após as categorias e deixa necessidades depois',()=>{
 const c=css()
 assert.match(c,/main>\.lvp-hero\{order:1\}/)
 assert.match(c,/main>\.lvp-categories\{order:2\}/)
 assert.match(c,/main>\.lvp-featured\{order:3\}/)
 assert.match(c,/main>\.lvp-needs\{order:5\}/)
})

test('home mobile usa navegação por toque nas categorias, empresas, promoções e eventos',()=>{
 const c=css()
 for(const selector of ['.lvp-cat-grid','.lvp-business-grid','.lvp-promo-grid','.lvp-event-list']){
  const escaped=selector.replace('.', '\\.')
  assert.match(c,new RegExp(escaped+'(?:,|\\{)[^}]*overflow-x:auto'), 'faltou scroll horizontal em '+selector)
 }
 assert.match(c,/scroll-snap-type:x mandatory/)
})

test('home mobile usa o menu inferior único do site com atalhos reais',()=>{
 const p=page()
 const chrome=require_('src/SiteChrome.jsx'),c=require_('src/site-chrome.css'),app=require_('src/app-entry.jsx')
 assert.doesNotMatch(p,/lvp-mobile-bottom-nav/)
 assert.match(app,/<SiteFooter\/><MobileTabBar\/>/)
 assert.match(chrome,/href: '\/usuario\/perfil\?mode=personal&tab=favorites'/)
 assert.match(chrome,/href: `\$\{base\}\/eventos`/)
 assert.match(chrome,/href: `\$\{base\}\/empresas\?buscar=1`/)
 for(const icon of ['home','search','calendar','heart'])assert.ok(chrome.includes(`icon: '${icon}'`))
 assert.match(c,/\.vl-tabbar \{ position: fixed; left: 0; right: 0; bottom: 0/)
 assert.match(c,/grid-template-columns: repeat\(4, 1fr\)/)
 assert.match(c,/safe-area-inset-bottom/)
})

test('home mobile reduz a altura do hero e mantém busca utilizável',()=>{
 const c=css()
 assert.match(c,/\.lvp-hero-inner\{padding:34px 16px 28px/)
 assert.match(c,/\.lvp-search\{margin-top:14px;min-height:50px/)
 assert.match(c,/\.lvp-quick\{display:none\}/)
 assert.match(c,/\.lvp-note\{display:none\}/)
})


test('hero CTA mantém contraste do texto sobre fundo branco',()=>{
 const c=css()
 assert.match(c,/\.lvp-page \.lvp-mini-cta\{[^}]*background:#fff;[^}]*color:var\(--lvp-ink\)/)
})
