import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('admin reviews supports company filtering and review editing',()=>{
 const src=read('src/AdminReviewsPage.jsx')
 assert.match(src,/Todas as empresas/)
 assert.match(src,/businessId/)
 assert.match(src,/Editar/)
 assert.match(src,/Salvar alterações/)
 assert.match(src,/edited_at/)
 assert.match(src,/Editado por administrador/)
})

test('business cards render published review average and stars',()=>{
 const src=read('src/ModernBusinessesPage.jsx')
 assert.match(src,/business_reviews/)
 assert.match(src,/rating/)
 assert.match(src,/mbl-rating/)
 assert.match(src,/mbl-stars/)
})

test('public review list exposes administrator edit marker',()=>{
 const src=read('src/BusinessReviews.jsx')
 assert.match(src,/edited_at/)
 assert.match(src,/Editado por administrador/)
})

test('review edit metadata migration is versioned',()=>{
 const sql=read('supabase/migrations/20260914152000_admin_review_editing_and_public_review_metadata.sql')
 const fix=read('supabase/migrations/20260914152100_admin_review_edit_trigger_security_fix.sql')
 assert.match(sql,/ADD COLUMN IF NOT EXISTS edited_at/)
 assert.match(sql,/ADD COLUMN IF NOT EXISTS edited_by/)
 assert.match(sql,/trg_stamp_admin_review_edit/)
 assert.match(sql,/admin_edit/)
 assert.match(fix,/actor_role = 'admin'/)
})
