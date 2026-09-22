import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const entry=fs.readFileSync('src/app-entry.jsx','utf8')
test('rota de empresas usa import estável para evitar falha de chunk',()=>{
 assert.ok(entry.includes("import ModernBusinessesPage from './ModernBusinessesPage.jsx'"))
 assert.ok(!entry.includes("const ModernBusinessesPage=lazy(()=>import('./ModernBusinessesPage.jsx'))"))
})