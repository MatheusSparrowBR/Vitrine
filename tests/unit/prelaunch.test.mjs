import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('prelaunch is on by default but administrators bypass it',()=>{
 const gate=read('src/PrelaunchGate.jsx')
 const page=read('src/PrelaunchPage.jsx')
 assert.match(gate,/import\.meta\.env\.VITE_PRELAUNCH_MODE \?\? 'true'/)
 assert.match(gate,/profile\?\.role==='admin'/)
 assert.match(gate,/startsWith\('\/admin'\)/)
 assert.match(page,/vitrine-local-header-logo\.svg/)
 assert.match(page,/Cadastrar minha empresa/)
 assert.match(page,/Já tenho uma conta/)
})
