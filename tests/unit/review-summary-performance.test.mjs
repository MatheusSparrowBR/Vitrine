import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const home=fs.readFileSync('src/CityHomePage.jsx','utf8')
const catalog=fs.readFileSync('src/ModernBusinessesPage.jsx','utf8')
const helper=fs.readFileSync('src/public-review-summary.js','utf8')
const migration=fs.readFileSync('supabase/migrations/20260920110000_batch_public_review_summaries_and_close_unused_submissions.sql','utf8')

test('cards públicos carregam avaliações em lote',()=>{
 assert.match(home,/loadPublicBusinessReviewSummaries/)
 assert.match(catalog,/loadPublicBusinessReviewSummaries/)
 assert.doesNotMatch(home,/get_public_business_reviews/)
 assert.doesNotMatch(catalog,/get_public_business_reviews/)
 assert.match(helper,/get_public_business_review_summaries/)
})

test('migração fecha a superfície pública de comunidade não utilizada',()=>{
 assert.match(migration,/create or replace function public\.get_public_business_review_summaries/)
 assert.match(migration,/revoke all on table public\.community_submissions from anon, authenticated/)
})

