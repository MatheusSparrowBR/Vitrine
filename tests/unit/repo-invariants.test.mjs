import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd()
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
test('entrypoint publica somente rotas React novas',()=>{const app=read('src/app-entry.jsx');for(const token of ['CityHomePage','BillingPlansPage','AuthPage','PrivacyPage','TermsPage'])assert.match(app,new RegExp(token))})
test('home publica nova nao possui comunidade',()=>{const src=read('src/CityHomePage.jsx');assert.doesNotMatch(src,/Enviar conteúdo|CommunityModal|community-submissions/)})
test('billing webhook usa assinatura e idempotencia',()=>{const src=read('supabase/functions/stripe-webhook/index.ts');assert.match(src,/constructEventAsync/);assert.match(src,/billing_events/);assert.match(src,/provider_event_id/)})
test('migracao de billing esta versionada',()=>{const files=fs.readdirSync(path.join(root,'supabase/migrations'));assert.ok(files.includes('20260909194254_billing_provider_foundation_and_security.sql'))})
test('segredos de servidor nao aparecem no frontend',()=>{for(const file of fs.readdirSync(path.join(root,'src')).filter(x=>x.endsWith('.jsx')||x.endsWith('.js'))){const src=read(`src/${file}`);assert.doesNotMatch(src,/STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/,`secret reference in ${file}`)}})
