import {test,expect} from '@playwright/test'

const publicRoutes=['/laguna','/laguna/empresas','/laguna/promocoes','/laguna/eventos','/planos','/login','/usuario/login','/privacidade','/termos']

test('mobile release smoke: public routes render without horizontal overflow',async({page})=>{
 for(const route of publicRoutes){
  await page.goto(route)
  await expect(page.locator('body')).toBeVisible()
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1)
  expect(overflow,`overflow horizontal em ${route}`).toBe(false)
 }
})

test('mobile release smoke: home navigation and catalog interaction work',async({page})=>{
 await page.goto('/laguna')
 await expect(page.locator('.vl-site-header')).toBeVisible()
 await expect(page.locator('.vl-site-menu-toggle')).toBeVisible()
 await page.locator('.vl-site-menu-toggle').click()
 await expect(page.locator('.vl-site-mobile-panel')).toBeVisible()
 await page.getByRole('link',{name:'Explorar',exact:true}).last().click()
 await expect(page).toHaveURL(/\/laguna\/empresas/)
 await expect(page.getByRole('heading',{name:'Empresas em Laguna'})).toBeVisible()
 const card=page.locator('.mbl-card-main').first()
 if(await card.count()){
  await card.click()
  await expect(page).toHaveURL(/\/laguna\/empresa\//)
  await expect(page.locator('main').first()).toBeVisible()
 }
})
