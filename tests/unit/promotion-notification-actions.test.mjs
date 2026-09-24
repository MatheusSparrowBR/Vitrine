import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
import path from'node:path'
const root=process.cwd()

test('promotion notification action has clear primary and confirmation controls',()=>{
 const source=fs.readFileSync(path.join(root,'src/OwnerPromotionsSection.jsx'),'utf8')
 assert.match(source,/owner-promo-notification-btn/)
 assert.match(source,/owner-promo-notification-confirm/)
 assert.match(source,/Enviar esta promoção por Push\?/)
 assert.match(source,/Confirmar envio/)
 assert.match(source,/Cancelar/)
 assert.match(source,/name="bell"/)
})

test('promotion notification action styles include responsive confirmation layout',()=>{
 const source=fs.readFileSync(path.join(root,'src/owner-promotions.css'),'utf8')
 assert.match(source,/\.owner-promo-notification-btn/)
 assert.match(source,/\.owner-promo-notification-confirm/)
 assert.match(source,/\.owner-promo-notification-confirm-btn/)
 assert.match(source,/@media\(max-width:760px\)/)
})
