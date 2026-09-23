import {test,expect} from '@playwright/test'

test.describe('PWA fase 1.2',()=>{
  test('registra o service worker, expõe o manifest e controla a aplicação',async({page})=>{
    await page.goto('/laguna',{waitUntil:'domcontentloaded'})
    const pwa=await page.evaluate(async()=>{
      const registration=await navigator.serviceWorker.ready
      return {
        scope:registration.scope,
        active:registration.active?.state??null,
        controlled:Boolean(navigator.serviceWorker.controller),
      }
    })
    expect(pwa.scope).toBe('http://127.0.0.1:5173/')
    expect(pwa.active).toBe('activated')
    expect(pwa.controlled).toBe(true)

    const manifest=await page.evaluate(async()=>{
      const response=await fetch('/site.webmanifest')
      const data=await response.json()
      const icons=await Promise.all(data.icons.map(async icon=>{
        const iconResponse=await fetch(icon.src)
        return {src:icon.src,status:iconResponse.status}
      }))
      return {status:response.status,data,icons}
    })

    expect(manifest.status).toBe(200)
    expect(manifest.data.name).toBe('VitrineLocal')
    expect(manifest.data.start_url).toBe('/laguna')
    expect(manifest.data.display).toBe('standalone')
    expect(manifest.data.scope).toBe('/')
    expect(manifest.data.icons).toHaveLength(4)
    expect(manifest.icons.every(icon=>icon.status===200)).toBe(true)
  })

  test('mantém a rota principal disponível offline após o primeiro carregamento',async({page,context})=>{
    await page.goto('/laguna',{waitUntil:'domcontentloaded'})
    await page.evaluate(()=>navigator.serviceWorker.ready)
    await expect(page.locator('#root')).toBeVisible()

    await context.setOffline(true)
    await page.reload({waitUntil:'domcontentloaded'})
    await expect(page.locator('#root')).toBeVisible()
    await context.setOffline(false)
  })
})
