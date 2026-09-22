import {test,expect} from '@playwright/test'

test('home de Laguna usa a nova UX sobre dados reais do catálogo',async({page})=>{
 await page.goto('/laguna')
 await expect(page.locator('.vl-site-header')).toHaveCount(1)
 await expect(page.locator('.vl-site-brand-logo')).toBeVisible()
 await expect(page.getByRole('link',{name:'Entrar'})).toBeVisible()
 await expect(page.getByText('Enviar conteúdo')).toHaveCount(0)
 await expect(page.getByRole('heading',{name:/Descubra o que Laguna tem de melhor/i})).toBeVisible()
  await expect(page.locator('.lvp-featured')).toBeVisible()
  await expect(page.locator('.lvp-events')).toBeVisible()
 await expect(page.locator('.lvp-weather')).toBeVisible()
 await expect(page.locator('.lvp-sponsored, .lvp-empty-sponsored')).toHaveCount(1)
 expect(await page.locator('.lvp-cat-grid a').count()).toBeLessThanOrEqual(7)
 await expect(page.locator('.lvp-category-count')).toHaveText(/\d+ categorias? disponíveis/i)
 await expect(page.getByRole('link',{name:/Cadastrar empresa/i}).last()).toBeVisible()
})

test('home desktop mantém header, hero e largura estável',async({page})=>{
 await page.setViewportSize({width:1440,height:900})
 await page.goto('/laguna')
 await expect(page.locator('.vl-site-header')).toBeVisible()
 await expect(page.locator('.lvp-hero')).toBeVisible()
 await expect(page.locator('.lvp-hero-inner')).toBeVisible()
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1)
 expect(overflow).toBe(false)
})
 
test('header global mantém o mesmo componente em todas as páginas principais',async({page})=>{
 const routes=['/laguna/empresas','/laguna/promocoes','/laguna/eventos','/planos','/privacidade','/termos','/conta']
 for(const route of routes){
  await page.goto(route)
  await expect(page.locator('.vl-site-header')).toHaveCount(1)
  await expect(page.locator('.vl-site-header')).toBeVisible()
  await expect(page.locator('.vl-site-brand')).toBeVisible()
  await expect(page.locator('.vl-site-city')).toBeVisible()
  await expect(page.locator('.vl-site-business-cta')).toBeVisible()
  const visibleLegacyHeaders=page.locator('.topbar:visible, .account-topbar:visible, .mbl-topbar:visible, .mbp-topbar:visible, .legal-page > header:visible')
  await expect(visibleLegacyHeaders).toHaveCount(0)
 }
})

test('header global marca a seção ativa',async({page})=>{
 await page.goto('/laguna/empresas')
 await expect(page.locator('.vl-site-nav-link.active')).toHaveText('Explorar')
 await page.goto('/laguna/promocoes')
 await expect(page.locator('.vl-site-nav-link.active')).toHaveText('Promoções')
 await page.goto('/laguna/eventos')
 await expect(page.locator('.vl-site-nav-link.active')).toHaveText('Eventos')
 await page.goto('/planos')
 await expect(page.locator('.vl-site-nav-link.active')).toHaveText('Planos')
})

test('home mobile abre o menu real do site e não cria overflow horizontal',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.goto('/laguna')
 const toggle=page.locator('.vl-site-menu-toggle')
 await expect(toggle).toBeVisible()
 await expect(toggle).toHaveAttribute('aria-expanded','false')
 await toggle.click()
 await expect(toggle).toHaveAttribute('aria-expanded','true')
 await expect(page.locator('.vl-site-mobile-panel')).toBeVisible()
 await expect(page.getByRole('link',{name:'Explorar',exact:true}).last()).toBeVisible()
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1)
 expect(overflow).toBe(false)
})
 
test('home de Laguna é responsiva no mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.goto('/laguna')
 await expect(page.locator('.vl-site-header')).toBeVisible()
 await expect(page.locator('.vl-site-brand-logo')).toBeVisible()
 await expect(page.locator('.vl-site-menu-toggle')).toBeVisible()
 await expect(page.locator('.lvp-hero-card')).toBeVisible()
})

test('home usa o conjunto atual de categorias e permite abrir uma categoria',async({page})=>{
 await page.goto('/laguna')
 const box=page.locator('.lvp-cat-box')
 await expect(box).toBeVisible()
 const cards=page.locator('.lvp-cat-grid a')
 const count=await cards.count()
 const text=await page.locator('.lvp-category-count').innerText()
 const total=Number((text.match(/\d+/)||[])[0]||0)
 expect(total).toBeGreaterThan(0)
 expect(count).toBeLessThanOrEqual(7)
 const next=box.locator('.lvp-arrow').last()
 if(total>7){await expect(next).toBeEnabled();await next.click()}else{await expect(next).toBeDisabled()}
 if(count)await expect(cards.first()).toHaveAttribute('href',/\/laguna\/empresas\?categoria=/)
})

test('categoria da home aponta para o catálogo da categoria',async({page})=>{
 await page.goto('/laguna')
 const category=page.locator('.lvp-cat-grid a').first()
 if(await category.count()){
  await expect(category).toBeVisible()
  await expect(category).toHaveAttribute('href',/\/laguna\/empresas\?categoria=.+/)
 }
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
 await page.evaluate(()=>{const gallery=document.createElement('div');gallery.className='mbp-gallery';gallery.innerHTML='<div class="mbp-gallery-main"><img src="/laguna-hero.svg" alt="Capa de teste"></div><div class="mbp-gallery-side"><div class="mbp-gallery-thumb"><img src="/laguna-hero.svg" alt="Foto 1"></div><div class="mbp-gallery-thumb"><img src="/laguna-hero.svg" alt="Foto 2"></div><div class="mbp-gallery-more"><strong>+2</strong><span>Ver todas as fotos</span></div></div>';document.body.appendChild(gallery)})
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

test('painéis analytics e empresas exigem perfil administrador ou conta',async({page})=>{
 await page.goto('/admin/empresas')
 await expect(page.getByRole('heading',{name:/Acesso restrito/i})).toBeVisible()
 await page.goto('/admin/analytics')
 await expect(page.getByText('Acesso restrito',{exact:true})).toBeVisible()
 await page.goto('/conta/analytics')
 await expect(page.getByRole('heading',{name:/Acompanhe o desempenho da sua empresa/i})).toBeVisible()
})

test('promocoes publicas carregam sem erro visual',async({page})=>{
 await page.goto('/laguna/promocoes')
 await expect(page.getByRole('heading',{name:/Promoções em Laguna/i})).toBeVisible()
 await expect(page.locator('.vl-site-header')).toBeVisible()
})

test('login e conta mostram estados válidos',async({page})=>{
 await page.goto('/conta')
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


test('home principal traz necessidades com links funcionais',async({page})=>{
 await page.goto('/laguna')
 await expect(page.getByRole('heading',{name:'O que você precisa hoje?'})).toBeVisible()
 const needs=page.locator('.lvp-need-grid a')
 await expect(needs).toHaveCount(4)
 await expect(needs.nth(0)).toHaveAttribute('href',/\/laguna\/empresas\?necessidade=quero-comer/)
 await expect(needs.nth(1)).toHaveAttribute('href',/\/laguna\/empresas\?necessidade=quero-comprar/)
})
