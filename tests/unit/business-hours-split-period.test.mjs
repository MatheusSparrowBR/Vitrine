import{test}from'node:test'
import assert from'node:assert/strict'
import{formatHours,getOpenStatus,normalizeHours}from'../../src/business-hours-utils.js'

test('normaliza horarios antigos de um período sem perder compatibilidade',()=>{
 const hours=normalizeHours({monday:{open:'08:00',close:'18:00',closed:false}})
 assert.deepEqual(hours.monday.periods,[{open:'08:00',close:'18:00'},{open:'',close:''}])
 assert.equal(formatHours({monday:{open:'08:00',close:'18:00',closed:false}})[0].text,'08:00 - 18:00')
})

test('formata dois períodos com pausa de almoço',()=>{
 const value={monday:{closed:false,periods:[{open:'08:00',close:'12:00'},{open:'13:30',close:'18:00'}]}}
 assert.equal(formatHours(value)[0].text,'08:00 - 12:00 - 13:30 - 18:00')
})

test('status fica fechado no intervalo de almoço e reabre no segundo período',()=>{
 const value={monday:{closed:false,periods:[{open:'08:00',close:'12:00'},{open:'13:30',close:'18:00'}]}}
 const lunch=new Date(2026,9,5,12,30)
 const afternoon=new Date(2026,9,5,14,0)
 assert.deepEqual(getOpenStatus(value,lunch),{open:false,label:'Fechado agora',detail:'Reabre às 13:30'})
 assert.deepEqual(getOpenStatus(value,afternoon),{open:true,label:'Aberto agora',detail:'Fecha às 18:00'})
})
