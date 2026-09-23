const VAPID_PUBLIC_KEY=import.meta.env.VITE_VAPID_PUBLIC_KEY||''

function base64UrlToUint8Array(value){
  const padding='='.repeat((4-(value.length%4))%4)
  const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/')
  const raw=window.atob(base64)
  return Uint8Array.from([...raw].map(char=>char.charCodeAt(0)))
}

export function isPushSupported(){
  return Boolean(
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function getVapidPublicKey(){
  return VAPID_PUBLIC_KEY
}

export async function getPushSubscription(){
  if(!isPushSupported())return null
  const registration=await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function createPushSubscription(){
  if(!isPushSupported())return null
  if(!VAPID_PUBLIC_KEY)throw new Error('VITE_VAPID_PUBLIC_KEY não configurada')
  const registration=await navigator.serviceWorker.ready
  return registration.pushManager.subscribe({
    userVisibleOnly:true,
    applicationServerKey:base64UrlToUint8Array(VAPID_PUBLIC_KEY),
  })
}
