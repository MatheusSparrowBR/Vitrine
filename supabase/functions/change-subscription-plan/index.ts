import Stripe from 'npm:stripe'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')||'')
const admin=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||'')
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
const rank=(code:string)=>code==='free'?0:code==='pro'?1:2

async function ensureStripePrice(plan:any,interval:'monthly'|'yearly'){
 const priceField=interval==='yearly'?'stripe_price_yearly_id':'stripe_price_monthly_id'
 const amount=Math.round(Number(interval==='yearly'?plan.price_yearly:plan.price_monthly)*100)
 if(!amount||amount<1)throw new Error('Preço do plano inválido.')
 let productId=plan.stripe_product_id||null
 if(productId){try{const product=await stripe.products.retrieve(productId);if(product.deleted)productId=null}catch{productId=null}}
 if(!productId){
   const product=await stripe.products.create({name:`VitrineLocal ${plan.name}`,metadata:{vitrine_plan_id:String(plan.id),plan_code:String(plan.code)}},{idempotencyKey:`vitrine-plan-product-${plan.id}`})
   productId=product.id
   const{error}=await admin.from('plans').update({stripe_product_id:productId}).eq('id',plan.id);if(error)throw error
 }
 const stored=plan[priceField]
 if(stored){try{const current=await stripe.prices.retrieve(stored);const intervalOk=current.recurring?.interval===(interval==='yearly'?'year':'month');if(!current.deleted&&current.active&&current.unit_amount===amount&&current.currency==='brl'&&intervalOk&&current.product===productId)return current.id}catch{}}
 const price=await stripe.prices.create({product:productId,currency:'brl',unit_amount:amount,recurring:{interval:interval==='yearly'?'year':'month'},metadata:{vitrine_plan_id:String(plan.id),plan_code:String(plan.code),billing_interval:interval}},{idempotencyKey:`vitrine-plan-price-${plan.id}-${interval}-${amount}`})
 const{error}=await admin.from('plans').update({stripe_product_id:productId,[priceField]:price.id}).eq('id',plan.id);if(error)throw error
 return price.id
}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 if(req.method!=='POST')return json({error:'Method not allowed'},405)
 if(!Deno.env.get('STRIPE_SECRET_KEY'))return json({error:'Stripe não configurado no Supabase.'},500)
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'')
 if(!token)return json({error:'Não autenticado.'},401)
 const{data:{user},error:userError}=await admin.auth.getUser(token)
 if(userError||!user)return json({error:'Sessão inválida.'},401)
 const body=await req.json().catch(()=>null)
 const businessId=String(body?.business_id||''),targetCode=String(body?.plan_code||''),requestedInterval=String(body?.interval||'')
 if(!businessId||!['free','pro','premium'].includes(targetCode)||!['monthly','yearly'].includes(requestedInterval))return json({error:'Empresa, plano e intervalo válidos são obrigatórios.'},400)
 const interval=requestedInterval==='yearly'?'yearly':'monthly'
 const{data:business}=await admin.from('businesses').select('id,name,owner_id').eq('id',businessId).eq('owner_id',user.id).maybeSingle();if(!business)return json({error:'Empresa não encontrada ou sem permissão.'},403)
 const{data:record}=await admin.from('subscriptions').select('id,status,provider_subscription_id,provider_customer_id,external_customer_id,provider_price_id,plan_id,billing_interval,current_period_start,current_period_end,cancel_at_period_end,scheduled_plan_id,scheduled_billing_interval,scheduled_change_at').eq('business_id',business.id).eq('user_id',user.id).eq('provider','stripe').in('status',['incomplete','active','trialing','past_due','unpaid','paused']).order('created_at',{ascending:false}).limit(1).maybeSingle()
 if(!record?.provider_subscription_id)return json({error:'Nenhuma assinatura paga ativa foi encontrada para esta empresa.'},404)
 if(['past_due','unpaid'].includes(record.status))return json({error:'Há um problema de pagamento. Regularize a assinatura antes de trocar de plano.'},409)
 const subscription:any=await stripe.subscriptions.retrieve(record.provider_subscription_id,{expand:['items.data.price']})
 if(!['active','trialing'].includes(subscription.status))return json({error:'A assinatura Stripe não está ativa para troca de plano.'},409)
 const stripeCustomer=typeof subscription.customer==='string'?subscription.customer:subscription.customer?.id
 const storedCustomer=record.provider_customer_id||record.external_customer_id
 if(storedCustomer&&stripeCustomer&&storedCustomer!==stripeCustomer)return json({error:'Cliente Stripe não corresponde à assinatura da empresa.'},409)
 const{data:target}=await admin.from('plans').select('id,code,name,price_monthly,price_yearly,stripe_product_id,stripe_price_monthly_id,stripe_price_yearly_id').eq('code',targetCode).eq('active',true).maybeSingle();if(!target)return json({error:'Plano de destino não encontrado.'},404)
 const item=subscription.items?.data?.[0];if(!item)return json({error:'Assinatura Stripe sem item de cobrança.'},500)
 const currentPriceId=item.price?.id||record.provider_price_id||null
 const{data:currentPlan}=currentPriceId?await admin.from('plans').select('id,code,name').or(`stripe_price_monthly_id.eq.${currentPriceId},stripe_price_yearly_id.eq.${currentPriceId}`).maybeSingle():{data:null}
 if(currentPriceId&&!currentPlan)return json({error:'O preço atual da assinatura não está vinculado a um plano válido. A troca foi bloqueada para proteger a cobrança.'},409)
 const currentCode=currentPlan?.code||null
 if(!currentCode)return json({error:'O plano atual da assinatura não pôde ser identificado.'},409)
 if(targetCode===currentCode&&subscription.cancel_at_period_end){
   const updated:any=await stripe.subscriptions.update(subscription.id,{cancel_at_period_end:false,metadata:{business_id:business.id,user_id:user.id,plan_id:target.id,plan_code:target.code,billing_interval:subscription.items?.data?.[0]?.price?.recurring?.interval==='year'?'yearly':subscription.items?.data?.[0]?.price?.recurring?.interval==='month'?'monthly':record.billing_interval||interval}})
   await admin.from('subscriptions').update({cancel_at_period_end:false,scheduled_plan_id:null,scheduled_billing_interval:null,scheduled_change_at:null,ends_at:updated.current_period_end?new Date(updated.current_period_end*1000).toISOString():record.ends_at}).eq('id',record.id)
   return json({mode:'resumed',effective_at:new Date().toISOString(),plan_code:target.code})
 }
 if(targetCode==='free'){
   const updated:any=await stripe.subscriptions.update(subscription.id,{cancel_at_period_end:true,metadata:{business_id:business.id,user_id:user.id,plan_id:currentPlan.id,plan_code:currentCode,billing_interval:record.billing_interval||interval}})
   const effectiveAt=updated.current_period_end?new Date(updated.current_period_end*1000).toISOString():new Date().toISOString()
   await admin.from('subscriptions').update({cancel_at_period_end:true,scheduled_plan_id:target.id,scheduled_billing_interval:null,scheduled_change_at:effectiveAt}).eq('id',record.id)
   return json({mode:'canceled_at_period_end',effective_at:effectiveAt,plan_code:'free'})
 }
 const targetPriceId=await ensureStripePrice(target,interval)
 const currentInterval=subscription.items?.data?.[0]?.price?.recurring?.interval==='year'?'yearly':'monthly'
 const currentIsPaid=currentCode!=='free'
 const sameInterval=currentInterval===interval
 const immediate=currentIsPaid&&sameInterval&&rank(targetCode)>rank(currentCode)&&!subscription.cancel_at_period_end
 if(immediate){
   const updated:any=await stripe.subscriptions.update(subscription.id,{items:[{id:item.id,price:targetPriceId,quantity:item.quantity||1}],proration_behavior:'create_prorations',cancel_at_period_end:false,metadata:{business_id:business.id,user_id:user.id,plan_id:target.id,plan_code:target.code,billing_interval:interval}})
   const payload={plan_id:target.id,billing_interval:interval,provider_price_id:targetPriceId,current_period_start:updated.current_period_start?new Date(updated.current_period_start*1000).toISOString():null,current_period_end:updated.current_period_end?new Date(updated.current_period_end*1000).toISOString():null,ends_at:updated.current_period_end?new Date(updated.current_period_end*1000).toISOString():null,cancel_at_period_end:false,scheduled_plan_id:null,scheduled_billing_interval:null,scheduled_change_at:null,status:updated.status}
   const{error}=await admin.from('subscriptions').update(payload).eq('id',record.id);if(error)throw error
   return json({mode:'immediate',effective_at:new Date().toISOString(),plan_code:target.code})
 }
 let existingScheduleId=typeof subscription.schedule==='string'?subscription.schedule:subscription.schedule?.id||null
 if(existingScheduleId){try{await stripe.subscriptionSchedules.release(existingScheduleId)}catch{}}
 if(subscription.cancel_at_period_end)await stripe.subscriptions.update(subscription.id,{cancel_at_period_end:false})
 const schedule:any=await stripe.subscriptionSchedules.create({from_subscription:subscription.id})
 const currentStart=schedule.current_phase?.start_date||subscription.current_period_start
 await stripe.subscriptionSchedules.update(schedule.id,{end_behavior:'release',phases:[{start_date:currentStart,end_date:subscription.current_period_end,items:[{price:item.price.id,quantity:item.quantity||1}],metadata:{plan_id:String(currentPlan.id),plan_code:currentCode,billing_interval:currentInterval}},{items:[{price:targetPriceId,quantity:1}],metadata:{plan_id:String(target.id),plan_code:String(target.code),billing_interval:interval}}]} as any)
 const effectiveAt=new Date(subscription.current_period_end*1000).toISOString()
 const{error}=await admin.from('subscriptions').update({scheduled_plan_id:target.id,scheduled_billing_interval:interval,scheduled_change_at:effectiveAt,cancel_at_period_end:false}).eq('id',record.id);if(error)throw error
 return json({mode:'scheduled',effective_at:effectiveAt,plan_code:target.code})
})
