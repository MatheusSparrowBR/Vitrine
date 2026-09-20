import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const page=fs.readFileSync('src/CityHomePage.jsx','utf8')

test('empresas em destaque exibem verificação somente quando a empresa é verificada',()=>{
 assert.match(page,/from\('public_business_directory'\)/)
 assert.match(page,/featured,verified,category_name,created_at/)
 assert.match(page,/\{b\.verified&&<span className="verified">✓ Verificada<\/span>\}/)
})

test('empresas em destaque carregam e exibem a média das avaliações publicadas',()=>{
 assert.match(page,/loadPublicBusinessReviewSummaries/)
 const summary=fs.readFileSync('src/public-review-summary.js','utf8')
 assert.match(summary,/get_public_business_review_summaries/)
 assert.match(page,/lvp-card-rating/)
 assert.match(page,/avg\.toFixed\(1\)/)
})

