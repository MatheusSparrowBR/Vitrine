import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')

test('banner premium no celular fica depois da agenda e antes de "Onde comer e ficar"',()=>{
 const css=read('src/site-refresh.css')
 assert.match(css,/html body \.lvp-page > main > \.lvp-sponsored-wrap \{ order: 9 !important; \}/)
 assert.match(css,/@media \(max-width: 720px\) \{\s*html body \.lvp-page > main > \.lvp-sponsored-wrap \{ order: 6 !important; \}\s*\}/)
 assert.match(css,/html body \.lvp-page > main > \.lvp-events \{ order: 5 !important; \}/)
 assert.match(css,/html body \.lvp-page > main > \.lvp-needs \{ order: 7 !important; \}/)
})
