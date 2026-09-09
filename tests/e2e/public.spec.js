import {test,expect} from '@playwright/test'

test('home publica não exibe comunidade e usa navegacao limpa',async({page})=>{
 await page.goto('/laguna')
 await expect(page.getByText('VitrineLocal').first()).toBeVisible()
 await expect(page.getByText('Enviar conteúdo')).toHaveCount(0)
 await expect(page.getByText('O que está acontecendo?')).toHaveCount(0)
 await expect(page.getByRole('heading',{name:'Próximos eventos'})).toBeVisible()
 const navLink=page.locator('.nav-actions a').first()
 await expect(navLink).toBeVisible()
 await expect(navLink).toHaveCSS('text-decoration-line','none')
 const categoryLink=page.locator('.category-card').first()
 await expect(categoryLink).toBeVisible()
 await expect(categoryLink).toHaveCSS('text-decoration-line','none')
 const heroBackground=await page.locator('.hero').evaluate(el=>getComputedStyle(el).backgroundImage)
 expect(heroBackground).toContain('laguna-hero.svg')
})

test('home mantém dock de categorias imediatamente após o hero',async({page})=>{
 await page.goto('/laguna')
 const hero=page.locator('.hero')
 const categorySlot=page.locator('.vl-category-slot')
 await expect(categorySlot).toBeVisible()
 const relation=await hero.evaluate(el=>el.nextElementSibling?.className||'')
 expect(relation).toContain('vl-category-slot')
})

test('agenda possui URL por cidade e retorno',async({page})=>{
 await page.goto('/laguna/eventos')
 await expect(page).toHaveURL(/\/laguna\/eventos/)
 await expect(page.getByRole('heading',{name:/Eventos em Laguna/i})).toBeVisible()
 await expect(page.getByRole('button',{name:'← Voltar'})).toBeVisible()
})

test('catalogo possui retorno e navegacao sem sublinhado',async({page})=>{
 await page.goto('/laguna/empresas')
 await expect(page.getByRole('heading',{name:'Empresas em Laguna'})).toBeVisible()
 await expect(page.getByRole('link',{name:/Voltar para Laguna/})).toBeVisible()
 await expect(page.locator('.nav-actions a').first()).toHaveCSS('text-decoration-line','none')
})

test('promocoes publicas carregam sem erro visual',async({page})=>{
 await page.goto('/laguna/promocoes')
 await expect(page.getByRole('heading',{name:/Promoções em Laguna/i})).toBeVisible()
 await expect(page.locator('.topbar')).toBeVisible()
})

test('login e conta mostram estados válidos',async({page})=>{
 await page.goto('/login')
 await expect(page.getByRole('heading',{name:/Entre na sua conta/i})).toBeVisible()
 await expect(page.getByText('Esqueci minha senha')).toBeVisible()
 await page.goto('/conta')
 await expect(page.getByRole('heading',{name:/Entre para acessar sua conta/i})).toBeVisible()
})

test('planos mostra valores públicos e retorno',async({page})=>{
 await page.goto('/planos')
 await expect(page.getByRole('heading',{name:/Escolha o plano/i})).toBeVisible()
 await expect(page.getByText(/R\$\s*29,90/)).toBeVisible()
 await expect(page.getByText(/R\$\s*59,90/)).toBeVisible()
 await expect(page.getByText(/5 fotos\/mídias/)).toBeVisible()
 await expect(page.getByText(/50 produtos\/serviços/)).toBeVisible()
 await expect(page.getByText(/20 promoções/)).toBeVisible()
 await expect(page.getByRole('link',{name:/Voltar para Laguna/})).toBeVisible()
})

test('politica e termos sao acessiveis',async({page})=>{
 await page.goto('/privacidade')
 await expect(page.getByRole('heading',{name:'Política de Privacidade'})).toBeVisible()
 await page.goto('/termos')
 await expect(page.getByRole('heading',{name:'Termos de Uso'})).toBeVisible()
})
