import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const read=p=>fs.readFileSync(p,'utf8')

test('experiência pessoal separa favoritos, seguindo e workspace empresarial',()=>{
 const page=read('src/PersonalAccountPage.jsx')
 const profile=read('src/ModernBusinessProfilePage.jsx')
 const relation=read('src/business-relationship.js')
 assert.ok(page.includes('Empresas favoritas'))
 assert.ok(page.includes('Empresas que você segue'))
 assert.ok(page.includes('notification_preferences'))
 assert.ok(page.includes("href={profile?.role==='business_owner'?'/conta':'/conta?new=business'}"))
 assert.ok(profile.includes('Salvar empresa'))
 assert.ok(profile.includes('Ativar notificações'))
 assert.ok(profile.includes('Receba novidades desta empresa'))
 assert.ok(!profile.includes('>Acompanhar novidades</button>'))
 assert.ok(relation.includes("business_favorites"))
 assert.ok(relation.includes("business_notification_subscriptions"))
})

test('migração de favoritos usa unicidade por usuário/empresa e RLS autenticado',()=>{
 const migration=read('supabase/migrations/20260929120000_personal_experience_favorites_and_relationship_grants.sql')
 assert.ok(migration.includes('primary key (user_id, business_id)'))
 assert.ok(migration.includes('enable row level security'))
 assert.ok(migration.includes('grant select, insert, delete on table public.business_favorites to authenticated'))
 assert.ok(!migration.includes('wallet'))
 assert.ok(!migration.includes('voucher'))
})

test('cadastro registra a preferência de experiência sem transformar preferência em autorização',()=>{
 const auth=read('src/UserAuthPage.jsx')
 assert.ok(auth.includes('Como você pretende usar o VitrineLocal?'))
 assert.ok(auth.includes('experience_mode:experienceMode'))
 assert.ok(auth.includes('next=')||auth.includes('safeNext'))
})


test('navegação pessoal mobile não corta as opções da conta',()=>{
 const css=read('src/personal-account.css')
 assert.match(css,/@media\(max-width:600px\)/)
 assert.match(css,/\.personal-account-page \.personal-account-nav\{display:grid!important/)
 assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important'))
 assert.match(css,/overflow:visible!important/)
})


test('favorito da empresa usa insert/delete e não exige update no relacionamento',()=>{
 const relation=read('src/business-relationship.js')
 assert.match(relation,/type==='favorite'/)
 assert.match(relation,/db\.from\(table\)\.insert\(key\)/)
 assert.match(relation,/db\.from\(table\)\.delete\(\)\.match\(key\)/)
})

test('ações da empresa mantêm Favoritar separado do acompanhamento por Push',()=>{
 const page=read('src/ModernBusinessProfilePage.jsx')
 assert.match(page,/mbp-relationship-row/)
 assert.match(page,/Empresa salva/)
 assert.match(page,/Receba novidades desta empresa/)
 assert.match(page,/Ativar notificações/)
 assert.doesNotMatch(page,/>Acompanhar novidades<\/button>/)
})

test('ações secundárias da empresa têm largura uniforme em mobile e desktop',()=>{
 const css=read('src/modern-business-profile-ux.css')
 assert.match(css,/\.mbp-action-row\{display:grid!important/)
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\))!important/)
 assert.match(css,/\.mbp-action-row a,.mbp-action-row button\{width:100%!important/)
})
