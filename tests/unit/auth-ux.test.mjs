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


test('auth desktop usa layout de formulário mais compacto e mantém mobile em uma coluna',()=>{
 const css=read('src/auth-page.css')
 assert.match(css,/\.vl-auth-card\.is-signup \.auth-form/)
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
 assert.match(css,/\.auth-field input\{[\s\S]*?height:54px/)
 assert.match(css,/@media\(max-width:650px\)[\s\S]*?grid-template-columns:1fr/)
})


test('auth footer keeps account action grouped and return link separated',()=>{
 const css=read('src/auth-page.css')
 assert.match(css,/\.auth-switch\{[\s\S]*?width:max-content/)
 assert.match(css,/\.auth-back\{[\s\S]*?margin:10px auto 0/)
 assert.match(css,/@media\(max-width:520px\)[\s\S]*?\.auth-switch\{/)
})
