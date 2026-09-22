import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const page=fs.readFileSync('src/ModernBusinessesPage.jsx','utf8')
test('pagina de empresas trata erros de carga sem quebrar a aplicação',()=>{
 assert.ok(!page.includes("loadPublicBusinessReviewSummaries"))
 assert.ok(page.includes("const[loadError,setLoadError]=useState('')"))
 assert.ok(page.includes("catch(err){if(!live)return"))
 assert.ok(page.includes("Não foi possível carregar as empresas."))
 assert.ok(page.includes("get_public_business_review_summaries"))
})