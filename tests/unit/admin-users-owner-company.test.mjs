import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const page=fs.readFileSync('src/AdminUsersPage.jsx','utf8')

test('lista de usuários busca e exibe a empresa proprietária',()=>{
 assert.match(page,/admin_list_users_with_business/)
 assert.match(page,/u\.business_name/)
 assert.match(page,/Empresa/)
 assert.match(page,/Sem empresa vinculada/)
 assert.match(page,/u\.email/)
})
