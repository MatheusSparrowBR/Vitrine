import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=()=>fs.readFileSync('src/LegalPages.jsx','utf8')

test('documentos legais usam os dados oficiais informados para o lançamento',()=>{
  const content=read()
  assert.match(content,/officialName='Vitrine Local'/)
  assert.match(content,/contactEmail='contato@vitrinelocal\.net'/)
  assert.match(content,/Nome\/razão social informada/)
  assert.match(content,/contato@vitrinelocal\.net/)
  assert.doesNotMatch(content,/deverá ser preenchida antes do lançamento/)
  assert.doesNotMatch(content,/preencha a identificação jurídica/)
  assert.doesNotMatch(content,/CNPJ/)
  assert.doesNotMatch(content,/endereço do controlador/)
})
