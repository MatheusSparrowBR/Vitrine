import {createClient} from 'npm:@supabase/supabase-js@2'
import {mpRequest,MercadoPagoError} from '../_shared/mercadopago.ts'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, x-signature, x-request-id','Access-Control-Allow-Methods':'POST, OPTIONS'}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
const text=(body:string,status=200)=>new Response(body,{status,headers:cors})

function admin(){
 const url=Deno.env.get('SUPABASE_URL')||''
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||''
 if(!url||!key)throw new Error('Supabase administrativo não configurado.')
 return createClient(url,key)
}

function parseSignature(header:string){
 const parts=header.split(',').map(x=>x.trim())
 const result:{ts?:string,v1?:string}={}
 for(const part of parts){const [k,v]=part.split('=');if(k&&v&&(k==='ts'||k==='v1'))result[k]=v}
 return result
}

function timingSafeEqualHex(a:string,b:string){
 const aa=a.toLowerCase(),bb=b.toLowerCase();if(aa.length!==bb.length)return false
 let diff=0;for(let i=0;i<aa.length;i++)diff|=aa.charCodeAt(i)^bb.charCodeAt(i);return diff===0
}

async function validSignature(req:Request,eventId:string){
 const secret=Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET')||''
 if(!secret)return false
 const signature=parseSignature(req.headers.get('x-signature')||'')
 const requestId=req.headers.get('x-request-id')||''
 const ts=Number(signature.ts||0);if(!signature.v1||!requestId||!Number.isFinite(ts))return false
 if(Math.abs(Date.now()-ts*1000)>5*60*1000)return false
 const manifest=`id:${eventId.toLowerCase()};request-id:${requestId};ts:${signature.ts};`
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign'])
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(manifest)))
 const hex=Array.from(digest).map(b=>b.toString(16).padStart(2,'0')).join('')
 return timingSafeEqualHex(hex,signature.v1)
}

function localStatus(status:string){
 switch(String(status||'').toLowerCase()){
  case 'authorized':case 'active':case 'paused': return status==='paused'?'paused':'active'
  case 'pending': return 'incomplete'
  case 'canceled':case 'cancelled': return 'canceled'
  case 'rejected':case 'unpaid':case 'past_due': return 'unpaid'
  default:return 'incomplete'
 }
}

function parseExternalReference(value:unknown){
 const parts=String(value||'').split('|')
 if(parts.length!==4)return null
 return {businessId:parts[0],planId:parts[1],interval:parts[2],userId:parts[3]}
}

async function syncSubscription(subscription:any,a:any){
 const externalId=String(subscription.id||'')
 if(!externalId)throw new Error('Assinatura Mercado Pago sem ID.')
 const db=admin()
 const {data:existing,error:existingError}=await db.from('subscriptions').select('id,user_id,business_id,plan_id').eq('provider','mercadopago').eq('provider_subscription_id',externalId).maybeSingle()
 if(existingError)throw existingError
 const parsed=parseExternalReference(subscription.external_reference)
 const userId=existing?.user_id||parsed?.userId
 const businessId=existing?.business_id||parsed?.businessId
 if(!userId||!businessId)throw new Error('Assinatura Mercado Pago sem vínculo com usuário/empresa.')
 const {data:business,error:businessError}=await db.from('businesses').select('id,owner_id').eq('id',businessId).maybeSingle()
 if(businessError)throw businessError
 if(!business||business.owner_id!==userId)throw new Error('Assinatura Mercado Pago não pertence ao proprietário da empresa.')
 const planId=existing?.plan_id||parsed?.planId
 if(!planId)throw new Error('Assinatura Mercado Pago sem plano.')
 const {data:plan,error:planError}=await db.from('plans').select('id,code').eq('id',planId).maybeSingle()
 if(planError)throw planError
 if(!plan)throw new Error('Plano da assinatura não encontrado.')
 const frequency=Number(subscription.auto_recurring?.frequency||1)
 const interval=frequency===12?'yearly':'monthly'
 const status=localStatus(subscription.status)
 const periodStart=subscription.date_created||subscription.auto_recurring?.start_date||new Date().toISOString()
 const periodEnd=subscription.next_payment_date||subscription.auto_recurring?.end_date||null
 const payload={user_id:userId,business_id:businessId,plan_id:plan.id,status,provider:'mercadopago',billing_interval:interval,provider_customer_id:subscription.payer_id?String(subscription.payer_id):null,external_customer_id:subscription.payer_id?String(subscription.payer_id):null,provider_subscription_id:externalId,external_subscription_id:externalId,provider_price_id:`mp:${plan.code}:${interval}`,mercadopago_payer_id:subscription.payer_id?String(subscription.payer_id):null,current_period_start:periodStart,current_period_end:periodEnd,ends_at:status==='canceled'?(periodEnd||new Date().toISOString()):periodEnd,cancel_at_period_end:false,updated_at:new Date().toISOString()}
 if(existing?.id){const {error}=await db.from('subscriptions').update(payload).eq('id',existing.id);if(error)throw error}else{const {error}=await db.from('subscriptions').insert(payload);if(error)throw error}
}

