const SW_URL = '/sw.js?version=delivery-feedback-v7'
const UPDATE_INTERVAL_MS = 15 * 60 * 1000

async function activateRegistrationUpdate(registration) {
  try {
    await registration.update()
  } catch {
    // A transient update failure must not affect app functionality.
  }
}

function installUpdateLifecycle(registration) {
  let refreshing = false

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing
    if (!newWorker) return

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state !== 'installed' || !navigator.serviceWorker.controller) return
      newWorker.postMessage({ type: 'SKIP_WAITING' })
    })
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  const update = () => activateRegistrationUpdate(registration)
  window.addEventListener('focus', update)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') update()
  })
  window.setInterval(update, UPDATE_INTERVAL_MS)
}

export function registerPwa() {
  if (!('serviceWorker' in navigator)) return null

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(SW_URL, { scope: '/' })
      installUpdateLifecycle(registration)
      await activateRegistrationUpdate(registration)
    } catch {
      // PWA support is progressive enhancement; app functionality must continue without it.
    }
  }, { once: true })

  return true
}
