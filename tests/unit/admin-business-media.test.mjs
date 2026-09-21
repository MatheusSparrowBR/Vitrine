import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('admin pode editar mídia visual e galeria da empresa',()=>{
 const admin=read('src/AdminBusinessesPage.jsx')
 assert.match(admin,/import Icon from ['"]\.\/ui-icons\.jsx['"]/)
 assert.match(admin,/MEDIA_BUCKET=['"]business-media['"]/)
 assert.match(admin,/logo_path/)
 assert.match(admin,/cover_path/)
 assert.match(admin,/business_photos/)
 assert.match(admin,/storage\.from\(MEDIA_BUCKET\)/)
 assert.match(admin,/AdminBusinessMediaEditor/)
 assert.match(admin,/Adicionar mídias/)
 assert.match(admin,/Trocar capa/)
 assert.match(admin,/Trocar logo/)
 assert.match(admin,/Excluir esta mídia da galeria/)
})
