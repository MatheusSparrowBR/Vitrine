let deferredPrompt=null
let installed=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true
const listeners=new Set()

function notify(){
  for(const listener of listeners)listener({canInstall:Boolean(deferredPrompt),installed})
}

window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault()
  deferredPrompt=event
  notify()
})

window.addEventListener('appinstalled',()=>{
  deferredPrompt=null
  installed=true
  notify()
})

export function subscribePwaInstall(listener){
  listeners.add(listener)
  listener({canInstall:Boolean(deferredPrompt),installed})
  return ()=>listeners.delete(listener)
}

export async function promptPwaInstall(){
  if(!deferredPrompt)return {outcome:'unavailable'}
  const promptEvent=deferredPrompt
  deferredPrompt=null
  notify()
  const result=await promptEvent.prompt()
  return {outcome:result?.outcome||'dismissed'}
}

export function isPwaInstalled(){
  return installed||window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true
}

export function isIosDevice(){
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent||'')
}

export function isSafariIos(){
  return isIosDevice()&&/safari/i.test(window.navigator.userAgent||'')&&!/crios|fxios|edgios/i.test(window.navigator.userAgent||'')
}
