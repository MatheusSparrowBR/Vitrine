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
  assert.match(c,new RegExp(selector.replace(/\./g,'\\.')+'\\{[^}]*overflow-x:auto'))
 }
 assert.match(c,/scroll-snap-type:x mandatory/)
})

test('home mobile possui navegação inferior acessível e links válidos',()=>{
 const p=page()
 assert.match(p,/aria-label='Navegação principal mobile'/)
 assert.match(p,/href=\{base\+'\/empresas'\}/)
 assert.match(p,/href=\{base\+'\/promocoes'\}/)
 assert.match(p,/href='\/conta'/)
 assert.match(p,/name='user'/)
})

test('home mobile reduz a altura do hero e mantém busca utilizável',()=>{
 const c=css()
 assert.match(c,/\.lvp-hero-inner\{padding:34px 16px 28px/)
 assert.match(c,/\.lvp-search\{margin-top:14px;min-height:50px/)
 assert.match(c,/\.lvp-quick\{display:none\}/)
 assert.match(c,/\.lvp-note\{display:none\}/)
})
