import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const sw=fs.readFileSync('public/sw.js','utf8')

test('fase 2.4 trata eventos push no service worker',()=>{
 assert.match(sw,/addEventListener\('push'/)
 assert.match(sw,/event\.data \? event\.data\.json\(\) : \{\}/)
 assert.match(sw,/self\.registration\.showNotification\(/)
 assert.match(sw,/body,/) 
 assert.match(sw,/icon: NOTIFICATION_ICON/)
 assert.match(sw,/badge: NOTIFICATION_ICON/)
 assert.match(sw,/data: \{ url \}/)
})

test('fase 2.4 limita a navegação de notificações à própria origem',()=>{
 assert.match(sw,/new URL\(value, self\.location\.origin\)/)
 assert.match(sw,/url\.origin !== self\.location\.origin/)
 assert.match(sw,/DEFAULT_NOTIFICATION_URL/)
})

test('fase 2.4 abre ou foca a página ao clicar na notificação',()=>{
 assert.match(sw,/addEventListener\('notificationclick'/)
 assert.match(sw,/event\.notification\.close\(\)/)
 assert.match(sw,/self\.clients\.matchAll\(/)
 assert.match(sw,/client\.focus\(\)/)
 assert.match(sw,/self\.clients\.openWindow\(absoluteUrl\)/)
})

test('fase 2.4 não usa chaves privadas ou credenciais no service worker',()=>{
 assert.doesNotMatch(sw,/VAPID_PRIVATE|service_role|OPENAI_API_KEY/i)
})
