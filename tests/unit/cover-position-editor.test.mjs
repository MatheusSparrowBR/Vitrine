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

test('editor permite alongamento independente de largura e altura',()=>{
 const page=fs.readFileSync('src/CoverPositionEditor.jsx','utf8')
 assert.ok(page.includes('scaleX'))
 assert.ok(page.includes('scaleY'))
 assert.match(page,/aria-label="Largura da capa"/)
 assert.match(page,/aria-label="Altura da capa"/)
 assert.ok(page.includes("scale('+current.zoom+') scaleX('+current.scaleX+') scaleY('+current.scaleY+')"))
})

test('perfil público usa exatamente o mesmo transform salvo pelo editor',()=>{
 const page=fs.readFileSync('src/ModernBusinessProfilePage.jsx','utf8')
 const css=fs.readFileSync('src/modern-business-profile-lab-style.css','utf8')
 assert.ok(page.includes('mbp-cover-positioned'))
 assert.ok(page.includes('--cover-scalex-desktop'))
 assert.ok(page.includes('--cover-scaley-mobile'))
 assert.match(css,/img\.mbp-cover-positioned\{[\s\S]*object-fit:contain!important/)
 assert.match(css,/scaleX\(var\(--cover-scalex-desktop\)\) scaleY\(var\(--cover-scaley-desktop\)\)/)
 assert.match(css,/scaleX\(var\(--cover-scalex-mobile\)\) scaleY\(var\(--cover-scaley-mobile\)\)/)
})

test('editor usa a mesma proporção do frame final desktop e mobile',()=>{
 const page=fs.readFileSync('src/CoverPositionEditor.jsx','utf8'),css=fs.readFileSync('src/cover-position-editor.css','utf8')
 assert.match(page,/aspectRatio:mode==='desktop'\?'1180 \/ 330':'1\.87 \/ 1'/)
 assert.match(page,/left:'calc\(50% \+ '\+current\.xPct\+'%\)'/)
 assert.match(css,/\.cover-editor-stage\{position:relative;width:100%;height:auto/)
})

test('posições antigas em pixels são convertidas para percentuais responsivos',()=>{
 const util=fs.readFileSync('src/cover-position-utils.js','utf8')
 assert.match(util,/raw\.unit==='percent'\|\|raw\.xPct!=null\|\|raw\.yPct!=null/)
 assert.match(util,/xPct:\(Number\(raw\.x\)\|\|0\)\/ref\.width\*100/)
 assert.match(util,/yPct:\(Number\(raw\.y\)\|\|0\)\/ref\.height\*100/)
})

test('perfil usa posicionamento percentual com o mesmo frame responsivo do editor',()=>{
 const page=fs.readFileSync('src/ModernBusinessProfilePage.jsx','utf8'),css=fs.readFileSync('src/modern-business-profile-lab-style.css','utf8')
 assert.match(page,/coverPositionCssVars\(coverPositionDesktop,'desktop'\)/)
 assert.match(css,/position:absolute!important;display:block!important;width:100%!important/)
 assert.match(css,/left:calc\(50% \+ var\(--cover-x-desktop\)\)/)
 assert.match(css,/left:calc\(50% \+ var\(--cover-x-mobile\)\)/)
})