async function syncAdvertising(subscription:any){
 const meta=String(subscription.external_reference||'')
 if(!meta.startsWith('VL-AD-'))return false
 const requestId=meta.slice(6)
 const db=admin()
 const {data:req,error:reqError}=await db.from('advertising_requests').select('id,business_id').eq('id',requestId).maybeSingle();if(reqError)throw reqError;if(!req)throw new Error('Solicitação de publicidade não encontrada.')
 const status=String(subscription.status||'').toLowerCase()
 const paymentStatus=['authorized','active'].includes(status)?'paid':['pending'].includes(status)?'awaiting_payment':status==='paused'?'paid':'failed'
 const {error}=await db.from('advertising_requests').update({payment_status:paymentStatus,payment_currency:'BRL',mercadopago_subscription_id:String(subscription.id),paid_at:paymentStatus==='paid'?new Date().toISOString():null}).eq('id',requestId);if(error)throw error
 if(paymentStatus!=='paid')await db.from('advertisements').update({active:false,billing_status:paymentStatus==='failed'?'overdue':'canceled'}).eq('advertising_request_id',requestId)
 return true
}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 if(req.method!=='POST')return text('Method not allowed',405)
 const bodyText=await req.text();let body:any={};try{body=JSON.parse(bodyText||'{}')}catch{return text('JSON inválido',400)}
 const eventId=String(body?.data?.id||new URL(req.url).searchParams.get('data.id')||body?.id||'')
 if(!eventId)return text('Evento sem ID',400)
 if(!(await validSignature(req,eventId)))return text('Assinatura inválida',401)
 const providerEventId=String(body?.id||`${body.type}:${eventId}:${body?.action||''}`)
 const db=admin()
 const {data:existingEvent,error:eventLookupError}=await db.from('billing_events').select('id,processed_at').eq('provider','mercadopago').eq('provider_event_id',providerEventId).maybeSingle()
 if(eventLookupError)return json({error:'Falha ao verificar evento.'},500)
 if(existingEvent?.processed_at)return json({received:true,deduplicated:true})
 if(!existingEvent){const {error}=await db.from('billing_events').insert({provider:'mercadopago',provider_event_id:providerEventId,event_type:String(body.type||body.topic||'unknown'),payload:body});if(error&&error.code!=='23505')return json({error:'Falha ao registrar evento.'},500)}
 try{
  const type=String(body.type||body.topic||'')
  if(type==='subscription_preapproval'){
   const subscription=await mpRequest(`/preapproval/${encodeURIComponent(eventId)}`)
   if(!(await syncAdvertising(subscription)))await syncSubscription(subscription,body)
  }else if(type==='subscription_authorized_payment'){
   const invoice=await mpRequest(`/authorized_payments/${encodeURIComponent(eventId)}`)
   const preapprovalId=String(invoice?.preapproval_id||invoice?.subscription_id||'')
   if(preapprovalId){const subscription=await mpRequest(`/preapproval/${encodeURIComponent(preapprovalId)}`);if(!(await syncAdvertising(subscription)))await syncSubscription(subscription,body)}
  }else if(type==='payment'){
   // Registro idempotente do evento; assinatura será sincronizada pelos tópicos de assinatura acima.
  }
  const {error}=await db.from('billing_events').update({processed_at:new Date().toISOString()}).eq('provider','mercadopago').eq('provider_event_id',providerEventId);if(error)throw error
 }catch(e){
  const message=e instanceof MercadoPagoError?`Mercado Pago HTTP ${e.status}`:e instanceof Error?e.message:'Erro inesperado'
  console.error('mercadopago-webhook',message)
  return json({error:'Evento recebido, mas a sincronização falhou.'},500)
 }
 return json({received:true})
})
