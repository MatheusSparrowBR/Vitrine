import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('fase 2.2 solicita permissão somente por ação explícita e salva subscription',()=>{
 const js=read('src/PushNotificationSettings.jsx')
 assert.match(js,/Notification\.requestPermission\(\)/)
 assert.match(js,/onClick=\{enable\}/)
 assert.match(js,/push_subscriptions/)
 assert.match(js,/upsert\(/)
 assert.match(js,/onConflict:'endpoint'/)
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
