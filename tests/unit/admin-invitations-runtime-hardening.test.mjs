import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
const page=fs.readFileSync('src/AdminInvitationsPage.jsx','utf8')
const sw=fs.readFileSync('public/sw.js','utf8')
const pwa=fs.readFileSync('src/pwa-register.js','utf8')

test('página de convites usa Supabase estático e formatador resiliente',()=>{
 assert.match(page,/import \{ db \} from '\.\/supabase-client\.js'/)
 assert.doesNotMatch(page,/import\('\.\/supabase-client\.js'\)/)
 assert.match(page,/formatDate\(item\.invited_at\)/)
 assert.match(page,/formatDate\(item\.created_at\)/)
})

test('cache do service worker é invalidado e registro recebe nova versão',()=>{
 assert.match(sw,/vitrine-local-shell-v5/)
 assert.match(pwa,/delivery-feedback-v7/)
})
