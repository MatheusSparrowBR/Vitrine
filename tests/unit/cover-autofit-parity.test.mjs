import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {usesAutoFit,isDefaultCoverPosition,COVER_FRAMES} from '../../src/cover-position-utils.js'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('imagem quadrada ou alta, sem ajuste manual, aparece inteira (igual no site e no editor)',()=>{
 assert.equal(usesAutoFit({},1200,1200),true)
 assert.equal(usesAutoFit(null,1200,1200),true)
 assert.equal(usesAutoFit({},1600,900),false)
 assert.equal(usesAutoFit({},0,0),false)
})

test('qualquer ajuste manual desliga a imagem inteira: mover, zoom, esticar ou modo contain',()=>{
 assert.equal(usesAutoFit({xPct:10,yPct:0,zoom:1.2,unit:'percent'},1200,1200),false)
 assert.equal(usesAutoFit({scaleX:1.2,unit:'percent'},1200,1200),false)
 assert.equal(usesAutoFit({fit:'contain'},1200,1200),false)
 assert.equal(usesAutoFit({x:10,y:0,zoom:1.5},1200,1200),false)
 // Sem zoom, a posição antiga é limitada a zero: não há o que mover, então continua padrão.
 assert.equal(usesAutoFit({x:10,y:0},1200,1200),true)
})

test('posição padrão reconhecida nos dois formatos, e estica também conta como ajuste',()=>{
 assert.equal(isDefaultCoverPosition(null),true)
 assert.equal(isDefaultCoverPosition({xPct:0,yPct:0,zoom:1,scaleX:1,scaleY:1,unit:'percent'}),true)
 assert.equal(isDefaultCoverPosition({scaleY:1.1,unit:'percent'}),false)
})

test('medidas do editor batem com o site publicado (computador e celular)',()=>{
 const ratio=f=>f.width/f.height
 // Medido no site publicado: capa do perfil 1178x380 (computador) e 343x195 (celular); hero 1265x718 e 375x595.
 assert.ok(Math.abs(ratio(COVER_FRAMES.profile.desktop)-1178/380)<0.02)
 assert.ok(Math.abs(ratio(COVER_FRAMES.profile.mobile)-343/195)<0.02)
 assert.ok(Math.abs(ratio(COVER_FRAMES.home.desktop)-1265/718)<0.02)
 assert.ok(Math.abs(ratio(COVER_FRAMES.home.mobile)-375/595)<0.02)
})

test('página e editor usam a mesma regra de imagem inteira',()=>{
 const page=read('src/ModernBusinessProfilePage.jsx')
 assert.match(page,/if\(usesAutoFit\(coverPositionDesktop,w,h\)\)setAutoFit\(true\)/)
 assert.doesNotMatch(page,/posPadrao/)
 const editor=read('src/CoverPositionEditor.jsx')
 assert.match(editor,/autoFit=usesAutoFit\(desktop,natural\.w,natural\.h\)/)
 assert.match(editor,/cover-editor-autofit-bg/)
 assert.match(read('src/cover-position-editor.css'),/\.cover-editor-autofit-bg\{/)
})
