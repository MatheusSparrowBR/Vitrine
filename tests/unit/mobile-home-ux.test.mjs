import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const css=()=>fs.readFileSync('src/public-home.css','utf8')
const page=()=>fs.readFileSync('src/CityHomePage.jsx','utf8')

test('home mobile prioriza necessidade e mantém ordem de descoberta',()=>{
 const c=css()
 assert.match(c,/main>\.lvp-hero\{order:1\}/)
 assert.match(c,/main>\.lvp-needs\{order:2\}/)
 assert.match(c,/main>\.lvp-categories\{order:3\}/)
 assert.match(c,/main>\.lvp-featured\{order:4\}/)
})

test('home mobile usa navegação por toque nas categorias, empresas, promoções e eventos',()=>{
 const c=css()
 for(const selector of ['.lvp-cat-grid','.lvp-business-grid','.lvp-promo-grid','.lvp-event-list']){
  const escaped=selector.replace('.', '\\.')
  assert.match(c,new RegExp(escaped+'(?:,|\\{)[^}]*overflow-x:auto'), 'faltou scroll horizontal em '+selector)
 }
 assert.match(c,/scroll-snap-type:x mandatory/)
})

test('home mobile possui a navegação inferior no padrão do perfil e atalhos reais',()=>{
 const p=page()
 const c=css()
 assert.match(p,/aria-label='Navegação principal mobile'/)
 assert.match(p,/className='lvp-mobile-bottom-nav-inner'/)
 assert.match(p,/href=\{base\+'#categorias'\}/)
 assert.match(p,/href='\/usuario\/perfil\?mode=personal&tab=favorites'/)
 assert.match(p,/href='\/conta\?new=business'/)
 assert.match(p,/name='home'/)
 assert.match(p,/name='compass'/)
 assert.match(p,/name='heart'/)
 assert.match(p,/name='sparkle'/)
 assert.match(c,/\.lvp-mobile-bottom-nav\{[\s\S]*position:fixed/)
 assert.match(c,/\.lvp-mobile-bottom-nav\{[\s\S]*left:0;right:0;bottom:0/)
 assert.match(c,/\.lvp-mobile-bottom-nav-inner\{[\s\S]*grid-template-columns:repeat\(4,minmax\(0,1fr\)/)
 assert.match(c,/\.lvp-mobile-bottom-nav a\.is-active\{[\s\S]*background:#eef5ff/)
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
