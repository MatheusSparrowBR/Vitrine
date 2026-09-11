import Stripe from 'npm:stripe'
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
}
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,'Content-Type':'application/json'}})

function getClients(){
  const supabaseUrl=Deno.env.get('SUPABASE_URL')||''
  const serviceRole=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||''
  if(!supabaseUrl||!serviceRole)throw new Error('Supabase administrativo não configurado.')
  const stripeSecret=Deno.env.get('STRIPE_SECRET_KEY')||''
  if(!stripeSecret)throw new Error('Stripe não configurado.')
  return {stripe:new Stripe(stripeSecret),admin:createClient(supabaseUrl,serviceRole)}
}

async function getPlan(admin:any,meta:any,priceId:string|null){
  if(priceId){const{data}=await admin.from('plans').select('id,code').or(`stripe_price_monthly_id.eq.${priceId},stripe_price_yearly_id.eq.${priceId}`).maybeSingle();if(data)return data}
  if(meta?.plan_id){const{data}=await admin.from('plans').select('id,code').eq('id',meta.plan_id).maybeSingle();if(data)return data}
  if(meta?.plan_code){const{data}=await admin.from('plans').select('id,code').eq('code',meta.plan_code).maybeSingle();if(data)return data}
  return null
}

async function syncSubscription(admin:any,meta:any,sub:any){
  const subscriptionMeta=meta||sub.metadata||{},priceId=sub.items?.data?.[0]?.price?.id||null,plan=await getPlan(admin,subscriptionMeta,priceId)
  const{data:existing}=await admin.from('subscriptions').select('id,user_id,business_id,provider_customer_id,external_customer_id,scheduled_plan_id').eq('provider','stripe').eq('provider_subscription_id',sub.id).maybeSingle()
  const userId=subscriptionMeta.user_id||existing?.user_id,businessId=subscriptionMeta.business_id||existing?.business_id
  const customer=typeof sub.customer==='string'?sub.customer:sub.customer?.id
  if(!userId||!businessId||!plan)throw new Error('Assinatura Stripe sem metadados válidos.')
  const{data:business,error:businessError}=await admin.from('businesses').select('id,owner_id').eq('id',businessId).maybeSingle()
  if(businessError||!business||business.owner_id!==userId)throw new Error('Assinatura Stripe não pertence ao proprietário da empresa.')
  const storedCustomer=existing?.provider_customer_id||existing?.external_customer_id
  if(storedCustomer&&customer&&storedCustomer!==customer)throw new Error('Cliente Stripe não corresponde à assinatura da empresa.')
  const stripeInterval=sub.items?.data?.[0]?.price?.recurring?.interval,interval=stripeInterval==='year'?'yearly':stripeInterval==='month'?'monthly':subscriptionMeta.billing_interval||'monthly'
  if(!['monthly','yearly'].includes(interval))throw new Error('Intervalo de cobrança Stripe inválido.')
  const periodEnd=sub.current_period_end?new Date(sub.current_period_end*1000).toISOString():null
  const payload={user_id:userId,business_id:businessId,plan_id:plan.id,status:sub.status,provider:'stripe',billing_interval:interval,provider_customer_id:customer||null,external_customer_id:customer||null,provider_subscription_id:sub.id,external_subscription_id:sub.id,provider_price_id:priceId,current_period_start:sub.current_period_start?new Date(sub.current_period_start*1000).toISOString():null,current_period_end:periodEnd,ends_at:periodEnd,cancel_at_period_end:Boolean(sub.cancel_at_period_end)}
  const result=existing?.id?await admin.from('subscriptions').update(payload).eq('id',existing.id):await admin.from('subscriptions').insert(payload)
  if(result.error)throw result.error
  if(existing?.id&&existing.scheduled_plan_id&&plan.id===existing.scheduled_plan_id&&sub.status==='active')await admin.from('subscriptions').update({scheduled_plan_id:null,scheduled_billing_interval:null,scheduled_change_at:null}).eq('id',existing.id)
}

