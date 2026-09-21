import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('card público de eventos preserva os parágrafos digitados no admin',()=>{
 const page=read('src/EventsPage.jsx')
 const css=read('src/events.css')
 assert.match(page,/className="vl-event-description"/)
 assert.match(css,/\.vl-event-description\{white-space:pre-wrap/)
 assert.match(css,/overflow-wrap:anywhere/)
 assert.match(css,/line-height:1\.65/)
})
