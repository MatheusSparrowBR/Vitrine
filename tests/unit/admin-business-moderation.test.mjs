import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const page=fs.readFileSync('src/AdminBusinessesPage.jsx','utf8')
const migration=fs.readFileSync('supabase/migrations/20260918130000_allow_admin_moderation_overrides.sql','utf8')

test('ações de moderação confirmam o valor persistido antes de atualizar a fila',()=>{
 assert.match(page,/select\('id,featured,verified'\)/)
 assert.match(page,/maybeSingle\(\)/)
 assert.match(page,/if\(!data\)/)
 assert.match(page,/data\[field\]!==nextValue/)
})

test('sincronização de plano não sobrescreve uma decisão manual do administrador',()=>{
 assert.match(migration,/current_setting\('vitrine\.plan_sync', true\) = 'on'/)
 assert.match(migration,/if private\.is_admin\(\) then/)
 assert.match(migration,/return new;/)
})
