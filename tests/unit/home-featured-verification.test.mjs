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

test('badge de verificada permanece compacto dentro do titulo do card',()=>{
 const css=fs.readFileSync('src/public-home.css','utf8')
 assert.match(css,/\.home-lab-migration-featured \.home-lab-migration-card \.lvp-migration-title-row \.verified\{/)
 assert.match(css,/position:static!important/)
 assert.match(css,/width:auto!important/)
 assert.match(css,/height:auto!important/)
 assert.match(css,/max-width:max-content!important/)
 assert.doesNotMatch(css,/\.home-lab-migration-featured \.home-lab-migration-card \.verified\{[\s\S]*position:absolute!important/)
})

test('controles do card de destaque permanecem visiveis dentro da imagem',()=>{
 const css=fs.readFileSync('src/public-home.css','utf8')
 assert.match(css,/\.lvp-migration-save\{[\s\S]*z-index:6!important/)
 assert.match(css,/\.lvp-migration-save\{[\s\S]*width:34px!important/)
 assert.match(css,/\.lvp-migration-save\{[\s\S]*min-width:34px!important/)
 assert.match(css,/\.lvp-migration-status-badge\{[\s\S]*max-width:calc\(100% - 105px\)!important/)
 assert.match(css,/\.home-lab-migration-featured \.home-lab-migration-card \.lvp-business-image\{[\s\S]*width:100%!important/)
 assert.match(css,/\.home-lab-migration-featured \.home-lab-migration-card \.lvp-business-image\{[\s\S]*overflow:hidden!important/)
})
