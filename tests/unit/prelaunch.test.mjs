import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('prelaunch stays disabled by default and administrators still bypass it',()=>{
 const gate=read('src/PrelaunchGate.jsx')
 const page=read('src/PrelaunchPage.jsx')
 assert.match(gate,/import\.meta\.env\.VITE_PRELAUNCH_MODE \?\? 'false'/)
 assert.match(gate,/profile\?\.role==='admin'/)
 assert.match(gate,/startsWith\('\/admin'\)/)
 assert.match(gate,/\/em-breve\/planos/)
 assert.match(page,/vitrine-local-header-logo\.svg/)
 assert.match(page,/@vitrinelocaal/)
 assert.match(page,/contato@vitrinelocal\.net/)
 assert.match(page,/\/em-breve\/planos/)
 assert.doesNotMatch(page,/Cadastrar minha empresa/)
 assert.doesNotMatch(page,/Já tenho uma conta/)
})
