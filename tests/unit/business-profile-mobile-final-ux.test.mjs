import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const css=fs.readFileSync('src/modern-business-profile-ux.css','utf8')
test('perfil mobile usa badges compactas e topo reduzido',()=>{
 assert.ok(css.includes('mbp-identity-badges'))
 assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important'))
 assert.ok(css.includes('mbp-rating-summary'))
 assert.ok(css.includes('mbp-gallery-main'))
 assert.ok(css.includes('mbp-contact-card:first-child'))
 assert.ok(css.includes('.mbp-primary-cta'))
})
 
test('perfil mobile mantém informações e endereço alinhados na mesma largura',()=>{
 assert.match(css,/\.mbp-layout>\.mbp-main-column\{[\s\S]*display:contents!important/)
 assert.match(css,/\.mbp-layout>\.mbp-main-column\{[\s\S]*width:100%!important/)
 assert.match(css,/\.mbp-layout>\.mbp-main-column>\.mbp-panel\{[\s\S]*width:100%!important/)
 assert.match(css,/\.mbp-layout>\.mbp-sidebar\{[\s\S]*width:100%!important/)
 assert.match(css,/\.mbp-layout>\.mbp-sidebar\{[\s\S]*order:2!important/)
 assert.match(css,/\.mbp-layout>\.mbp-main-column>\.vl-profile-reviews-host,\n  \.mbp-layout>\.vl-profile-reviews-host\{[\s\S]*order:3!important/)
})

test('horarios do perfil mobile ficam maiores sem estourar o card',()=>{
 assert.match(css,/\.mbp-hours li\{[\s\S]*font-size:10px!important/)
 assert.match(css,/\.mbp-hours li\{[\s\S]*padding:9px 0!important/)
 assert.match(css,/\.mbp-hours li strong,\n  \.mbp-hours li span\{[\s\S]*font-size:10px!important/)
 assert.match(css,/\.mbp-note\{[\s\S]*font-size:9px!important/)
})

 
test('horarios desktop ficam legíveis sem alterar a estrutura do card',()=>{
 assert.match(css,/@media\(min-width:761px\)\{[\s\S]*\.mbp-hours li\{[\s\S]*font-size:10px!important/)
 assert.match(css,/\.mbp-hours li strong,\n  \.mbp-hours li span\{[\s\S]*font-size:10px!important/)
})


test('horarios desktop usam tipografia maior para leitura',()=>{
 assert.match(css,/@media\(min-width:761px\)\{[\s\S]*\.mbp-hours li\{[\s\S]*font-size:11px!important/)
 assert.match(css,/\.mbp-hours li strong,\n  \.mbp-hours li span\{[\s\S]*font-size:11px!important/)
 assert.match(css,/\.mbp-side-title>span\{[\s\S]*font-size:10px!important/)
})


test('perfil mobile usa Início no primeiro item e mantém quatro células de navegação com o mesmo tamanho',()=>{
 const page=fs.readFileSync('src/ModernBusinessProfilePage.jsx','utf8')
 assert.match(page,/className="mbp-mobile-home"/)
 assert.ok(page.includes("href={'/'+citySlug}"))
 assert.match(page,/<span>Início<\/span>/)
 assert.doesNotMatch(page,/<span>Perfil<\/span>/)
 assert.match(css,/\.mbp-mobile-bottom>a,\n \.mbp-mobile-bottom>\.mbp-relationship-row-compact\{[\s\S]*width:100%/)
 assert.match(css,/\.mbp-mobile-bottom>a,\n \.mbp-mobile-bottom>\.mbp-relationship-row-compact\{[\s\S]*height:54px/)
 assert.match(css,/\.mbp-mobile-bottom\{[\s\S]*grid-template-columns:repeat\(4,minmax\(0,1fr\)/)
})
