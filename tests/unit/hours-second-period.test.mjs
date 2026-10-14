import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {normalizeDay,formatHours} from '../../src/business-hours-utils.js'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('dia sem segundo período fica com split falso',()=>{
 const day=normalizeDay({periods:[{open:'08:00',close:'18:00'}]})
 assert.equal(day.split,false)
 assert.equal(day.periods.length,2)
})

test('dia com split marcado mantém o 2º período aberto mesmo vazio',()=>{
 const day=normalizeDay({split:true,periods:[{open:'08:00',close:'12:00'},{open:'',close:''}]})
 assert.equal(day.split,true)
})

test('dados antigos com 2º período preenchido abrem o bloco sem precisar marcar',()=>{
 const day=normalizeDay({periods:[{open:'08:00',close:'12:00'},{open:'13:30',close:'18:00'}]})
 assert.equal(day.split,true)
})

test('2º período vazio não aparece no horário público',()=>{
 const hours=formatHours({monday:{split:true,periods:[{open:'08:00',close:'12:00'},{open:'',close:''}]}})
 assert.equal(hours[0].text,'08:00 - 12:00')
})

test('editor usa a chave do dia ao adicionar e remover o 2º período',()=>{
 const editor=read('src/BusinessHoursEditor.jsx')
 assert.match(editor,/const addSecondPeriod=key=>\{/)
 assert.match(editor,/const removeSecondPeriod=key=>\{/)
 assert.match(editor,/split:true/)
 assert.match(editor,/split:false/)
 assert.match(editor,/onClick=\{\(\)=>addSecondPeriod\(key\)\}/)
 assert.match(editor,/onClick=\{\(\)=>removeSecondPeriod\(key\)\}/)
 assert.doesNotMatch(editor,/removeSecondPeriod\(key,day\)/)
})
