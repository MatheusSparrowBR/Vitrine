import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const page=fs.readFileSync('src/ModernBusinessesPage.jsx','utf8')
test('pagina de empresas mantém o carregamento público e avaliações em lote',()=>{
 assert.ok(page.includes('loadPublicBusinessReviewSummaries'))
 assert.ok(page.includes("public_business_directory"))
 assert.ok(page.includes("search_featured"))
 assert.ok(page.includes("searchScore"))
})