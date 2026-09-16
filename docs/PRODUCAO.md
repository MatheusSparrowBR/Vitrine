# VitrineLocal - checklist de produção 1.0

## 1. Estado do release

- Versão do aplicativo: `1.0.0`.
- Frontend: SPA React/Vite.
- Banco e autenticação: Supabase.
- Cobrança recorrente: Mercado Pago.
- O fluxo comercial principal já foi validado com empresas reais pelo responsável do projeto.
- O CI do projeto deve permanecer verde antes de cada publicação.

## 2. Supabase e autenticação

- Configurar as URLs finais de redirect do Supabase Auth para o domínio oficial.
- Configurar SMTP de produção para confirmação de conta e recuperação de senha.
- Ativar proteção contra senhas vazadas no Supabase Auth.
- Conferir as secrets server-side das Edge Functions e nunca expô-las no frontend.
- Confirmar `SITE_URL` e demais URLs absolutas usadas por fluxos de autenticação, billing e retorno.
- Manter RLS e políticas alinhadas ao modelo de proprietário, administrador e usuário público.
- Fazer backup antes de alterações estruturais relevantes.

## 3. Mercado Pago

Secrets server-side esperadas pelo fluxo atual:

- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `MP_ENVIRONMENT`
- `MP_TEST_PAYER_EMAIL` quando o ambiente estiver em modo de teste

Checklist:

- Configurar `MP_ENVIRONMENT=production` somente no ambiente oficial.
- Registrar o webhook `mercadopago-webhook` no painel do Mercado Pago.
- Conferir a URL pública da Edge Function antes de ativar cobranças reais.
- Confirmar que o webhook valida `x-signature`/HMAC quando `MP_WEBHOOK_SECRET` estiver configurado.
- Confirmar idempotência por `provider_event_id`.
- Confirmar sincronização de `subscription_preapproval` com `GET /preapproval/{id}`.
- Confirmar tratamento de `subscription_authorized_payment` e atualização do status de assinatura.
- Confirmar que o usuário consegue acessar o fluxo de regularização quando uma cobrança precisa de recuperação.
- Fazer um teste controlado de cobrança, aprovação, renovação e cancelamento no ambiente destinado ao lançamento.

## 4. Frontend e hospedagem

- Publicar a SPA com fallback de rotas para `index.html`.
- Ativar HTTPS no domínio oficial.
- Conferir favicon, logo oficial, Open Graph e sitemap no domínio final.
- Conferir cache dos assets estáticos e invalidação após deploy.
- Não publicar `.env` com secrets privadas.

## 5. Experiência da empresa

O release 1.0 inclui um onboarding comercial para empresas com o fluxo:

`O que é o VitrineLocal -> Como a empresa aparece -> Como conseguir mais exposição -> Como fazer upgrade`

O guia completo fica em `/conta/onboarding` e a primeira visita ao espaço autenticado apresenta um guia de primeiros passos para empresas que já possuem cadastro.

## 6. Operação administrativa

Antes de abrir para o público:

- Conferir aprovação e moderação de empresas.
- Conferir gestão de usuários e bloqueios.
- Conferir banners e publicidade Premium.
- Conferir análises comerciais e métricas.
- Conferir avaliações e respostas conforme o plano.
- Conferir cidades ativas e catálogo público.

## 7. LGPD e documentos

- Substituir os textos jurídicos de `LegalPages.jsx` pelos dados reais do controlador.
- Definir canal de privacidade, retenção de dados, atendimento e regras comerciais.
- Revisar política de cookies e tecnologias de medição usadas no domínio final.
- Validar consentimentos e textos legais antes da operação comercial em escala.

## 8. Monitoramento

- Acompanhar erros do frontend e das Edge Functions.
- Ativar alertas de disponibilidade e falhas de webhook.
- Acompanhar falhas de checkout/pagamento e assinaturas que entrem em estado não esperado.
- Registrar incidentes e manter histórico de correções.

## 9. Rollout recomendado

### Fase A - Release Candidate

- Deploy no domínio oficial.
- Smoke test final autenticado.
- Validar cadastro, login, empresa, mídias, produtos/serviços, promoções, analytics, planos, Mercado Pago, cancelamento e recuperação.

### Fase B - Piloto comercial

- Começar em uma cidade com um grupo controlado de empresas.
- Observar cadastro, ativação, uso do painel, conversão para planos pagos e dúvidas recorrentes.
- Corrigir problemas reais antes de ampliar para novas cidades.

### Fase C - Expansão

- Ampliar cidades gradualmente.
- Acompanhar performance, suporte, uso de planos e publicidade.
- Priorizar melhorias com base em dados de utilização e feedback das empresas.
