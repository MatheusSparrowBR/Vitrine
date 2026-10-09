import{test}from'node:test'
import assert from'node:assert/strict'
import{normalizeCoverPosition}from'../../src/cover-position-utils.js'

test('posição de capa persistida é normalizada dentro dos limites do editor',()=>{
 const value=normalizeCoverPosition({unit:'percent',xPct:999,yPct:-999,zoom:9,scaleX:0,scaleY:4})
 // Capa preenche a área: escala mínima 1 e deslocamento limitado para não deixar espaço vazio
 assert.deepEqual(value,{xPct:40,yPct:-50,zoom:1.8,scaleX:1,scaleY:1.8,unit:'percent'})
 const logo=normalizeCoverPosition({unit:'percent',xPct:999,zoom:0.5,scaleX:0.6,fit:'contain'})
 assert.equal(logo.fit,'contain')
 assert.equal(logo.zoom,0.6)
})
