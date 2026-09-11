import{test}from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const page=fs.readFileSync('src/CityHomePage.jsx','utf8')

test('empresas em destaque exibem verificação somente quando a empresa é verificada',()=>{
 assert.match(page,/featured,verified,categories\(name\)/)
 assert.match(page,/\{b\.verified&&<span className="verified">✓ Verificada<\/span>\}/)
})
