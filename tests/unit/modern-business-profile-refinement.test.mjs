import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('perfil público mantém ações organizadas em uma única barra de utilidades',()=>{
 const page=read('src/ModernBusinessProfilePage.jsx')
 assert.match(page,/className="mbp-profile-shortcuts"/)
 assert.match(page,/data-track="maps"/)
 assert.match(page,/Como chegar/)
 assert.doesNotMatch(page,/mbp-secondary-actions/)
})

test('refinamento visual do perfil define hierarquia para galeria, contato e ações',()=>{
 const css=read('src/modern-business-profile-refinement.css')+read('src/modern-business-profile-ux.css')
 assert.match(css,/\.mbp-gallery-main\{height:330px/)
 assert.match(css,/\.mbp-rating-summary/)
 assert.match(css,/\.mbp-contact-grid\{grid-template-columns:repeat\(4/)
 assert.ok(css.includes('.mbp-profile-shortcuts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));'))
 assert.match(css,/\.mbp-primary-cta/)
})


test('perfil desktop não posiciona ações sobre a galeria e preserva a imagem principal',()=>{
 const css=read('src/modern-business-profile-lab-style.css')
 assert.match(css,/@media\(min-width:1051px\)\{[\s\S]*\.mbp-profile-top \.mbp-profile-shortcuts\{[\s\S]*position:static!important/)
 assert.match(css,/\.mbp-profile-top \.mbp-gallery\{[\s\S]*overflow:hidden!important/)
 assert.match(css,/\.mbp-profile-top \.mbp-gallery-main img\{[\s\S]*object-fit:contain!important/)
})


test('galeria do perfil mantém a capa centralizada e as fotos em faixa inferior',()=>{
 const css=read('src/modern-business-profile-lab-style.css')
 assert.match(css,/\.mbp-profile-top \.mbp-gallery\{[\s\S]*grid-template-columns:1fr!important/)
 assert.match(css,/\.mbp-profile-top \.mbp-gallery\{[\s\S]*grid-template-rows:minmax\(340px,380px\) 112px!important/)
 assert.match(css,/\.mbp-profile-top \.mbp-gallery-main img\{[\s\S]*object-fit:contain!important/)
 assert.match(css,/\.mbp-profile-top \.mbp-gallery-main img\{[\s\S]*object-position:center!important/)
 assert.match(css,/\.mbp-profile-top \.mbp-gallery-side\{[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)!important/)
})
