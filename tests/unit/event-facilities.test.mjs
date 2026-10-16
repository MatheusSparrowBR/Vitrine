import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {FACILITY_GROUPS,normalizeFacilities,facilityGroupsFor} from '../../src/event-facilities.js'
import {normalizeEventTheme} from '../../src/event-theme.js'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('catálogo: seis grupos, códigos únicos e todos os itens da referência',()=>{
 assert.deepEqual(FACILITY_GROUPS.map(g=>g.title),['Infraestrutura','Tecnologia','Segurança','Serviços de apoio','Estacionamento e acesso','Conforto'])
 const ids=FACILITY_GROUPS.flatMap(g=>g.items.map(i=>i.id))
 assert.equal(new Set(ids).size,ids.length)
 const labels=FACILITY_GROUPS.flatMap(g=>g.items.map(i=>i.label))
 for(const label of ['Acessibilidade','Banheiros adaptados','Free WiFi','Iluminação cênica','Brigada de incêndio','Recepção / Credenciamento','Transporte / Transfer','Lounge / Sofás','Decoração personalizada'])assert.ok(labels.includes(label),label)
})

test('normalização: só códigos do catálogo, sem repetir, na ordem do catálogo',()=>{
 assert.deepEqual(normalizeFacilities(['palco','wifi','inventado','wifi',null,'acessibilidade']),['acessibilidade','palco','wifi'])
 assert.deepEqual(normalizeFacilities('wifi'),[])
 assert.deepEqual(normalizeEventTheme({facilities:['som','<script>']}).facilities,['som'])
 assert.deepEqual(normalizeEventTheme(null).facilities,[])
})

test('página mostra só os grupos com algo marcado',()=>{
 const groups=facilityGroupsFor(['estacionamento','wifi','som'])
 assert.deepEqual(groups.map(g=>g.title),['Tecnologia','Estacionamento e acesso'])
 assert.deepEqual(groups[0].items.map(i=>i.label),['Free WiFi','Som profissional'])
 assert.deepEqual(facilityGroupsFor([]),[])
})

test('editor e página ligados; sem nada marcado a seção não aparece',()=>{
 const sections=read('src/EventThemeSections.jsx')
 assert.match(sections,/\{theme\.facilities\.length > 0 && <EventFacilities selected=\{theme\.facilities\} \/>\}/)
 assert.match(read('src/EventFacilities.jsx'),/if \(!groups\.length\) return null/)
 const editor=read('src/AdminEventPageEditor.jsx')
 assert.match(editor,/<h3>Facilidades do evento<\/h3>/)
 assert.match(editor,/FACILITY_GROUPS\.map\(group =>/)
 assert.match(editor,/set\('facilities', e\.target\.checked \? \[\.\.\.draft\.facilities, item\.id\] : draft\.facilities\.filter\(id => id !== item\.id\)\)/)
})
