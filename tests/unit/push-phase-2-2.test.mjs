import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('fase 2.2 solicita permissão somente por ação explícita e salva subscription',()=>{
 const js=read('src/PushNotificationSettings.jsx')
 assert.match(js,/Notification\.requestPermission\(\)/)
 assert.match(js,/onClick=\{enable\}/)
 assert.match(js,/syncPushSubscription/)
 assert.match(js,/syncPushSubscription\(session\.user\.id\)/)
 assert.match(js,/user_id:session\.user\.id/)
})

test('fase 2.2 trata estados de suporte e permissão',()=>{
 const js=read('src/PushNotificationSettings.jsx')
 assert.match(js,/isPushSupported/)
 assert.match(js,/Notification\.permission==='denied'/)
 assert.match(js,/status==='unsupported'/)
 assert.match(js,/status==='denied'/)
})

test('fase 2.2 não expõe segredo de servidor',()=>{
 const js=read('src/PushNotificationSettings.jsx')
 assert.doesNotMatch(js,/service_role/i)
 assert.doesNotMatch(js,/VAPID_PRIVATE/i)
})

test('fase 2.3 sincroniza a subscription existente sem pedir nova permissão',()=>{
 const js=read('src/push-notifications.js')
 const ui=read('src/PushNotificationSettings.jsx')
 assert.match(js,/syncPushSubscription/)
 assert.match(js,/last_seen_at/)
 assert.match(js,/enabled:true/)
 assert.match(ui,/syncPushSubscription\(id\)/)
 assert.match(ui,/Notification\.permission==='granted'/)
})

test('fase 2.3 permite desativar somente o dispositivo atual',()=>{
 const js=read('src/push-notifications.js')
 const ui=read('src/PushNotificationSettings.jsx')
 assert.match(js,/disablePushSubscription/)
 assert.match(js,/subscription\.unsubscribe\(\)/)
 assert.match(js,/\.eq\('user_id',userId\)/)
 assert.match(js,/\.eq\('endpoint',endpoint\)/)
 assert.match(js,/enabled:false/)
 assert.match(ui,/onClick=\{disable\}/)
 assert.match(ui,/Desativar neste dispositivo/)
})

test('fase 2.3 não exibe endpoint bruto na interface',()=>{
 const ui=read('src/PushNotificationSettings.jsx')
 assert.doesNotMatch(ui,/subscription\.endpoint/)
})
