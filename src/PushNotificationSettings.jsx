import React,{useEffect,useState}from'react'
import{createPushSubscription,getPushSubscription,isPushSupported,getVapidPublicKey,syncPushSubscription,disablePushSubscription}from'./push-notifications.js'
import{supabase}from'./supabase-client.js'
import'./push-notification-settings.css'

function platform(){
 if(typeof navigator==='undefined')return 'unknown'
 const ua=navigator.userAgent.toLowerCase()
 if(/iphone|ipad|ipod/.test(ua))return 'ios'
 if(/android/.test(ua))return 'android'
 if(/mac/.test(ua))return 'macos'
 if(/win/.test(ua))return 'windows'
 return 'web'
}

export default function PushNotificationSettings(){
 const[status,setStatus]=useState('loading')
 const[busy,setBusy]=useState(false)
 const[message,setMessage]=useState('')
 const[error,setError]=useState(false)

 async function refresh(){
  if(!isPushSupported()){setStatus('unsupported');return}
  if(Notification.permission==='denied'){setStatus('denied');return}
  try{const subscription=await getPushSubscription();setStatus(subscription?'active':'idle')}
  catch{setStatus('idle')}
 }

 useEffect(()=>{(async()=>{const{data}=await supabase.auth.getSession();const id=data.session?.user?.id||null;setUserId(id);if(id&&isPushSupported()&&Notification.permission==='granted'){try{const result=await syncPushSubscription(id);if(result.status==='active')setStatus('active');else await refresh()}catch{await refresh()}}else{await refresh()}})()},[])

 async function enable(){
  if(!supabase)return
  setBusy(true);setMessage('');setError(false)
  try{
   if(!isPushSupported()){setStatus('unsupported');return}
   if(!getVapidPublicKey())throw new Error('As notificações ainda não estão configuradas neste ambiente.')
   const permission=await Notification.requestPermission()
   if(permission==='denied'){setStatus('denied');setMessage('As notificações foram bloqueadas no navegador. Você pode alterar essa permissão nas configurações do navegador.');return}
   if(permission!=='granted'){setStatus('idle');setMessage('Permissão não concedida. Você pode tentar novamente quando quiser.');return}
   const subscription=await createPushSubscription()
   if(!subscription)throw new Error('Não foi possível criar a inscrição de notificações.')
   const{data:{session}}=await supabase.auth.getSession()
   if(!session?.user?.id)throw new Error('Sua sessão expirou. Entre novamente para ativar as notificações.')
   await syncPushSubscription(session.user.id)
   setUserId(session.user.id);setStatus('active');setMessage('Notificações ativadas neste dispositivo.')
  }catch(err){setError(true);setMessage(err?.message||'Não foi possível ativar as notificações.')}
  finally{setBusy(false)}
 }

 async function disable(){
  if(!userId)return
  setBusy(true);setMessage('');setError(false)
  try{
   await disablePushSubscription(userId)
   setStatus('idle')
   setMessage('Notificações desativadas neste dispositivo.')
  }catch(err){setError(true);setMessage(err?.message||'Não foi possível desativar as notificações.')}
  finally{setBusy(false)}
 }

 return <section className="push-settings-card" aria-labelledby="push-settings-title">
  <div className="push-settings-icon" aria-hidden="true">🔔</div>
  <div className="push-settings-copy">
   <span className="account-eyebrow">NOTIFICAÇÕES</span>
   <h2 id="push-settings-title">Receba novidades do VitrineLocal</h2>
   <p>Ative as notificações para receber avisos importantes, novidades e futuras oportunidades da plataforma.</p>
   {status==='active'&&<div className="push-settings-status is-active" role="status">● Notificações ativas neste dispositivo</div>}
   {status==='denied'&&<div className="push-settings-status is-muted" role="status">○ Notificações bloqueadas pelo navegador</div>}
   {status==='unsupported'&&<div className="push-settings-status is-muted" role="status">○ Este navegador não oferece suporte a notificações push</div>}
   {message&&<div className={'push-settings-message '+(error?'is-error':'')} role="status">{message}</div>}
  </div>
  {status==='active'?<button className="account-secondary-btn push-settings-button" type="button" onClick={disable} disabled={busy}>{busy?'Desativando…':'Desativar neste dispositivo'}</button>:status==='unsupported'||status==='denied'?null:<button className="account-primary-btn push-settings-button" type="button" onClick={enable} disabled={busy}>{busy?'Ativando…':'Ativar notificações'}</button>}
 </section>
}
