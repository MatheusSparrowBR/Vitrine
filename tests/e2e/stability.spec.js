import {test,expect} from '@playwright/test'

const routes=[
 '/',
 '/laguna',
 '/laguna/empresas',
 '/laguna/promocoes',
 '/laguna/eventos',
 '/planos',
 '/em-breve/planos',
 '/login',
 '/conta',
 '/conta/onboarding',
 '/conta/analytics',
 '/conta/analytics-comercial',
 '/conta/publicidade',
 '/conta/publicidade-legado',
 '/conta/nova',
 '/usuario/login',
 '/usuario/cadastro',
 '/usuario/perfil',
 '/atualizar-senha',
 '/privacidade',
 '/termos',
 '/admin',
 '/admin/analytics',
 '/admin/empresas',
 '/admin/usuarios',
 '/admin/avaliacoes',
 '/admin/banners',
 '/admin/publicidade',
 '/admin/publicidade-legado',
 '/admin/gestao'
]

test('rotas principais não exibem tela branca nem erro de runtime',async({page})=>{
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 for(const route of routes){
  errors.length=0
  await page.goto(route,{waitUntil:'domcontentloaded'})
  await expect(page.locator('#root')).toBeVisible()
  await expect(page.locator('.vl-app-error')).toHaveCount(0)
  const text=(await page.locator('body').innerText()).trim()
  expect(text.length,`rota ${route} ficou sem conteúdo visível`).toBeGreaterThan(20)
  expect(errors,`erro JavaScript na rota ${route}: ${errors.join(' | ')}`).toEqual([])
 }
})

test('logo do header é realmente carregada pelo navegador',async({page})=>{
 await page.goto('/laguna',{waitUntil:'domcontentloaded'})
 const logo=page.locator('.vl-site-brand-logo')
 await expect(logo).toBeVisible()
 await expect(logo).toHaveAttribute('alt',/VitrineLocal/i)
 await expect(logo).toHaveJSProperty('complete',true)
 const naturalWidth=await logo.evaluate(img=>img.naturalWidth)
 expect(naturalWidth).toBeGreaterThan(0)
})

test('placeholder Premium usa o asset versionado correto e não contém CTA legado',async({page})=>{
 await page.goto('/laguna',{waitUntil:'domcontentloaded'})
 const css=await page.request.get('/premium-empty-slot.css?v=20260916-1428')
 expect(css.ok()).toBeTruthy()
 const cssText=await css.text()
 expect(cssText).toContain('premium-ad-placeholder-clean.svg?rev=20260916-1428')
 expect(cssText).not.toContain('url(\'/premium-ad-placeholder.svg')
 const assetPaths=[
  '/premium-ad-placeholder-clean.svg?rev=20260916-1428',
  '/premium-ad-placeholder-v2.svg',
  '/premium-ad-placeholder-v3.svg',
  '/premium-ad-placeholder-v6.svg'
 ]
 for(const path of assetPaths){
  const response=await page.request.get(path)
  expect(response.ok(),`asset ${path} não respondeu`).toBeTruthy()
  const text=await response.text()
  expect(text,`asset ${path} voltou a conter CTA legado`).not.toContain('Quero anunciar')
  expect(text,`asset ${path} voltou a conter CTA legado`).not.toContain('Conhecer anúncio')
 }
 await expect(page.locator('body')).not.toContainText('Quero anunciar')
})

test('UX nova mantém a agenda visível quando não existem eventos',async({page})=>{
 await page.goto('/laguna',{waitUntil:'domcontentloaded'})
 await expect(page.locator('.lvp-events')).toBeVisible()
 await expect(page.getByRole('heading',{name:/O que está acontecendo em Laguna/i})).toBeVisible()
 const eventState=page.getByText(/Nenhum evento próximo(?: cadastrado)?\.?|Não foi possível carregar os eventos\.|Carregando agenda…/)
 const eventCards=page.locator('.lvp-event')
 await expect(eventState.or(eventCards.first())).toBeVisible({timeout:9000})
})

test('home não bloqueia categorias e agenda quando uma fonte de dados falha',async({page})=>{
 await page.goto('/laguna',{waitUntil:'domcontentloaded'})
 const categories=page.locator('.lvp-cat-grid a')
 const hasSupabase=Boolean(process.env.VITE_SUPABASE_URL&&process.env.VITE_SUPABASE_PUBLISHABLE_KEY)
 if(hasSupabase)await expect(categories).not.toHaveCount(0,{timeout:9000})
 const eventCards=await page.locator('.lvp-event').count()
 const emptyState=await page.getByText(/Nenhum evento próximo(?: cadastrado)?\.?|Não foi possível carregar os eventos\.|Carregando agenda…/).count()
 expect(eventCards+emptyState).toBeGreaterThan(0)
})

test('home usa a nova estrutura visual e não carrega mecanismo legado',async({page})=>{
 await page.goto('/laguna')
 await expect(page.locator('.vl-site-header')).toBeVisible()
 await expect(page.locator('.lvp-hero')).toBeVisible()
 await expect(page.locator('.lvp-cat-box')).toBeVisible()
 await expect(page.locator('.lvp-events')).toBeVisible()
 const scripts=await page.locator('script[src]').evaluateAll(items=>items.map(item=>item.getAttribute('src')||''))
 expect(scripts).not.toContain('/premium-empty-slot.js')
})

test('onboarding comercial apresenta os quatro momentos do fluxo da empresa',async({page})=>{
 await page.goto('/conta/onboarding',{waitUntil:'domcontentloaded'})
 await expect(page.locator('h1')).toContainText('Transforme sua empresa em uma vitrine local')
 await expect(page.getByText(/01 \| O QUE É/)).toBeVisible()
 await expect(page.getByText(/02 \| COMO SUA EMPRESA APARECE/)).toBeVisible()
 await expect(page.getByText(/03 \| COMO CONSEGUIR MAIS EXPOSIÇÃO/)).toBeVisible()
 await expect(page.getByText(/04 \| COMO FAZER UPGRADE/)).toBeVisible()
 await expect(page.locator('a[href="/planos"]').first()).toBeVisible()
})

test('página de planos do pré-lançamento não usa o cabeçalho global e preserva os três planos comerciais',async({page})=>{
 await page.goto('/em-breve/planos',{waitUntil:'domcontentloaded'})
 await expect(page.locator('.vl-site-header')).toHaveCount(0)
 await expect(page.locator('.vl-prelaunch-plans-logo')).toBeVisible()
 await expect(page.getByRole('heading',{name:'Grátis'})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Pro'})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Premium'})).toBeVisible()
 await expect(page.getByText('R$ 29,90')).toBeVisible()
 await expect(page.getByText('R$ 59,90')).toBeVisible()
})

test('rota de preview removida não exibe a página demonstrativa',async({page})=>{
 await page.goto('/preview-lancamento',{waitUntil:'domcontentloaded'})
 await expect(page.locator('#root')).toBeVisible()
 await expect(page.locator('body')).not.toContainText('Bistrô Laguna - Teste')
})
