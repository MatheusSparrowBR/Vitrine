import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('cards de empresas em destaque preservam a imagem no mobile',()=>{
 const css=fs.readFileSync('src/public-home.css','utf8')
 assert.match(css,/@media \(max-width:760px\)/)
 assert.match(css,/\.lvp-business-image img/)
 assert.match(css,/object-fit:contain/)
 assert.match(css,/object-position:center/)
})
