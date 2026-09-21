import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const page=fs.readFileSync('src/AdminBusinessesPage.jsx','utf8')
const css=fs.readFileSync('src/admin-v2.css','utf8')

test('editor de empresa organiza os controles finais em bloco próprio',()=>{
 assert.match(page,/admin-v2-business-settings/)
 assert.match(page,/admin-search-featured-control/)
 assert.match(page,/admin-v2-business-actions/)
 assert.match(css,/\.admin-v2-business-settings-main/)
 assert.match(css,/\.admin-search-featured-control/)
 assert.match(css,/\.admin-v2-business-actions/)
})
