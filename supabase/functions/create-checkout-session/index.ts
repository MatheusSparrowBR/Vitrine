import Stripe from 'npm:stripe'
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
const response=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})

function getClients(){
  const stripeSecret=Deno.env.get('STRIPE_SECRET_KEY')||''
  if(!stripeSecret)return null
  const supabaseUrl=Deno.env.get('SUPABASE_URL')||''
  const serviceRole=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||''
  if(!supabaseUrl||!serviceRole)return null
  return {stripe:new Stripe(stripeSecret),admin:createClient(supabaseUrl,serviceRole)}
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return response({error:'Method not allowed'},405)
  try{
    const clients=getClients()
    if(!clients)return response({error:'Checkout não configurado: verifique STRIPE_SECRET_KEY e as credenciais administrativas do Supabase.'},500)
    const {stripe,admin}=clients
    const siteUrl=(Deno.env.get('SITE_URL')||'').replace(/\/+$/,'')
    if(!siteUrl)return response({error:'SITE_URL não configurada.'},500)
    const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'')
    if(!token)return response({error:'Não autenticado.'},401)
    const {data:{user},error:userError}=await admin.auth.getUser(token)
    if(userError||!user)return response({error:'Sessão inválida. Faça login novamente.'},401)

    const body=await req.json().catch(()=>null)
    const businessId=String(body?.business_id||'')
    const planCode=String(body?.plan_code||'')
    const requestedInterval=String(body?.interval||'')
    if(!businessId||!['pro','premium'].includes(planCode)||!['monthly','yearly'].includes(requestedInterval))return response({error:'Empresa, plano e intervalo válidos são obrigatórios.'},400)
    const interval=requestedInterval==='yearly'?'yearly':'monthly'

    const {data:business,error:businessError}=await admin.from('businesses').select('id,name,owner_id').eq('id',businessId).eq('owner_id',user.id).maybeSingle()
    if(businessError)return response({error:'Não foi possível validar a empresa.'},500)
    if(!business)return response({error:'Empresa não encontrada ou sem permissão.'},403)

    const {data:existing,error:existingError}=await admin.from('subscriptions').select('id,provider_subscription_id,status').eq('business_id',business.id).eq('provider','stripe').in('status',['incomplete','active','trialing','past_due','unpaid','paused']).order('created_at',{ascending:false}).limit(1).maybeSingle()
    if(existingError)return response({error:'Não foi possível verificar a assinatura atual.'},500)
    if(existing?.provider_subscription_id)return response({error:'Esta empresa já possui uma assinatura Stripe. Use a gestão da assinatura para alterar, regularizar ou cancelar o plano.'},409)

    const {data:plan,error:planError}=await admin.from('plans').select('id,code,name,price_monthly,price_yearly,stripe_product_id,stripe_price_monthly_id,stripe_price_yearly_id').eq('code',planCode).eq('active',true).maybeSingle()
    if(planError)return response({error:'Não foi possível carregar o plano.'},500)
    if(!plan)return response({error:'Plano não encontrado.'},404)

    const priceId=interval==='yearly'?String(plan.stripe_price_yearly_id||''):String(plan.stripe_price_monthly_id||'')
    if(!priceId.startsWith('price_'))return response({error:`Preço Stripe do plano ${plan.name} (${interval}) não está configurado.`},500)

    let price:any
    try{price=await stripe.prices.retrieve(priceId)}catch(e){
      const detail=e instanceof Error?e.message:'Preço Stripe não encontrado.'
      return response({error:`Preço Stripe inválido para ${plan.name}: ${detail}`},500)
    }
    const expectedAmount=Math.round(Number(interval==='yearly'?plan.price_yearly:plan.price_monthly)*100)
    const expectedStripeInterval=interval==='yearly'?'year':'month'
    if(price.deleted||!price.active||price.currency!=='brl'||price.unit_amount!==expectedAmount||price.type!=='recurring'||price.recurring?.interval!==expectedStripeInterval){
      return response({error:`Preço Stripe do plano ${plan.name} está incompatível com o catálogo do VitrineLocal.`},500)
    }

    const metadata={business_id:business.id,user_id:user.id,plan_id:plan.id,plan_code:plan.code,billing_interval:interval}
    const session=await stripe.checkout.sessions.create({mode:'subscription',line_items:[{price:priceId,quantity:1}],customer_email:user.email||undefined,allow_promotion_codes:true,success_url:`${siteUrl}/planos?checkout=success&business_id=${encodeURIComponent(business.id)}`,cancel_url:`${siteUrl}/planos?checkout=cancelled&business_id=${encodeURIComponent(business.id)}`,client_reference_id:business.id,metadata,subscription_data:{metadata}})
    if(!session.url)return response({error:'Stripe não retornou a URL do checkout.'},502)
    return response({url:session.url,id:session.id})
  }catch(e){
    const detail=e instanceof Error?e.message:'Erro inesperado ao iniciar o checkout.'
    return response({error:`Não foi possível iniciar o checkout: ${detail}`},500)
  }
})