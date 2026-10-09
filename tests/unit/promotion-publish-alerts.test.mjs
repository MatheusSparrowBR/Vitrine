import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('promoção guarda a opção de aviso ao publicar, ligada por padrão',()=>{
 const migration=read('supabase/migrations/20261011120000_add_promotion_publish_alerts.sql')
 const owner=read('src/OwnerPromotionsSection.jsx')
 assert.match(migration,/add column if not exists notify_on_publish boolean not null default true/)
 assert.match(owner,/notify_on_publish:true\}/)
 assert.match(owner,/notify_on_publish:form\.notify_on_publish/)
 assert.match(owner,/Avisar quem segue ou salvou a empresa/)
})

test('admin dispara o aviso ao publicar, sem duplicar envios',()=>{
 const admin=read('src/AdminPromotionsPage.jsx')
 assert.match(admin,/functions\.invoke\('send-promotion-notification',\{body:\{promotion_id:promotionId\}\}\)/)
 assert.match(admin,/row\.status!=='published'&&row\.notify_on_publish!==false/)
 assert.match(admin,/becamePublished&&editor\?\.notify_on_publish!==false/)
 assert.doesNotMatch(admin,/force:true/)
})

test('função de envio inclui quem salvou a empresa e aceita admin ativo',()=>{
 const fn=read('supabase/functions/send-promotion-notification/index.ts')
 assert.match(fn,/from\('business_favorites'\)/)
 assert.match(fn,/favoritedUserIds\.has\(subscription\.user_id\)/)
 assert.match(fn,/isActiveAdmin\(admin, user\.id\)/)
})
