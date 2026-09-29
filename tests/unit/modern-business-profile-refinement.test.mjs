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
 const css=read('src/modern-business-profile-refinement.css')
 assert.match(css,/\.mbp-gallery-main\{height:330px/)
 assert.match(css,/\.mbp-rating-summary/)
 assert.match(css,/\.mbp-contact-grid\{grid-template-columns:repeat\(4/)
 assert.match(css,/\.mbp-profile-shortcuts\{grid-template-columns:repeat\(3,minmax\(0,1fr\))/
 assert.match(css,/\.mbp-primary-cta/)
})
