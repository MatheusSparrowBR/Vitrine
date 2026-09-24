import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const notificationFn=fs.readFileSync('supabase/functions/send-admin-notification/index.ts','utf8')
const promotionFn=fs.readFileSync('supabase/functions/send-promotion-notification/index.ts','utf8')
const adminPage=fs.readFileSync('src/AdminNotificationsPage.jsx','utf8')
const onboardingFn=fs.readFileSync('supabase/functions/admin-onboarding/index.ts','utf8')
const onboardingPage=fs.readFileSync('src/AdminOnboardingPage.jsx','utf8')
const sw=fs.readFileSync('public/sw.js','utf8')

test('admin notifications exige autenticação administrativa e valida conteúdo',()=>{
 assert.match(notificationFn,/requireAdmin/)
 assert.match(notificationFn,/profile\?\.role !== 'admin'/)
 assert.match(notificationFn,/title_required/)
 assert.match(notificationFn,/body_required/)
 assert.match(notificationFn,/MAX_IMAGE_BYTES/)
 assert.match(notificationFn,/sendNotification/)
 assert.match(notificationFn,/delivery_feedback_url/)
})

test('admin notifications permite fontes personalizadas, promoções, eventos e empresas',()=>{
 assert.match(notificationFn,/sourceType === 'promotion'/)
 assert.match(notificationFn,/sourceType === 'event'/)
 assert.match(notificationFn,/sourceType === 'business'/)
 assert.match(notificationFn,/type = 'system'/)
 assert.match(notificationFn,/type = 'promotion'/)
 assert.match(notificationFn,/type = 'business'/)
})

test('painel admin oferece envio manual e seleção de fontes',()=>{
 assert.match(adminPage,/Mensagem personalizada/)
 assert.match(adminPage,/Promoção/)
 assert.match(adminPage,/Evento/)
 assert.match(adminPage,/Empresa/)
 assert.match(adminPage,/Título/)
 assert.match(adminPage,/Texto/)
 assert.match(adminPage,/Enviar notificação/)
 assert.match(adminPage,/target_city_id/)
 assert.match(adminPage,/target_category_id/)
})

test('convite administrativo expõe erro real para e-mail já existente',()=>{
 assert.match(onboardingFn,/user_already_exists/)
 assert.match(onboardingFn,/Este e-mail já possui uma conta/)
 assert.match(onboardingPage,/error\?\.context/)
 assert.match(onboardingPage,/payload\?\.error/)
})

test('Push de promoção usa a cidade real no destino',()=>{
 assert.match(promotionFn,/businessCity/)
 assert.match(promotionFn,/\$\{businessCity\?\.slug \|\| 'laguna'\}/)
 assert.doesNotMatch(promotionFn,/url: `\/laguna\?promotion=/)
})

test('Service Worker usa a imagem da notificação quando disponível',()=>{
 assert.match(sw,/data\.image_url/)
 assert.match(sw,/image: imageUrl/)
})
