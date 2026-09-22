import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('imagens de empresas preservam o enquadramento no mobile',()=>{
 const css=fs.readFileSync('src/city-home.css','utf8')
 assert.match(css,/@media\(max-width:700px\)/)
 assert.match(css,/\.business-cover img/)
 assert.match(css,/object-fit:contain/)
 assert.match(css,/object-position:center/)
})
