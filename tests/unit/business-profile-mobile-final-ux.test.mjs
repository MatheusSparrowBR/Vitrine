import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const css=fs.readFileSync('src/modern-business-profile-ux.css','utf8')
test('perfil mobile usa badges compactas em duas colunas e topo reduzido',()=>{
 assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important'))
 assert.ok(css.includes('height:32px!important'))
 assert.ok(css.includes('.mbp-rating-summary'))
 assert.ok(css.includes('.mbp-gallery-main{height:185px!important}'))
 assert.ok(css.includes('.mbp-contact-card:first-child{grid-column:1/-1!important}'))
})