import{test}from'node:test'
import assert from'node:assert/strict'
import{normalizeCoverPosition}from'../../src/cover-position-utils.js'

test('posição de capa persistida é normalizada dentro dos limites do editor',()=>{
 const value=normalizeCoverPosition({unit:'percent',xPct:999,yPct:-999,zoom:9,scaleX:0,scaleY:4})
 assert.deepEqual(value,{xPct:50,yPct:-50,zoom:1.8,scaleX:0.6,scaleY:1.8,unit:'percent'})
})