async function syncPremiumAdvertisingSubscription(admin:any,sub:any){
  const meta=sub.metadata||{},requestId=String(meta.request_id||''),businessId=String(meta.business_id||''),userId=String(meta.user_id||'')
  if(meta.flow!=='premium_advertising'||!requestId||!businessId||!userId)throw new Error('Assinatura de publicidade sem metadados válidos.')
  const{data:req}=await admin.from('advertising_requests').select('id,business_id,title,description,target_url,desired_start_at,desired_end_at,final_price,creative_mode,artwork_path,artwork_url').eq('id',requestId).maybeSingle()
  if(!req||req.business_id!==businessId)throw new Error('Solicitação de publicidade inválida.')
  const{data:business}=await admin.from('businesses').select('id,owner_id,city_id').eq('id',businessId).maybeSingle()
  if(!business||business.owner_id!==userId)throw new Error('Solicitação de publicidade não pertence ao proprietário.')
  const{data:plan}=await admin.from('plans').select('features').eq('code','premium').maybeSingle()
  if(plan?.features?.premium_ads!==true)throw new Error('Publicidade Premium não está habilitada no catálogo.')
  const paymentStatus=['active','trialing'].includes(sub.status)?'paid':['past_due','unpaid','incomplete'].includes(sub.status)?'failed':'canceled'
  const periodEnd=sub.current_period_end?new Date(sub.current_period_end*1000).toISOString():null
  const{error:reqError}=await admin.from('advertising_requests').update({payment_status:paymentStatus,stripe_subscription_id:sub.id,paid_at:paymentStatus==='paid'?new Date().toISOString():null}).eq('id',requestId)
  if(reqError)throw reqError
  const{data:ad,error:adLookupError}=await admin.from('advertisements').select('id').eq('advertising_request_id',requestId).maybeSingle();if(adLookupError)throw adLookupError
  const payload={advertising_request_id:requestId,business_id:businessId,city_id:business.city_id,title:req.title,description:req.description||null,target_url:req.target_url||null,starts_at:req.desired_start_at||null,ends_at:req.desired_end_at||null,monthly_price:Number(req.final_price||0),billing_status:paymentStatus==='paid'?'paid':paymentStatus==='failed'?'overdue':'canceled',billing_started_at:paymentStatus==='paid'?new Date().toISOString():null,billing_ends_at:periodEnd,image_url:req.artwork_url||null,image_path:req.artwork_path||null,placement:'home_banner',priority:0,active:false}
  const result=ad?.id?await admin.from('advertisements').update(payload).eq('id',ad.id):await admin.from('advertisements').insert(payload)
  if(result.error)throw result.error
  if(paymentStatus==='canceled'||paymentStatus==='failed')await admin.from('advertisements').update({active:false,billing_status:paymentStatus==='failed'?'overdue':'canceled'}).eq('advertising_request_id',requestId)
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return json({error:'Method not allowed'},405)
  const secret=Deno.env.get('STRIPE_WEBHOOK_SECRET')||''
  if(!secret||!Deno.env.get('STRIPE_SECRET_KEY'))return json({error:'Webhook Stripe não configurado.'},500)
  let stripe:any,admin:any
  try{({stripe,admin}=getClients())}catch(e){return json({error:e instanceof Error?e.message:'Configuração inválida.'},500)}
  const body=await req.text(),signature=req.headers.get('stripe-signature')||'';let event:any
  try{event=await stripe.webhooks.constructEventAsync(body,signature,secret,undefined,Stripe.createSubtleCryptoProvider())}catch{return new Response('Assinatura inválida',{status:400,headers:cors})}

  const{data:existingEvent,error:eventLookupError}=await admin.from('billing_events').select('id,processed_at').eq('provider','stripe').eq('provider_event_id',event.id).maybeSingle()
  if(eventLookupError)return json({error:'Falha ao verificar evento.'},500)
  if(existingEvent?.processed_at)return json({received:true,deduplicated:true})
  if(!existingEvent){
    const{error:rec}=await admin.from('billing_events').insert({provider:'stripe',provider_event_id:event.id,event_type:event.type,payload:event})
    if(rec&&rec.code!=='23505')return json({error:'Falha ao registrar evento.'},500)
  }

  try{
    const obj=event.data.object
    const meta=obj?.metadata||{}
    if(meta.flow==='premium_advertising'){
      if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){if(obj.subscription)await syncPremiumAdvertisingSubscription(admin,await stripe.subscriptions.retrieve(String(obj.subscription),{expand:['items.data.price']}))}
      else if(event.type==='invoice.paid'||event.type==='invoice.payment_failed'||event.type==='invoice.payment_action_required'){const i=obj;if(i.subscription)await syncPremiumAdvertisingSubscription(admin,await stripe.subscriptions.retrieve(String(i.subscription),{expand:['items.data.price']}))}
      else if(['customer.subscription.created','customer.subscription.updated','customer.subscription.resumed','customer.subscription.paused'].includes(event.type))await syncPremiumAdvertisingSubscription(admin,obj)
      else if(event.type==='customer.subscription.deleted')await syncPremiumAdvertisingSubscription(admin,{...obj,status:'canceled'})
    }else if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
      if(obj.subscription)await syncSubscription(admin,obj.metadata||{},await stripe.subscriptions.retrieve(String(obj.subscription),{expand:['items.data.price']}))
    }else if(event.type==='invoice.paid'||event.type==='invoice.payment_failed'||event.type==='invoice.payment_action_required'){
      const i=obj
      if(i.subscription)await syncSubscription(admin,i.metadata||{},await stripe.subscriptions.retrieve(String(i.subscription),{expand:['items.data.price']}))
    }else if(['customer.subscription.updated','customer.subscription.created','customer.subscription.resumed','customer.subscription.paused'].includes(event.type)){
      await syncSubscription(admin,obj.metadata||{},obj)
    }else if(event.type==='customer.subscription.deleted'){
      const s=obj,endedAt=s.ended_at?new Date(s.ended_at*1000).toISOString():new Date().toISOString(),periodEnd=s.current_period_end?new Date(s.current_period_end*1000).toISOString():endedAt
      const{error}=await admin.from('subscriptions').update({status:'canceled',ends_at:endedAt,current_period_end:periodEnd,cancel_at_period_end:false,scheduled_plan_id:null,scheduled_billing_interval:null,scheduled_change_at:null}).eq('provider','stripe').eq('provider_subscription_id',s.id)
      if(error)throw error
    }
    const{error:processedError}=await admin.from('billing_events').update({processed_at:new Date().toISOString()}).eq('provider','stripe').eq('provider_event_id',event.id)
    if(processedError)throw processedError
  }catch(e){
    return json({error:'Evento recebido, mas a sincronização falhou.'},500)
  }
  return json({received:true})
})
