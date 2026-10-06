import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

test('editor de capa público só é habilitado para admin ou dono da empresa',()=>{
 const page=fs.readFileSync('src/ModernBusinessProfilePage.jsx','utf8')
 assert.match(page,/profile?.role==='admin'||positionData?.owner_id===user.id/)
 assert.match(page,/setCanEditCover(editable)/)
 assert.match(page,/canEditCover&&<CoverPositionEditor/)
})

test('salvar enquadramento atualiza apenas a empresa carregada',()=>{
 const page=fs.readFileSync('src/ModernBusinessProfilePage.jsx','utf8')
 assert.match(page,/cover_position_desktop:desktop,cover_position_mobile:mobile/)
 assert.match(page,/\.from\('businesses'\)\.update\(\{cover_position_desktop:desktop,cover_position_mobile:mobile,updated_at:new Date\(\)\.toISOString\(\)\}\)\.eq\('id',business\.id\)/)
})

test('owner workspace oferece ajuste da capa após upload',()=>{
 const page=fs.readFileSync('src/AccountWorkspacePage.jsx','utf8')
 assert.match(page,/if(kind==='cover')setCoverEditorOpen(true)/)
 assert.match(page,/Ajustar enquadramento/)
 assert.match(page,/cover_position_desktop/)
 assert.match(page,/cover_position_mobile/)
})
