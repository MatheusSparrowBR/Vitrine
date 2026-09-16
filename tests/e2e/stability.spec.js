import {test,expect} from '@playwright/test'

const routes=[
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
 await page.goto('/laguna',{waitUntil:'networkidle'})
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

test('placeholder Premium não interfere nos estados vazios de eventos',async({page})=>{
 await page.goto('/laguna',{waitUntil:'domcontentloaded'})
 await expect(page.getByText('Próximos eventos')).toBeVisible()
 await expect(page.getByText(/Nenhum evento próximo\.|Não foi possível carregar os eventos\./)).toBeVisible({timeout:9000})
 const eventEmpty=page.getByText(/Nenhum evento próximo\.|Não foi possível carregar os eventos\./).locator('..')
 await expect(eventEmpty).toBeVisible()
 const premiumCss=await page.request.get('/premium-empty-slot.css?v=20260916-1428')
 const premiumCssText=await premiumCss.text()
 expect(premiumCssText).toContain('.vl-category-slot + .home-section > .empty-v2')
})

test('home não bloqueia categorias e agenda quando uma fonte de dados falha',async({page})=>{
 await page.goto('/laguna',{waitUntil:'domcontentloaded'})
 const categories=page.locator('.vl-category-slot .category-card')
 await expect(categories).not.toHaveCount(0,{timeout:9000})
 await expect(page.getByText('Carregando eventos…')).toHaveCount(0,{timeout:9000})
 const eventCards=await page.locator('.event-grid .content-card-v2').count()
 const emptyState=await page.getByText(/Nenhum evento próximo\.|Não foi possível carregar os eventos\./).count()
 expect(eventCards+emptyState).toBeGreaterThan(0)
})

test('home não carrega mecanismo legado do placeholder Premium',async({page})=>{
 await page.goto('/laguna')
 await expect(page.locator('.vl-site-header')).toBeVisible()
 await expect(page.locator('.home-hero')).toBeVisible()
 await expect(page.locator('.vl-category-slot')).toBeVisible()
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

test('pré-lançamento mostra apenas canais de contato e aponta para planos próprios',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'})
 await expect(page.getByText('@vitrinelocaal')).toBeVisible()
 await expect(page.getByText('contato@vitrinelocal.net')).toBeVisible()
 await expect(page.getByRole('link',{name:/Ver planos/i})).toHaveAttribute('href','/em-breve/planos')
 await expect(page.getByText('Cadastrar minha empresa')).toHaveCount(0)
 await expect(page.getByText('Já tenho uma conta')).toHaveCount(0)
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
