import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {shareCardModel,wrapText,SHARE_CARD_WIDTH,SHARE_CARD_HEIGHT} from '../../src/promotion-share-card.js'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')
const measure=text=>text.length*10

test('cartão usa formato retrato 4:5 para feed e WhatsApp',()=>{
 assert.equal(SHARE_CARD_WIDTH,1080)
 assert.equal(SHARE_CARD_HEIGHT,1350)
})

test('modelo do cartão traz desconto, preços, validade e local',()=>{
 const model=shareCardModel({title:'Pizza grande',price:49.9,original_price:59.9,ends_at:'2026-10-10T20:49:00.000Z'},{businessName:'Pizzaria Sol',cityName:'Laguna'})
 assert.equal(model.title,'Pizza grande')
 assert.equal(model.business,'Pizzaria Sol')
 assert.equal(model.discountText,'-17%')
 assert.match(model.priceText,/49,90/)
 assert.match(model.originalText,/59,90/)
 assert.match(model.validText,/^Válida até \d{2}\/\d{2}$/)
 assert.equal(model.location,'Laguna · vitrinelocal.net')
})

test('modelo omite desconto e validade quando a promoção não tem esses dados',()=>{
 const model=shareCardModel({title:'Brinde na compra',price:null,original_price:null,ends_at:null})
 assert.equal(model.discountText,'')
 assert.equal(model.validText,'')
 assert.equal(model.priceText,'')
 assert.equal(model.location,'vitrinelocal.net')
})

test('quebra de texto respeita a largura e limita o número de linhas',()=>{
 assert.deepEqual(wrapText('uma oferta curta',100,measure,3),['uma oferta','curta'])
 const lines=wrapText('uma oferta muito longa que não cabe em três linhas de jeito nenhum',100,measure,3)
 assert.equal(lines.length,3)
 assert.ok(lines[2].endsWith('…'))
 assert.ok(lines.every(line=>measure(line)<=100))
})

test('páginas de promoção ligam o botão de cartão aos cards',()=>{
 const catalog=read('src/PublicCatalogPages.jsx')
 const profile=read('src/ModernBusinessProfilePage.jsx')
 assert.match(catalog,/import PromotionShareButton from '\.\/PromotionShareButton\.jsx'/)
 assert.match(catalog,/<div className="promotion-card-slot" key=\{p\.id\}><a className="promotion-card promotion-card-clickable"/)
 assert.match(catalog,/<PromotionShareButton promotion=\{p\}/)
 assert.match(profile,/<PromotionShareButton promotion=\{p\} businessName=\{business\.name\}/)
})

test('compartilhamento usa o sistema quando permite arquivos e baixa o PNG como alternativa',()=>{
 const button=read('src/PromotionShareButton.jsx')
 assert.match(button,/navigator\.canShare\?\.\(/)
 assert.match(button,/navigator\.share\(/)
 assert.match(button,/link\.download = file\.name/)
 assert.match(button,/AbortError/)
})
