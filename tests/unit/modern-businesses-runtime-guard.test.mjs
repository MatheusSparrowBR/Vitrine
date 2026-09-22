import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const page=fs.readFileSync('src/ModernBusinessesPage.jsx','utf8')
test('pagina de empresas protege carregamento e mantém avaliações em lote',()=>{
 assert.match(page,/loadPublicBusinessReviewSummaries/)
 assert.match(page,/const\[loadError,setLoadError\]=useState\(''\)/)
 assert.match(page,/catch\(err\)\{if\(!live\)return/)
 assert.match(page,/get_public_business_review_summaries/)
})