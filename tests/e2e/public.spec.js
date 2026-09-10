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

test('home mantém dock de categorias em uma única faixa visual',async({page})=>{
 await page.goto('/laguna')
 const categorySlot=page.locator('.vl-category-slot')
 await expect(categorySlot).toBeVisible()
 await expect(categorySlot.locator('.category-card')).toHaveCount(10)
 const style=await categorySlot.locator('.category-grid').evaluate(el=>({display:getComputedStyle(el).display,flexWrap:getComputedStyle(el).flexWrap,overflowX:getComputedStyle(el).overflowX}))
 expect(style.display).toBe('flex')
 expect(style.flexWrap).toBe('nowrap')
 expect(['auto','scroll']).toContain(style.overflowX)
})

test('categoria da home abre somente a categoria selecionada',async({page})=>{
 await page.goto('/laguna')
 const restaurant=page.locator('.category-card').filter({hasText:'Restaurantes'}).first()
 await expect(restaurant).toBeVisible()
 await restaurant.click()
 await expect(page).toHaveURL(/\/laguna\/empresas\?categoria=restaurantes/)
 await expect(page.getByRole('button',{name:/Restaurantes/i})).toHaveClass(/active/)
})

test('agenda possui URL por cidade e retorno',async({page})=>{
 await page.goto('/laguna/eventos')
 await expect(page).toHaveURL(/\/laguna\/eventos/)
 await expect(page.getByRole('heading',{name:/Eventos em Laguna/i})).toBeVisible()
 await expect(page.getByRole('button',{name:'← Voltar'})).toBeVisible()
})

test('catalogo moderno possui filtros e cards visuais',async({page})=>{
 await page.goto('/laguna/empresas')
 await expect(page.getByRole('heading',{name:'Empresas em Laguna'})).toBeVisible()
 await expect(page.getByRole('link',{name:/Voltar para Laguna/})).toBeVisible()
 await expect(page.locator('.mbl-search-large')).toBeVisible()
 await expect(page.locator('.mbl-chips')).toBeVisible()
 const cards=page.locator('.mbl-card')
 if(await cards.count()){
  await expect(cards.first().locator('.mbl-body h2')).toBeVisible()
  await expect(cards.first().locator('.mbl-footer')).toBeVisible()
 }
})

test('perfil moderno abre a galeria completa de fotos',async({page})=>{
 await page.goto('/laguna/empresas')
 await page.evaluate(()=>{
  const gallery=document.createElement('div')
  gallery.className='mbp-gallery'
  gallery.innerHTML='<div class="mbp-gallery-main"><img src="/laguna-hero.svg" alt="Capa de teste"></div><div class="mbp-gallery-side"><div class="mbp-gallery-thumb"><img src="/laguna-hero.svg" alt="Foto 1"></div><div class="mbp-gallery-thumb"><img src="/laguna-hero.svg" alt="Foto 2"></div><div class="mbp-gallery-more"><strong>+2</strong><span>Ver todas as fotos</span></div></div>'
  document.body.appendChild(gallery)
 })
 const galleryMore=page.locator('.mbp-gallery-more').last()
 await expect(galleryMore).toBeVisible()
 await galleryMore.click()
 await expect(page.locator('#vl-photo-lightbox')).toBeVisible()
 await expect(page.getByRole('dialog',{name:'Galeria de fotos'})).toBeVisible()
 await expect(page.getByText(/1 de 3/)).toBeVisible()
 await page.keyboard.press('Escape')
 await expect(page.locator('#vl-photo-lightbox')).toHaveCount(0)
})

test('cadastro de empresa exige autenticação',async({page})=>{
 await page.goto('/conta?new=business')
 await expect(page.getByRole('heading',{name:/Entre para cadastrar sua empresa/i})).toBeVisible()
})

test('painel de empresas exige perfil administrador',async({page})=>{
 await page.goto('/admin/empresas')
 await expect(page.getByRole('heading',{name:/Acesso restrito/i})).toBeVisible()
})

test('promocoes publicas carregam sem erro visual',async({page})=>{
 await page.goto('/laguna/promocoes')
 await expect(page.getByRole('heading',{name:/Promoções em Laguna/i})).toBeVisible()
 await expect(page.locator('.topbar')).toBeVisible()
})

test('login e conta mostram estados válidos',async({page})=>{
 await page.goto('/conta')
 console.log('ACCOUNT DEBUG URL:',page.url())
 console.log('ACCOUNT DEBUG BODY:',(await page.locator('body').innerText()).slice(0,1200))
 await expect(page.getByRole('heading',{name:/Entre para acessar sua conta/i})).toBeVisible()

 await page.goto('/login')
 await expect(page.getByRole('heading',{name:/Entre na sua conta/i})).toBeVisible()
 await expect(page.getByText('Esqueci minha senha')).toBeVisible()
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
