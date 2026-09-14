import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const read=p=>fs.readFileSync(p,'utf8')

test('login e cadastro do comerciante mantêm fluxo seguro e UX enxuta',()=>{
 const page=read('src/AuthPage.jsx'),css=read('src/auth-page.css')
 assert.match(page,/safeNext\(/)
 assert.match(page,/signInWithPassword/)
 assert.match(page,/auth\.signUp/)
 assert.match(page,/full_name:name\.trim\(\)/)
 assert.match(page,/password-rules/)
 assert.match(page,/auth-benefits/)
 assert.match(page,/Acesso protegido/)
 assert.doesNotMatch(page,/Confirmar senha/)
 assert.doesNotMatch(page,/show2/)
 assert.match(page,/Já existe uma conta com este e-mail/)
 assert.match(css,/\.auth-benefits/)
 assert.match(css,/\.password-rules/)
 assert.match(css,/\.auth-spinner/)
 assert.match(css,/@media\(max-width:650px\)/)
})
