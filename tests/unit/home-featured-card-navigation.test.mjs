import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

test('imagem e capa das empresas em destaque abrem o perfil da empresa',()=>{
 const page=fs.readFileSync('src/CityHomePage.jsx','utf8')
 const css=fs.readFileSync('src/public-home.css','utf8')
 assert.match(page,/className='lvp-business-image-link'/)
 assert.match(page,/href=\{base+'\/empresa\/'+encodeURIComponent\(b\.slug\)\}/)
 assert.match(css,/\.home-lab-migration-featured \.lvp-business-image-link\{[\s\S]*position:absolute!important/)
 assert.match(css,/\.home-lab-migration-featured \.lvp-business-image-link\{[\s\S]*inset:0!important/)
})
