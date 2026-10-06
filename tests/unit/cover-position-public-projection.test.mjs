import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

test('perfil público recebe enquadramento de capa pela projeção pública',()=>{
 const migration=fs.readFileSync('supabase/migrations/20261006160000_expose_public_cover_positioning.sql','utf8')
 const page=fs.readFileSync('src/ModernBusinessProfilePage.jsx','utf8')
 assert.ok(migration.includes('b.cover_position_desktop'))
 assert.ok(migration.includes('b.cover_position_mobile'))
 assert.ok(page.includes('b?.cover_position_desktop'))
 assert.ok(page.includes('b?.cover_position_mobile'))
})
