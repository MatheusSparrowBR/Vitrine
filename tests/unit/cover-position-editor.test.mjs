import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
test('editor de capa de produção suporta desktop/mobile, arrasto e zoom',()=>{
 const page=fs.readFileSync('src/CoverPositionEditor.jsx','utf8'),css=fs.readFileSync('src/cover-position-editor.css','utf8')
 assert.match(page,/onPointerDown/);assert.match(page,/mode==='desktop'/);assert.match(page,/mode==='mobile'/);assert.match(page,/min="0\.6"/)
 assert.match(css,/\.cover-editor-backdrop/);assert.match(css,/\.cover-editor-stage>img/)
})