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

 
export async function syncPushSubscription(userId){
  if(!userId||!isPushSupported())return {status:'unsupported',subscription:null}
  const subscription=await getPushSubscription()
  if(!subscription)return {status:'none',subscription:null}
  if(!supabaseClient())return {status:'unavailable',subscription}
  const json=subscription.toJSON()
  const{error}=await supabaseClient().from('push_subscriptions').upsert({
    user_id:userId,
    endpoint:json.endpoint,
    p256dh:json.keys?.p256dh||'',
    auth:json.keys?.auth||'',
    user_agent:navigator.userAgent||null,
    platform:getPlatform(),
    enabled:true,
    last_seen_at:new Date().toISOString(),
  },{onConflict:'endpoint'})
  if(error)throw error
  return {status:'active',subscription}
}

export async function disablePushSubscription(userId){
  if(!userId||!isPushSupported())return {status:'unsupported'}
  const subscription=await getPushSubscription()
  if(!subscription)return {status:'none'}
  const endpoint=subscription.endpoint
  const unsubscribed=await subscription.unsubscribe()
  if(!unsubscribed)throw new Error('Não foi possível desativar as notificações neste dispositivo.')
  if(!supabaseClient())return {status:'unsubscribed'}
  const{error}=await supabaseClient().from('push_subscriptions').update({enabled:false,last_seen_at:new Date().toISOString()}).eq('user_id',userId).eq('endpoint',endpoint)
  if(error)throw error
  return {status:'disabled'}
}

function supabaseClient(){
  if(typeof window==='undefined')return null
  return window.__vitrineSupabaseClient||null
}

function getPlatform(){
  if(typeof navigator==='undefined')return 'unknown'
  const ua=navigator.userAgent.toLowerCase()
  if(/iphone|ipad|ipod/.test(ua))return 'ios'
  if(/android/.test(ua))return 'android'
  if(/mac/.test(ua))return 'macos'
  if(/win/.test(ua))return 'windows'
  return 'web'
}
