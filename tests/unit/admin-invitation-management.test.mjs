import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const fn=fs.readFileSync('supabase/functions/admin-invitations/index.ts','utf8')
const page=fs.readFileSync('src/AdminInvitationsPage.jsx','utf8')
const shell=fs.readFileSync('src/AdminShell.jsx','utf8')
const entry=fs.readFileSync('src/app-entry.jsx','utf8')

test('gestão de convites lista usuários pendentes pelo Auth',()=>{
 assert.match(fn,/admin\.auth\.admin\.listUsers/)
 assert.match(fn,/invited_at/)
 assert.match(fn,/email_confirmed_at/)
 assert.match(fn,/action === 'list'/)
 assert.match(fn,/pending/)
})

test('admin pode gerar novo link, cancelar e cancelar+reenviar convite',()=>{
 assert.match(fn,/admin\.auth\.admin\.generateLink/)
 assert.match(fn,/admin\.auth\.admin\.deleteUser/)
 assert.match(fn,/action === 'generate_link'/)
 assert.match(fn,/action === 'cancel'/)
 assert.match(fn,/action === 'cancel_and_resend'/)
 assert.match(fn,/inviteUserByEmail/)
})

test('cancelamento não remove conta que já possui empresa vinculada',()=>{
 assert.match(fn,/businesses\.length/)
 assert.match(fn,/use “Gerar novo link”/)
})

test('painel mostra pendentes e ações de convite',()=>{
 assert.match(page,/Convites enviados/)
 assert.match(page,/Nenhum convite pendente/)
 assert.match(page,/Novo link/)
 assert.match(page,/Cancelar e reenviar/)
 assert.match(page,/Cancelar/)
 assert.match(page,/HISTÓRICO/)
})

test('rota e menu administrativo de convites existem',()=>{
 assert.match(entry,/AdminInvitationsPage/)
 assert.match(entry,/\/admin\/convites/)
 assert.match(shell,/Convites/)
 assert.match(shell,/\/admin\/convites/)
})
