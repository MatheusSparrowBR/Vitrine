import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('página do evento usa a barra de ações em blocos iguais',()=>{
 const page=read('src/EventProfilePage.jsx')
 assert.match(page,/<EventActionBar saved=\{saved\} onToggleSave=\{toggleSave\} onDownloadIcs=\{downloadIcs\}/)
 assert.match(page,/onShare=\{shareEvent\}/)
 assert.doesNotMatch(page,/vl-event-profile-secondary-actions/)
 assert.match(page,/label="Criar cartão para Instagram e WhatsApp"/)
})

test('agenda junta Google Agenda e arquivo .ics num menu; menu fecha fora e com Esc',()=>{
 const bar=read('src/EventActionBar.jsx')
 for(const label of ['Salvar','Salvo','Agenda','Como chegar','Google Agenda','Apple, Outlook e outros'])assert.match(bar,new RegExp(label))
 assert.match(bar,/aria-expanded=\{agendaOpen\}/)
 assert.match(bar,/e\.key === 'Escape'/)
 assert.match(bar,/document\.addEventListener\('pointerdown', closeOutside\)/)
 assert.match(bar,/\{directionsHref && \(/)
 const css=read('src/event-profile.css')
 assert.match(css,/\.ev-actions\{display:grid;grid-auto-flow:column;grid-auto-columns:minmax\(0,1fr\)/)
})
