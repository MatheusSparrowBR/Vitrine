import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const entry=fs.readFileSync('src/app-entry.jsx','utf8')

test('Admin de convites é carregado no bundle principal para evitar chunk dessincronizado',()=>{
 assert.match(entry,/import AdminInvitationsPage from '\.\/AdminInvitationsPage\.jsx'/)
 assert.doesNotMatch(entry,/const AdminInvitationsPage=lazy\(/)
 assert.match(entry,/path==='\/admin\/convites'/)
})
