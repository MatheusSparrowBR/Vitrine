import {createClient} from 'npm:@supabase/supabase-js@2'
import {mpRequest,MercadoPagoError,siteUrl} from '../_shared/mercadopago.ts'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})

function admin(){
 const url=Deno.env.get('SUPABASE_URL')||''
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||''
 if(!url||!key)throw new Error('Supabase administrativo não configurado.')
 return createClient(url,key)
}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 if(req.method!=='POST')return response({error:'Method not allowed'},405)
 try{
  const db=admin()
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'')
  if(!token)return response({error:'Não autenticado.'},401)
  const {data:{user},error:userError}=await db.auth.getUser(token)
  if(userError||!user)return response({error:'Sessão inválida. Faça login novamente.'},401)
  const body=await req.json().catch(()=>null)
  const businessId=String(body?.business_id||'')
  const planCode=String(body?.plan_code||'')
  const requestedInterval=String(body?.interval||'')
  if(!businessId||!['pro','premium'].includes(planCode)||!['monthly','yearly'].includes(requestedInterval))return response({error:'Empresa, plano e intervalo válidos são obrigatórios.'},400)
  const interval=requestedInterval==='yearly'?'yearly':'monthly'
  const {data:business,error:businessError}=await db.from('businesses').select('id,name,owner_id').eq('id',businessId).eq('owner_id',user.id).maybeSingle()
  if(businessError)return response({error:'Não foi possível validar a empresa.'},500)
  if(!business)return response({error:'Empresa não encontrada ou sem permissão.'},403)
  const {data:existing,error:existingError}=await db.from('subscriptions').select('id,provider,provider_subscription_id,status').eq('business_id',business.id).in('provider',['mercadopago','stripe']).in('status',['incomplete','active','trialing','past_due','unpaid','paused']).order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(existingError)return response({error:'Não foi possível verificar a assinatura atual.'},500)
  if(existing?.provider_subscription_id)return response({error:'Esta empresa já possui uma assinatura. Use a gestão da assinatura para alterar, regularizar ou cancelar o plano.'},409)
  const {data:plan,error:planError}=await db.from('plans').select('id,code,name,price_monthly,price_yearly,payment_provider').eq('code',planCode).eq('active',true).maybeSingle()
  if(planError)return response({error:'Não foi possível carregar o plano.'},500)
  if(!plan)return response({error:'Plano não encontrado.'},404)
  if(plan.payment_provider&&plan.payment_provider!=='mercadopago')return response({error:'Este plano ainda não está configurado para Mercado Pago.'},409)
  const amount=Number(interval==='yearly'?plan.price_yearly:plan.price_monthly)
  if(!Number.isFinite(amount)||amount<=0)return response({error:'Preço do plano inválido.'},500)
  const origin=siteUrl(req)
  const backUrl=`${origin}/planos?checkout=success&business_id=${encodeURIComponent(business.id)}&provider=mercadopago`
  const externalReference=[business.id,plan.id,interval,user.id].join('|')
  const subscription=await mpRequest('/preapproval',{method:'POST',body:JSON.stringify({reason:`VitrineLocal ${plan.name}`,external_reference:externalReference,payer_email:user.email||undefined,auto_recurring:{frequency:interval==='yearly'?12:1,frequency_type:'months',transaction_amount:amount,currency_id:'BRL'},back_url:backUrl,status:'pending'})})
  const row={user_id:user.id,business_id:business.id,plan_id:plan.id,status:'incomplete',provider:'mercadopago',billing_interval:interval,provider_subscription_id:String(subscription.id),external_subscription_id:String(subscription.id),provider_price_id:`mp:${plan.code}:${interval}`,provider_customer_id:subscription.payer_id?String(subscription.payer_id):null,mercadopago_payer_id:subscription.payer_id?String(subscription.payer_id):null,current_period_start:subscription.date_created||new Date().toISOString(),current_period_end:subscription.next_payment_date||null,ends_at:null,cancel_at_period_end:false}
  const {error:insertError}=await db.from('subscriptions').insert(row)
  if(insertError){try{await mpRequest(`/preapproval/${encodeURIComponent(String(subscription.id))}`,{method:'PUT',body:JSON.stringify({status:'cancelled'})})}catch{};return response({error:'A assinatura foi criada no Mercado Pago, mas não foi possível registrá-la no VitrineLocal.'},500)}
  return response({url:subscription.init_point,id:subscription.id,provider:'mercadopago'})
 }catch(e){
  const detail=e instanceof MercadoPagoError?e.message:e instanceof Error?e.message:'Erro inesperado ao iniciar a assinatura.'
  return response({error:detail},e instanceof MercadoPagoError?e.status:500)
 }
})
