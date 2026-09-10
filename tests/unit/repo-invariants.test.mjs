import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd()
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const srcDir=path.join(root,'src')
const migrationDir=path.join(root,'supabase/migrations')
const sourceFiles=()=>fs.readdirSync(srcDir).filter(x=>/\.(jsx?|css)$/.test(x))

test('entrypoint usa somente a nova árvore de frontend',()=>{
 const app=read('src/app-entry.jsx')
 for(const token of ['CityHomePage','BusinessesPage','PromotionsPage','BusinessProfilePage','AccountPage','AdminHomePage','AdminBusinessesPage','BusinessRegistrationPage','AuthPage','PasswordUpdatePage','BillingPlansPage','PrivacyPage','TermsPage'])assert.match(app,new RegExp(token))
 assert.match(app,/path==='\/admin\/empresas'/)
 assert.match(app,/new URLSearchParams\(location\.search\)/)
 assert.doesNotMatch(app,/LegacyRoute|main-clean\.jsx|AdminDashboard\.jsx/)
})

test('frontend não contém comunidade',()=>{
 const forbidden=/CommunityModal|community-submissions|community-published|communityOpen|Enviar conteúdo|Conteúdo da comunidade|COMUNIDADE|\.vl-community-/
 for(const file of sourceFiles())assert.doesNotMatch(read(`src/${file}`),forbidden,`community reference found in ${file}`)
})

test('arquivos legados de comunidade não existem',()=>{
 for(const file of ['main.jsx','main-v2.jsx','main-clean.jsx','AdminDashboard.jsx','site-enhancements.js','storage-media.js','storage-media.css','styles.css','admin.css'])assert.equal(fs.existsSync(path.join(srcDir,file)),false,`legacy file still exists: ${file}`)
})

test('migração de senha usa recovery para senha antiga',()=>{const src=read('src/AuthPage.jsx');assert.match(src,/weak_password/);assert.match(src,/resetPasswordForEmail/);assert.match(src,/atualizar-senha/);assert.match(src,/password\.length<8/)})
test('página de atualização exige nova senha',()=>{const src=read('src/PasswordUpdatePage.jsx');assert.match(src,/updateUser\(\{password\}\)/);assert.match(src,/password\.length<8/);assert.match(src,/password!==confirm/)})
test('billing webhook usa assinatura e idempotencia',()=>{const src=read('supabase/functions/stripe-webhook/index.ts');assert.match(src,/constructEventAsync/);assert.match(src,/billing_events/);assert.match(src,/provider_event_id/)})
test('fluxos administrativos e migrations críticas estão versionados',()=>{assert.ok(fs.existsSync(path.join(srcDir,'AdminBusinessesPage.jsx')));assert.ok(fs.existsSync(path.join(srcDir,'BusinessRegistrationPage.jsx')));assert.ok(fs.existsSync(path.join(srcDir,'AdminEventsPanel.jsx')));assert.ok(fs.existsSync(path.join(migrationDir,'20260909131445_enforce_promotion_review_workflow.sql')));assert.ok(fs.existsSync(path.join(migrationDir,'20260909174253_create_city_events.sql')));assert.ok(fs.existsSync(path.join(migrationDir,'20260910011000_harden_business_insert_moderation.sql')));assert.ok(fs.existsSync(path.join(migrationDir,'20260910011100_harden_billing_event_privileges.sql')));})
test('segredos de servidor nao aparecem no frontend',()=>{for(const file of sourceFiles()){const src=read(`src/${file}`);assert.doesNotMatch(src,/STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/)}})
