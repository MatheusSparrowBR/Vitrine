import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('editor administrativo usa o componente oficial de atendimento e horários',()=>{
 const admin=read('src/AdminBusinessesPage.jsx')
 assert.match(admin,/import BusinessHoursEditor from ['"]\.\/BusinessHoursEditor\.jsx['"]/)
 assert.match(admin,/business-service-badges\.css/)
 assert.match(admin,/business-hours\.css/)
 assert.match(admin,/admin-business-hours\.css/)
 assert.match(admin,/opening_hours/)
 assert.match(admin,/BusinessHoursEditor value={form\.opening_hours}/)
 assert.match(admin,/has_delivery/)
 assert.match(admin,/has_pickup/)
 assert.match(admin,/has_dine_in/)
 assert.match(admin,/admin-business-service-grid/)
})

test('salvamento administrativo persiste horário e opções de atendimento',()=>{
 const admin=read('src/AdminBusinessesPage.jsx')
 assert.match(admin,/opening_hours:form\.opening_hours\|\|{}/)
 assert.match(admin,/has_delivery:Boolean(form\.has_delivery)/)
 assert.match(admin,/has_pickup:Boolean(form\.has_pickup)/)
 assert.match(admin,/has_dine_in:Boolean(form\.has_dine_in)/)
})
