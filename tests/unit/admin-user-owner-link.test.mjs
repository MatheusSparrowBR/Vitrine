import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const users=fs.readFileSync('src/AdminUsersPage.jsx','utf8')
const onboarding=fs.readFileSync('src/AdminOnboardingPage.jsx','utf8')

test('gestão de usuários lista todos os perfis e mostra o e-mail',()=>{
 assert.match(users,/db\.rpc\('admin_list_users_with_business'\)/)
 assert.match(users,/admin:'Administrador'/)
 assert.match(users,/u\.email/)
 assert.doesNotMatch(users,/\.neq\('role','admin'\)/)
})

test('conta administrativa aparece sem ações de moderação',()=>{
 assert.match(users,/u\.role==='admin'/)
 assert.match(users,/Conta administrativa/)
})

test('cadastro de empresa carrega a lista de proprietários pelo retorno data da RPC',()=>{
 assert.match(onboarding,/db\.rpc\('admin_list_business_owners'\)/)
 assert.match(onboarding,/const\{data:o,error:oErr\}/)
 assert.match(onboarding,/owners=o\|\|\[\]/)
})
