import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const page=fs.readFileSync('src/AdminBusinessesPage.jsx','utf8')
const css=fs.readFileSync('src/admin-v2.css','utf8')

test('bloco final do editor apresenta visibilidade e busca em destaque de forma organizada',()=>{
 assert.match(page,/admin-v2-business-visibility/)
 assert.match(page,/admin-v2-business-section-title/)
 assert.match(page,/admin-search-featured-selector/)
 assert.match(page,/admin-v2-business-actions-copy/)
 assert.match(css,/\.admin-v2-business-checks\{display:grid;grid-template-columns:repeat\(2/)
 assert.match(css,/\.admin-search-featured-control\{display:grid;grid-template-columns:minmax\(0,1\.3fr\)/)
 assert.match(css,/\.admin-v2-business-actions\{display:flex;justify-content:space-between/)
})
