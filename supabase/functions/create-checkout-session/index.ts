import Stripe from 'npm:stripe'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')||'')
const supabaseAdmin=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||'')
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})

async function ensureStripePrice(plan:any,interval:'monthly'|'yearly'){
 const priceField=interval==='yearly'?'stripe_price_yearly_id':'stripe_price_monthly_id'
 const amount=Math.round(Number(interval==='yearly'?plan.price_yearly:plan.price_monthly)*100)
 if(!amount||amount<1)throw new Error('Preço do plano inválido.')
 let productId=plan.stripe_product_id||null
 if(productId){
   try{const product=await stripe.products.retrieve(productId);if(product.deleted)productId=null}catch{productId=null}
 }
 if(!productId){
   const product=await stripe.products.create({name:`VitrineLocal ${plan.name}`,metadata:{vitrine_plan_id:String(plan.id),plan_code:String(plan.code)}} ,{idempotencyKey:`vitrine-plan-product-${plan.id}`})
   productId=product.id
   const{error}=await supabaseAdmin.from('plans').update({stripe_product_id:productId}).eq('id',plan.id)
   if(error)throw error
 }
 const stored=plan[priceField]
 if(stored){
   try{
     const current=await stripe.prices.retrieve(stored)
     const intervalOk=current.recurring?.interval===(interval==='yearly'?'year':'month')
     if(!current.deleted&&current.active&&current.unit_amount===amount&&current.currency==='brl'&&intervalOk&&current.product===productId)return current.id
   }catch{}
 }
 const price=await stripe.prices.create({product:productId,currency:'brl',unit_amount:amount,recurring:{interval:interval==='yearly'?'year':'month'},metadata:{vitrine_plan_id:String(plan.id),plan_code:String(plan.code),billing_interval:interval}},{idempotencyKey:`vitrine-plan-price-${plan.id}-${interval}-${amount}`})
 const{error}=await supabaseAdmin.from('plans').update({stripe_product_id:productId,[priceField]:price.id}).eq('id',plan.id)
 if(error)throw error
 return price.id
}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 if(req.method!=='POST')return response({error:'Method not allowed'},405)
 if(!Deno.env.get('STRIPE_SECRET_KEY'))return response({error:'Stripe não configurado no Supabase.'},500)
 const siteUrl=(Deno.env.get('SITE_URL')||'').replace(/\/+$/,'')
 if(!siteUrl)return response({error:'SITE_URL não configurada.'},500)
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'')
 if(!token)return response({error:'Não autenticado.'},401)
 const{data:{user},error:userError}=await supabaseAdmin.auth.getUser(token)
 if(userError||!user)return response({error:'Sessão inválida.'},401)
 const body=await req.json().catch(()=>null)
 const businessId=String(body?.business_id||'')
 const planCode=String(body?.plan_code||'')
 const requestedInterval=String(body?.interval||'')
 if(!businessId||!['pro','premium'].includes(planCode)||!['monthly','yearly'].includes(requestedInterval))return response({error:'Empresa, plano e intervalo válidos são obrigatórios.'},400)
 const interval=requestedInterval==='yearly'?'yearly':'monthly'
 const{data:business}=await supabaseAdmin.from('businesses').select('id,name,owner_id').eq('id',businessId).eq('owner_id',user.id).maybeSingle()
 if(!business)return response({error:'Empresa não encontrada ou sem permissão.'},403)
 const{data:existing}=await supabaseAdmin.from('subscriptions').select('id,provider_subscription_id,status').eq('business_id',business.id).eq('provider','stripe').in('status',['incomplete','active','trialing','past_due','unpaid','paused']).order('created_at',{ascending:false}).limit(1).maybeSingle()
 if(existing?.provider_subscription_id)return response({error:'Esta empresa já possui uma assinatura Stripe. Use a gestão da assinatura para alterar, regularizar ou cancelar o plano.'},409)
 const{data:plan}=await supabaseAdmin.from('plans').select('id,code,name,price_monthly,price_yearly,stripe_product_id,stripe_price_monthly_id,stripe_price_yearly_id').eq('code',planCode).eq('active',true).maybeSingle()
 if(!plan)return response({error:'Plano não encontrado.'},404)
 const priceId=await ensureStripePrice(plan,interval)
 const metadata={business_id:business.id,user_id:user.id,plan_id:plan.id,plan_code:plan.code,billing_interval:interval}
 const session=await stripe.checkout.sessions.create({mode:'subscription',line_items:[{price:priceId,quantity:1}],customer_email:user.email||undefined,allow_promotion_codes:true,success_url:`${siteUrl}/planos?checkout=success&business_id=${encodeURIComponent(business.id)}`,cancel_url:`${siteUrl}/planos?checkout=cancelled&business_id=${encodeURIComponent(business.id)}`,client_reference_id:business.id,metadata,subscription_data:{metadata}})
 return response({url:session.url,id:session.id})
})
