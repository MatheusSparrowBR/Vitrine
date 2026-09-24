import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const sw=fs.readFileSync('public/sw.js','utf8')
const pwa=fs.readFileSync('src/pwa-register.js','utf8')

test('feedback de entrega do Push possui retry e evita cache',()=>{
 assert.match(sw,/sendDeliveryFeedback/)
 assert.match(sw,/attempt < 3/)
 assert.match(sw,/cache: 'no-store'/)
 assert.match(sw,/mode: 'cors'/)
 assert.match(sw,/credentials: 'omit'/)
})

test('feedback é enviado no push e pode ser repetido no clique',()=>{
 assert.match(sw,/delivery_feedback_url/)
 assert.match(sw,/notification_id/)
 assert.match(sw,/delivery_token/)
 assert.match(sw,/await sendDeliveryFeedback\(feedbackUrl, notificationId, deliveryToken\)/)
 assert.match(sw,/await sendDeliveryFeedback\(notificationData\.feedbackUrl, notificationData\.notificationId, notificationData\.deliveryToken\)/)
})

test('service worker força atualização do script de feedback',()=>{
 assert.match(pwa,/sw\.js\?version=delivery-feedback-v4/)
})
