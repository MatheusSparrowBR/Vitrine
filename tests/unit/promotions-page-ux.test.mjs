import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(p,'utf8')

test('card de promoção na home ocupa a largura toda da imagem',()=>{
 const css=read('src/home-readability.css')
 assert.match(css,/\.lvp-page \.lvp-promo-image,\n\.lvp-page \.lvp-business-image\{width:100%\}/)
})

test('página de promoções centraliza a grade e mostra validade sem repetir o título',()=>{
 const page=read('src/PublicCatalogPages.jsx')
 const css=read('src/promotions-page-ux.css')
 assert.match(page,/promotions-page-ux\.css/)
 assert.match(page,/\(p\.description\|\|''\)\.trim\(\)!==\(p\.title\|\|''\)\.trim\(\)/)
 assert.match(page,/Válida até/)
 assert.match(css,/main\.page \.promotion-grid\{grid-template-columns:repeat\(auto-fill,minmax\(260px,388px\)\);justify-content:center\}/)
})
