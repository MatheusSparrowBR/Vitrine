import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('promoções expiradas são arquivadas por manutenção agendada e a tela administrativa não depende do cron do navegador',()=>{
 const migration=read('supabase/migrations/20260911130600_operational_maintenance.sql')
 const page=read('src/AdminPromotionsPage.jsx')
 assert.match(migration,/create table if not exists public\.operational_maintenance_runs/)
 assert.match(migration,/create or replace function public\.run_operational_maintenance\(\)/)
 assert.match(migration,/ends_at is not null/)
 assert.match(migration,/ends_at <= now\(\)/)
 assert.match(migration,/status in \('published','pending_review'\)/)
 assert.match(migration,/status='archived'/)
 assert.match(migration,/cron\.schedule\()/
 assert.match(migration,/'vitrine-local-operational-maintenance'/)
 assert.match(migration,/'0 \* \* \* \*'/)
 assert.match(migration,/revoke all on function public\.run_operational_maintenance\(\) from public, anon, authenticated/)
 assert.doesNotMatch(page,/rpc\('archive_expired_promotions'\)/)
 assert.doesNotMatch(page,/setInterval\(async\(\)=>\{/)
 assert.match(page,/useState\('current'\)/)
 assert.match(page,/const ended=p\.ends_at&&new Date\(p\.ends_at\)\.getTime\(\)<=now/)
 assert.match(page,/statusFilter==='current'\?\(p\.status!=='archived'&&!ended\)/)
})

test('admin de promoções oferece filtro separado para visualizar arquivadas',()=>{
 const page=read('src/AdminPromotionsPage.jsx')
 assert.match(page,/Atuais \(exceto arquivadas\)/)
 assert.match(page,/Todos os status/)
 assert.match(page,/\{Object\.entries\(STATUS\)\.map/)
})

test('eventos aparecem diretamente na tela administrativa e o destaque tem feedback claro',()=>{
 const page=read('src/AdminEventsMain.jsx')
 const platform=read('src/AdminPlatformPage.jsx')
 assert.match(page,/useEffect\(\(\)=>\{load\(\)\},\[\]\)/)
 assert.match(page,/className="vl-admin-events-main"/)
 assert.match(page,/className="vl-admin-events-list"/)
 assert.match(page,/orderedEvents\.map\(row=>/)
 assert.match(page,/setEvents\(current=>current\.map\(row=>row\.id===id\?\{\.\.\.row,\[field\]:next\}:row\)\)/)
 assert.match(page,/row\.featured\?'Remover destaque':'⭐ Destacar'/)
 assert.match(page,/Evento destacado na agenda pública\./)
 assert.match(page,/Destaque removido do evento\./)
 assert.match(page,/aria-pressed=\{row\.featured\}/)
 assert.match(page,/action===`featured:\$\{row\.id\}`\?'Atualizando…'/)
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
