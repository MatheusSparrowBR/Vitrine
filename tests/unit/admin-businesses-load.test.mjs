import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('fila administrativa de empresas captura a quarta consulta de proprietários',()=>{
 const source=read('src/AdminBusinessesPage.jsx')
 assert.match(source,/const\[c,b,cat,o\]=await Promise\.all\(\[/)
 assert.match(source,/db\.rpc\('admin_list_business_owners'\)/)
 assert.match(source,/setOwners\(o\.data\|\|\[\]\)/)
 assert.match(source,/o\.error\?/)
})
