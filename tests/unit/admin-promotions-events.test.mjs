import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('promoções expiradas são arquivadas no banco e a tela administrativa inicia sem arquivadas',()=>{
 const migration=read('supabase/migrations/20260911022000_archive_expired_promotions_automatically.sql')
 const page=read('src/AdminPromotionsPage.jsx')
 assert.match(migration,/create or replace function public\.archive_expired_promotions\(\)/)
 assert.match(migration,/ends_at is not null/)
 assert.match(migration,/ends_at <= now\(\)/)
 assert.match(migration,/status in \('published','pending_review'\)/)
 assert.match(migration,/status='archived'/)
 assert.match(migration,/grant execute on function public\.archive_expired_promotions\(\) to authenticated/)
 assert.match(page,/rpc\('archive_expired_promotions'\)/)
 assert.match(page,/statusFilter,setStatusFilter\)='current'/)
 assert.match(page,/statusFilter==='current'\?p\.status!==\x27archived\x27/)
 assert.match(page,/setInterval\(async\(\)=>\{const archived=await archiveExpired\(\);if\(archived>0\)await load\(\)\},60000\)/)
})

test('admin de promoções oferece filtro separado para visualizar arquivadas',()=>{
 const page=read('src/AdminPromotionsPage.jsx')
 assert.match(page,/Atuais \(exceto arquivadas\)/)
 assert.match(page,/Todos os status/)
 assert.match(page,/\{Object\.entries\(STATUS\)\.map/)
})

test('eventos aparecem diretamente na tela administrativa sem modal ou botão intermediário',()=>{
 const page=read('src/AdminEventsMain.jsx')
 const platform=read('src/AdminPlatformPage.jsx')
 assert.match(page,/useEffect\(\(\)=>\{load\(\)\},\[\]\)/)
 assert.match(page,/className="vl-admin-events-main"/)
 assert.match(page,/className="vl-admin-events-list"/)
 assert.match(page,/events\.map\(row=>/)
 assert.doesNotMatch(page,/vl-admin-events-trigger/)
 assert.doesNotMatch(page,/vl-admin-events-backdrop/)
 assert.doesNotMatch(page,/open&&/)
 assert.match(platform,/import AdminEventsMain from '\.\/AdminEventsMain\.jsx'/)
 assert.match(platform,/tab==='events'\?<AdminEventsMain supabase=\{supabase\}\/>/)
})

test('estilo da nova tela principal de eventos está versionado',()=>{
 const css=read('src/admin-events-main.css')
 assert.match(css,/\.vl-admin-events-main/)
 assert.match(css,/\.vl-admin-events-main \.vl-admin-events-layout/)
 assert.match(css,/@media\(max-width:980px\)/)
})
