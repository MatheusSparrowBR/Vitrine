import {test,expect} from '@playwright/test'

test('demo comercial apresenta experiência pública e conta premium sem autenticação',async({page})=>{
 await page.goto('/demo',{waitUntil:'domcontentloaded'})
 await expect(page.locator('.vld-demo-app')).toBeVisible()
 await expect(page.getByRole('heading',{name:'Bistrô Laguna'})).toBeVisible()
 await expect(page.getByText('Festival de Sabores')).toBeVisible()
 await expect(page.getByText('Noite de Música ao Vivo')).toBeVisible()
 await expect(page.getByText('127 avaliações')).toBeVisible()
 await expect(page.getByRole('button',{name:'Minha Conta Premium'})).toBeVisible()
 await page.getByRole('button',{name:'Minha Conta Premium'}).click()
 await expect(page.getByText('CONTA PREMIUM')).toBeVisible()
 await expect(page.getByText('2.843')).toBeVisible()
 await expect(page.getByRole('button',{name:'Publicidade Premium'})).toBeVisible()
})
