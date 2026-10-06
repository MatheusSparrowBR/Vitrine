import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
test('editor de capa de produção suporta desktop/mobile, arrasto e zoom',()=>{
 const page=fs.readFileSync('src/CoverPositionEditor.jsx','utf8'),css=fs.readFileSync('src/cover-position-editor.css','utf8')
 assert.match(page,/onPointerDown/);assert.match(page,/mode==='desktop'/);assert.match(page,/mode==='mobile'/);assert.match(page,/min="0\.6"/)
 assert.match(css,/\.cover-editor-backdrop/);assert.match(css,/\.cover-editor-stage>img/)
})

test('área segura da capa prioriza a região superior útil do perfil e reserva a faixa inferior',()=>{
 const css=fs.readFileSync('src/cover-position-editor.css','utf8')
 assert.match(css,/\.cover-editor-safe\{position:absolute;left:9%;right:9%;top:6%;bottom:26%/)
 assert.match(css,/Evite conteúdo importante na faixa inferior/)
})
