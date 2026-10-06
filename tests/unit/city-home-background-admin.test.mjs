import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

test('migration cria metadados e bucket público controlado por cidade ativa',()=>{
 const migration=fs.readFileSync('supabase/migrations/20261006173000_add_city_home_background.sql','utf8')
 assert.ok(migration.includes('home_background_url text'))
 assert.ok(migration.includes('home_background_path text'))
 assert.ok(migration.includes("'city-home-media'"))
 assert.ok(migration.includes("c.active = true"))
 assert.ok(migration.includes('public.is_admin()'))
})

test('admin de cidades possui upload e remoção do fundo personalizado',()=>{
 const admin=fs.readFileSync('src/cities-admin.js','utf8')
 assert.ok(admin.includes('home_background_url'))
 assert.ok(admin.includes("city-home-media"))
 assert.ok(admin.includes('Adicionar imagem'))
 assert.ok(admin.includes('Remover imagem'))
})
