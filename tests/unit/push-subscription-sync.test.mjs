import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/push-notifications.js','utf8')

assert.match(source,/upsert\(/)
assert.match(source,/\.eq\('user_id',userId\)/)
assert.match(source,/\.eq\('platform',platform\)/)
assert.match(source,/\.eq\('user_agent',userAgent\)/)
assert.match(source,/\.neq\('endpoint',endpoint\)/)
assert.match(source,/\.eq\('enabled',true\)/)
assert.match(source,/enabled:false/)
assert.match(source,/last_seen_at:new Date\(\)\.toISOString\(\)/)

console.log('push subscription sync tests passed')
