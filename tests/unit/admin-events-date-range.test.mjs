import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('cadastro administrativo de eventos possui período com data de início e fim',()=>{
 const admin=read('src/AdminEventsPanel.jsx')
 assert.match(admin,/event_end_date/)
 assert.match(admin,/Data de início/)
 assert.match(admin,/Data de fim/)
 assert.match(admin,/form\.event_end_date<form\.event_date/)
 assert.match(admin,/event_end_date:form\.event_end_date/)
 assert.match(admin,/min=\{form\.event_date\|\|undefined\}/)
})

test('agenda pública considera a data final para manter eventos em período vigente',()=>{
 const events=read('src/EventsPage.jsx')
 const home=read('src/CityHomePage.jsx')
 assert.match(events,/event_end_date/)
 assert.match(events,/gte\('event_end_date',projectTodayISO\(\)\)/)
 assert.match(events,/formatDateRange/)
 assert.match(home,/event_end_date/)
 assert.match(home,/gte\('event_end_date',projectTodayISO\(\)\)/)
})

test('migração de eventos adiciona data final e garante intervalo válido',()=>{
 const migration=read('supabase/migrations/20260921162000_add_event_end_date.sql')
 assert.match(migration,/add column if not exists event_end_date date/)
 assert.match(migration,/set event_end_date = event_date/)
 assert.match(migration,/alter column event_end_date set not null/)
 assert.match(migration,/events_date_range_check/)
 assert.match(migration,/event_end_date >= event_date/)
})
