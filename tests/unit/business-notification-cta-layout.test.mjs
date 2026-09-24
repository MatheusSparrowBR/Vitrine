import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const css=fs.readFileSync('src/modern-business-profile-ux.css','utf8')
const page=fs.readFileSync('src/ModernBusinessProfilePage.jsx','utf8')

test('CTA de notificações permanece após o contato principal',()=>{
 assert.match(page,/mbp-primary-cta/)
 assert.match(page,/mbp-business-notification/)
 assert.match(page,/mbp-action-row/)
})

test('CTA de notificações tem layout compacto e responsivo',()=>{
 assert.match(css,/\.mbp-business-notification\{\n  display:flex/)
 assert.match(css,/justify-content:space-between/)
 assert.match(css,/@media\(max-width:760px\)/)
 assert.match(css,/\.mbp-business-notification button\{/)
})
