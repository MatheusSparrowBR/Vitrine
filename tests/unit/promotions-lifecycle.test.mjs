import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/phase2-enhancements.js','utf8')

test('promoções consideram início e término com o relógio atual',()=>{
  assert.match(source,/function isPromotionCurrent\(promotion, now=Date\.now\(\)\)/)
  assert.match(source,/if\(start!==null&&start>now\)return false/)
  assert.match(source,/if\(end!==null&&end<=now\)return false/)
})

test('promoções públicas são revalidadas periodicamente',()=>{
  assert.match(source,/setInterval\(loadCurrentPromotions,30000\)/)
  assert.match(source,/currentPromotions=\(data\|\|\[\]\)\.filter\(p=>isPromotionCurrent\(p\)\)/)
})

test('promoções sem arte usam a arte padrão',()=>{
  assert.match(source,/DEFAULT_PROMOTION_IMAGE = '\/promotion-default\.svg'/)
  assert.match(source,/ensureDefaultPromotionImage/)
  assert.match(source,/promotion\?\.image_url\|\|DEFAULT_PROMOTION_IMAGE/)
})

test('a arte padrão existe no projeto',()=>{
  assert.equal(fs.existsSync('public/promotion-default.svg'),true)
})
