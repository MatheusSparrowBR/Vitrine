import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const root = process.cwd()
const fn = fs.readFileSync(root + '/supabase/functions/send-promotion-notification/index.ts', 'utf8')
const migration = fs.readFileSync(root + '/supabase/migrations/20260924023000_notification_plan_limits.sql', 'utf8')
const promo = fs.readFileSync(root + '/src/OwnerPromotionsSection.jsx', 'utf8')
const plans = fs.readFileSync(root + '/src/AdminPlansPage.jsx', 'utf8')

test('limite de notificações usa o limite de promoções do plano', () => {
  assert.match(migration, /plan_limit\\(p_business_id, 'promotions'\\)/)
  assert.match(migration, /private\\.get_business_plan_cycle/)
  assert.match(fn, /notification_rate_limit/)
  assert.match(fn, /retry_at/)
})

test('Bistrô Laguna - Teste possui envio ilimitado', () => {
  assert.match(migration, /v_business\\.name = 'Bistrô Laguna - Teste'/)
  assert.match(migration, /'unlimited', true/)
})

test('frontend mostra mensagem clara para limite de notificações', () => {
  assert.match(promo, /Limite de notificações atingido/)
  assert.match(promo, /retryLabel/)
})

test('admin identifica que o limite de promoções também controla Push', () => {
  assert.match(plans, /Promoções por ciclo · limite de Push/)
})
