import {test} from 'node:test'
import assert from 'node:assert/strict'
import {promotionDiscountPercent} from '../../src/promotion-service.js'

test('desconto é calculado a partir do valor original', ()=>{
 assert.equal(promotionDiscountPercent({price:10,original_price:20}),50)
 assert.equal(promotionDiscountPercent({price:15,original_price:20}),25)
 assert.equal(promotionDiscountPercent({price:0,original_price:20}),100)
})

test('sem valor original, ou sem desconto real, não mostra percentual', ()=>{
 assert.equal(promotionDiscountPercent({price:10,original_price:null}),null)
 assert.equal(promotionDiscountPercent({price:20,original_price:20}),null)
 assert.equal(promotionDiscountPercent({price:30,original_price:20}),null)
 assert.equal(promotionDiscountPercent({price:null,original_price:20}),null)
})
