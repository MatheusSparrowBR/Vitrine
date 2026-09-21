import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('gestor principal de eventos usa data final e novo layout',()=>{
 const admin=read('src/AdminEventsMain.jsx')
 assert.match(admin,/event_end_date/)
 assert.match(admin,/Data de início/)
 assert.match(admin,/Data de fim/)
 assert.match(admin,/displayRange/)
 assert.match(admin,/vl-admin-event-date-range/)
 assert.match(admin,/admin-events-end-date\.css/)
})

test('estilos do gestor principal organizam período, seções e responsividade',()=>{
 const css=read('src/admin-events-end-date.css')
 assert.match(css,/\.vl-admin-event-section/)
 assert.match(css,/\.vl-admin-event-date-range/)
 assert.match(css,/grid-template-columns:minmax\(420px,470px\)/)
 assert.match(css,/@media\(max-width:600px\)/)
})
