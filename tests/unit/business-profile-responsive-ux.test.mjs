import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const page=fs.readFileSync('src/ModernBusinessProfilePage.jsx','utf8')
const css=fs.readFileSync('src/modern-business-profile-ux.css','utf8')
test('perfil empresarial tem experiencia responsiva otimizada',()=>{
 assert.ok(page.includes("modern-business-profile-ux.css"))
 assert.ok(page.includes("mbp-identity-badges"))
 assert.ok(page.includes("is-empty"))
 assert.ok(css.includes(".mbp-identity-badges{display:grid"))
 assert.ok(css.includes(".mbp-contact-card:first-child{grid-column:1/-1}"))
 assert.ok(css.includes(".mbp-gallery.is-empty .mbp-gallery-side"))
})
