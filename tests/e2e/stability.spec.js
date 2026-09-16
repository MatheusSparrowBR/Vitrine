import {test,expect} from '@playwright/test'

const routes=[
 '/laguna',
 '/laguna/empresas',
 '/laguna/promocoes',
 '/laguna/eventos',
 '/planos',
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
 await page.goto('/laguna',{waitUntil:'networkidle'})
 const css=await page.request.get('/premium-empty-slot.css?v=20260916-1428')
 expect(css.ok()).toBeTruthy()
 const cssText=await css.text()
 expect(cssText).toContain('premium-ad-placeholder-clean.svg?rev=20260916-1428')
 expect(cssText).not.toContain('premium-ad-placeholder.svg')
 const asset=await page.request.get('/premium-ad-placeholder-clean.svg?rev=20260916-1428')
 expect(asset.ok()).toBeTruthy()
 const assetText=await asset.text()
 expect(assetText).not.toContain('Quero anunciar')
 expect(assetText).not.toContain('Conhecer anúncio')
 await expect(page.locator('body')).not.toContainText('Quero anunciar')
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
