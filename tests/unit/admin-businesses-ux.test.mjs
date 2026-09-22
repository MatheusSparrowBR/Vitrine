import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('admin empresas prioriza pendências e oferece filtros rápidos',()=>{
 const page=read('src/AdminBusinessesPage.jsx')
 const css=read('src/admin-v2.css')
 assert.match(page,/quickFilter/)
 assert.match(page,/Sem vínculo/)
 assert.match(page,/Não verificadas/)
 assert.match(page,/Destaques/)
 assert.match(page,/Suspensas/)
 assert.match(page,/stats\.unowned/)
 assert.match(page,/stats\.attention/)
 assert.match(page,/ATENÇÃO NECESSÁRIA/)
 assert.match(css,/\.admin-business-attention/)
 assert.match(css,/\.admin-business-quick-filters/)
})

test('admin empresas mostra saúde e acesso rápido ao resumo da empresa',()=>{
 const page=read('src/AdminBusinessesPage.jsx')
 const css=read('src/admin-v2.css')
 assert.match(page,/healthFor/)
 assert.match(page,/admin-business-health/)
 assert.match(page,/Ver ↗/)
 assert.match(page,/VISÃO RÁPIDA/)
 assert.match(page,/Ver página pública/)
 assert.match(page,/admin-business-action-menu/)
 assert.match(css,/\.admin-business-health/)
 assert.match(css,/\.admin-business-inspect/)
})

test('empresa sem proprietário pode ser vinculada diretamente pela fila',()=>{
 const page=read('src/AdminBusinessesPage.jsx')
 assert.match(page,/className="admin-business-link-btn"/)
 assert.match(page,/startEdit\(b\)/)
 assert.match(page,/Vincular proprietário/)
})
