import {test,expect} from '@playwright/test'

const routes=[
 '/laguna',
 '/laguna/empresas',
 '/laguna/promocoes',
 '/laguna/eventos',
 '/planos',
 '/login',
 '/conta',
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

test('home não depende de script externo para o placeholder Premium',async({page})=>{
 await page.goto('/laguna')
 await expect(page.locator('.vl-site-header')).toBeVisible()
 await expect(page.locator('.home-hero')).toBeVisible()
 await expect(page.locator('.vl-category-slot')).toBeVisible()
 const scripts=await page.locator('script[src]').evaluateAll(items=>items.map(item=>item.getAttribute('src')||''))
 expect(scripts).not.toContain('/premium-empty-slot.js')
})
