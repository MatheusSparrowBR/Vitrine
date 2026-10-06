import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

test('editor de capa Lab existe de forma isolada, sem dependência de banco',()=>{
 const page=fs.readFileSync('src/CoverPositionLabPage.jsx','utf8')
 const css=fs.readFileSync('src/cover-position-lab.css','utf8')
 assert.match(page,/localStorage.getItem\('vitrine-cover-position-lab'\)/)
 assert.match(page,/inputRef/)
 assert.match(page,/type="range"/)
 assert.match(page,/mode==='desktop'/)
 assert.match(page,/mode==='mobile'/)
 assert.match(css,/\.cplab-stage\{[\s\S]*touch-action:none/)
 assert.match(css,/\.cplab-stage-wrap\.mobile \.cplab-stage\{/)
})


test('editor de capa permite reduzir o zoom abaixo de 1x',()=>{
 const page=fs.readFileSync('src/CoverPositionLabPage.jsx','utf8')
 assert.match(page,/clamp\(current\.zoom-\.05,0\.6,1\.8\)/)
 assert.match(page,/type="range" min="0\.6" max="1\.8"/)
 assert.match(page,/zoom:0\.85/)
})
