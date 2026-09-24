const CACHE_NAME = 'vitrine-local-shell-v4'
const APP_SHELL = [
  '/',
  '/laguna',
  '/site.webmanifest',
  '/favicon.svg',
  '/icons/vitrine-local.svg',
  '/icons/vitrine-local-maskable.svg',
]

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {})
      }
      return response
    }).catch(async () => {
      const cached = await caches.match(event.request)
      if (cached) return cached
      if (event.request.mode === 'navigate') {
        const shell = await caches.match('/laguna')
        if (shell) return shell
      }
      throw new Error('offline-resource-unavailable')
    })
  )
})

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

const DEFAULT_NOTIFICATION_TITLE = 'VitrineLocal'
const DEFAULT_NOTIFICATION_BODY = 'Você tem uma nova atualização.'
const DEFAULT_NOTIFICATION_URL = '/laguna'
const NOTIFICATION_ICON = '/icons/vitrine-local.svg'

function getPushPayload(event) {
  try {
    return event.data ? event.data.json() : {}
  } catch {
    try {
      return event.data ? { body: event.data.text() } : {}
    } catch {
      return {}
    }
  }
}

function getNotificationUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_NOTIFICATION_URL
  try {
    const url = new URL(value, self.location.origin)
    if (url.origin !== self.location.origin) return DEFAULT_NOTIFICATION_URL
    return url.pathname + url.search + url.hash
  } catch {
    return DEFAULT_NOTIFICATION_URL
  }
}

async function sendDeliveryFeedback(feedbackUrl, notificationId, deliveryToken) {
  if (!feedbackUrl || !notificationId || !deliveryToken) return false
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(feedbackUrl, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notificationId, token: deliveryToken }),
      })
      if (response.ok) return true
    } catch {
      // Retry while the service-worker event is alive.
    }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
  }
  return false
}

function getDeliveryFeedback(data) {
  return {
    feedbackUrl: typeof data.delivery_feedback_url === 'string' ? data.delivery_feedback_url.trim() : '',
    notificationId: typeof data.notification_id === 'string' ? data.notification_id : '',
    deliveryToken: typeof data.delivery_token === 'string' ? data.delivery_token : '',
  }
}

self.addEventListener('push', event => {
  const data = getPushPayload(event)
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : DEFAULT_NOTIFICATION_TITLE
  const body = typeof data.body === 'string' && data.body.trim()
    ? data.body.trim()
    : typeof data.message === 'string' && data.message.trim()
      ? data.message.trim()
      : DEFAULT_NOTIFICATION_BODY
  const url = getNotificationUrl(data.url || data.link)
  const tag = typeof data.tag === 'string' && data.tag.trim() ? data.tag.trim() : `vitrine-local-push-${Date.now()}`
  const { feedbackUrl, notificationId, deliveryToken } = getDeliveryFeedback(data)

  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body,
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      tag,
      renotify: true,
      data: { url },
    })
    await sendDeliveryFeedback(feedbackUrl, notificationId, deliveryToken)
  })())
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = getNotificationUrl(event.notification.data?.url)
  event.waitUntil((async () => {
    const absoluteUrl = new URL(targetUrl, self.location.origin).href
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clientsList) {
      if (client.url === absoluteUrl && 'focus' in client) return client.focus()
    }
    if (self.clients.openWindow) return self.clients.openWindow(absoluteUrl)
  })())
})
