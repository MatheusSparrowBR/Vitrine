const SW_URL = '/sw.js'

export function registerPwa() {
  if (!('serviceWorker' in navigator)) return null

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(SW_URL, { scope: '/' }).catch(() => {
      // PWA support is progressive enhancement; app functionality must continue without it.
    })
  }, { once: true })

  return true
}
