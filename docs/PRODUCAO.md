# VitrineLocal — checklist de produção

## 1. Supabase

- Definir `SITE_URL` no ambiente das Edge Functions.
- Definir `STRIPE_SECRET_KEY` somente como secret server-side.
- Definir `STRIPE_WEBHOOK_SECRET` somente como secret server-side.
- Opcionalmente preencher os IDs Stripe nas colunas `plans.stripe_price_monthly_id` e `plans.stripe_price_yearly_id`.
- Configurar URLs de redirecionamento do Supabase Auth para o domínio final.
- Configurar SMTP de produção para confirmação e recuperação de senha.
- Ativar Auth > proteção contra senhas vazadas no Dashboard. Essa configuração depende do Dashboard do Supabase e não é exposta pelo conector usado nesta implementação.

## 2. Stripe

- Criar/validar os produtos e preços Pro/Premium.
- Habilitar o Billing Portal.
- Registrar `POST /functions/v1/stripe-webhook` no Stripe Workbench.
- Selecionar eventos: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
- Validar a assinatura `Stripe-Signature` do webhook.

## 3. Deploy

A aplicação é uma SPA Vite. Em Vercel, `vercel.json` já configura rewrite para `index.html` e alguns cabeçalhos de segurança. Em outros hosts, configurar o equivalente.

## 4. Domínio e HTTPS

Usar domínio próprio com HTTPS. Após escolher o domínio, preencher URLs absolutas de sitemap/Open Graph e configurar os redirects no Supabase/Stripe.

## 5. LGPD e documentos

Substituir os textos de `LegalPages.jsx` pelos dados jurídicos reais do controlador, canal de privacidade, política de cookies, retenção, atendimento e regras comerciais.

## 6. Monitoramento

Configurar Sentry ou serviço equivalente para JavaScript/React e acompanhar logs das Edge Functions. Ativar alertas de disponibilidade e erro durante o piloto.

## 7. Rollout

Começar com uma cidade e poucas empresas reais. Testar cadastro, aprovação, mídias, limites, banners, eventos, checkout, webhook, cancelamento e recuperação de senha antes de abrir a plataforma para outras cidades.
