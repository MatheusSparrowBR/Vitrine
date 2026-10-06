import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const editor=fs.readFileSync('src/BusinessHoursEditor.jsx','utf8')
const css=fs.readFileSync('src/business-hours.css','utf8')

test('editor de horarios usa segundo período opcional e estado de dia fechado',()=>{
 assert.ok(editor.includes('Adicionar 2º período'))
 assert.ok(editor.includes('Remover 2º período'))
 assert.ok(editor.includes('hours-status-toggle'))
 assert.ok(editor.includes('Empresa fechada neste dia'))
})

test('layout dos horários usa cartões por dia e períodos separados',()=>{
 assert.ok(css.includes('.hours-day-card'))
 assert.ok(css.includes('.hours-period'))
 assert.ok(css.includes('.hours-break-divider'))
 assert.ok(css.includes('.hours-period-fields'))
})
