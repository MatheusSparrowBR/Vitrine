import Stripe from 'npm:stripe'
import { createClient } from 'npm:@supabase/supabase-js@2'
const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')||'')
const admin=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||'')
const secret=Deno.env.get('STRIPE_WEBHOOK_SECRET')||''
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'Content-Type':'application/json'}})
async function getPlan(meta:any,priceId:string|null){
 if(priceId){const{data}=await admin.from('plans').select('id,code').or(`stripe_price_monthly_id.eq.${priceId},stripe_price_yearly_id.eq.${priceId}`).maybeSingle();if(data)return data}
 if(meta?.plan_id){const{data}=await admin.from('plans').select('id,code').eq('id',meta.plan_id).maybeSingle();if(data)return data}
 if(meta?.plan_code){const{data}=await admin.from('plans').select('id,code').eq('code',meta.plan_code).maybeSingle();if(data)return data}
 return null
}
async function sync(sub:any){
 const meta=sub.metadata||{},priceId=sub.items?.data?.[0]?.price?.id||null,plan=await getPlan(meta,priceId)
 const{data:existing}=await admin.from('subscriptions').select('id,user_id,business_id,provider_customer_id,external_customer_id,scheduled_plan_id').eq('provider','stripe').eq('provider_subscription_id',sub.id).maybeSingle()
 const userId=meta.user_id||existing?.user_id,businessId=meta.business_id||existing?.business_id
 const customer=typeof sub.customer==='string'?sub.customer:sub.customer?.id
 if(!userId||!businessId||!plan)throw new Error('Assinatura Stripe sem metadados válidos.')
 const{data:business,error:businessError}=await admin.from('businesses').select('id,owner_id').eq('id',businessId).maybeSingle()
 if(businessError||!business||business.owner_id!==userId)throw new Error('Assinatura Stripe não pertence ao proprietário da empresa.')
 const storedCustomer=existing?.provider_customer_id||existing?.external_customer_id
 if(storedCustomer&&customer&&storedCustomer!==customer)throw new Error('Cliente Stripe não corresponde à assinatura da empresa.')
 const stripeInterval=sub.items?.data?.[0]?.price?.recurring?.interval,interval=stripeInterval==='year'?'yearly':stripeInterval==='month'?'monthly':meta.billing_interval||'monthly'
 if(!['monthly','yearly'].includes(interval))throw new Error('Intervalo de cobrança Stripe inválido.')
 const periodEnd=sub.current_period_end?new Date(sub.current_period_end*1000).toISOString():null
 const payload={user_id:userId,business_id:businessId,plan_id:plan.id,status:sub.status,provider:'stripe',billing_interval:interval,provider_customer_id:customer||null,external_customer_id:customer||null,provider_subscription_id:sub.id,external_subscription_id:sub.id,provider_price_id:priceId,current_period_start:sub.current_period_start?new Date(sub.current_period_start*1000).toISOString():null,current_period_end:periodEnd,ends_at:periodEnd,cancel_at_period_end:Boolean(sub.cancel_at_period_end)}
 const result=existing?.id?await admin.from('subscriptions').update(payload).eq('id',existing.id):await admin.from('subscriptions').insert(payload);if(result.error)throw result.error
 if(existing?.id&&existing.scheduled_plan_id&&plan.id===existing.scheduled_plan_id&&sub.status==='active')await admin.from('subscriptions').update({scheduled_plan_id:null,scheduled_billing_interval:null,scheduled_change_at:null}).eq('id',existing.id)
}
Deno.serve(async req=>{
 if(req.method!=='POST')return json({error:'Method not allowed'},405)
 if(!secret||!Deno.env.get('STRIPE_SECRET_KEY'))return json({error:'Webhook Stripe não configurado.'},500)
 const body=await req.text(),signature=req.headers.get('stripe-signature')||'';let event:any
 try{event=await stripe.webhooks.constructEventAsync(body,signature,secret,undefined,Stripe.createSubtleCryptoProvider())}catch{return new Response('Assinatura inválida',{status:400})}
 const{data:dup}=await admin.from('billing_events').select('id').eq('provider','stripe').eq('provider_event_id',event.id).maybeSingle();if(dup)return json({received:true,deduplicated:true})
 const{error:rec}=await admin.from('billing_events').insert({provider:'stripe',provider_event_id:event.id,event_type:event.type,payload:event});if(rec){if(rec.code==='23505')return json({received:true,deduplicated:true});return json({error:'Falha ao registrar evento.'},500)}
 try{
   if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){const s=event.data.object;if(s.subscription)await sync(await stripe.subscriptions.retrieve(String(s.subscription),{expand:['items.data.price']}))}
   else if(event.type==='invoice.paid'){const i=event.data.object;if(i.subscription)await sync(await stripe.subscriptions.retrieve(String(i.subscription),{expand:['items.data.price']}))}
   else if(event.type==='invoice.payment_failed'||event.type==='invoice.payment_action_required'){const i=event.data.object;if(i.subscription)await sync(await stripe.subscriptions.retrieve(String(i.subscription),{expand:['items.data.price']}))}
   else if(event.type==='customer.subscription.updated'||event.type==='customer.subscription.created'||event.type==='customer.subscription.resumed'||event.type==='customer.subscription.paused')await sync(event.data.object)
   else if(event.type==='customer.subscription.deleted'){const s=event.data.object;const endedAt=s.ended_at?new Date(s.ended_at*1000).toISOString():new Date().toISOString();const periodEnd=s.current_period_end?new Date(s.current_period_end*1000).toISOString():endedAt;const{error}=await admin.from('subscriptions').update({status:'canceled',ends_at:endedAt,current_period_end:periodEnd,cancel_at_period_end:false,scheduled_plan_id:null,scheduled_billing_interval:null,scheduled_change_at:null}).eq('provider','stripe').eq('provider_subscription_id',s.id);if(error)throw error}
 }catch(e){await admin.from('billing_events').delete().eq('provider','stripe').eq('provider_event_id',event.id);return json({error:'Evento recebido, mas a sincronização falhou.'},500)}
 return json({received:true})
})
