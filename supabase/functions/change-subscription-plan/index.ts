import {createClient} from 'npm:@supabase/supabase-js@2'
import {mpRequest,MercadoPagoError} from '../_shared/mercadopago.ts'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
function admin(){const url=Deno.env.get('SUPABASE_URL')||'',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||'';if(!url||!key)throw new Error('Supabase administrativo não configurado.');return createClient(url,key)}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 if(req.method!=='POST')return response({error:'Method not allowed'},405)
 try{
  const db=admin(),token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'')
  if(!token)return response({error:'Não autenticado.'},401)
  const {data:{user},error:authError}=await db.auth.getUser(token)
  if(authError||!user)return response({error:'Sessão inválida.'},401)
  const body=await req.json().catch(()=>null),businessId=String(body?.business_id||''),targetCode=String(body?.plan_code||''),interval=String(body?.interval||'')
  if(!businessId||!['free','pro','premium'].includes(targetCode)||!['monthly','yearly'].includes(interval))return response({error:'Empresa, plano e intervalo válidos são obrigatórios.'},400)
  const {data:business,error:businessError}=await db.from('businesses').select('id,name,owner_id').eq('id',businessId).eq('owner_id',user.id).maybeSingle()
  if(businessError)return response({error:'Não foi possível validar a empresa.'},500)
  if(!business)return response({error:'Empresa não encontrada ou sem permissão.'},403)
  const {data:current,error:currentError}=await db.from('subscriptions').select('id,plan_id,status,provider_subscription_id,provider_customer_id,billing_interval').eq('business_id',business.id).eq('user_id',user.id).eq('provider','mercadopago').in('status',['incomplete','active','trialing','past_due','unpaid','paused']).order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(currentError)return response({error:'Não foi possível carregar a assinatura atual.'},500)
  if(!current?.provider_subscription_id)return response({error:'Nenhuma assinatura Mercado Pago foi encontrada para esta empresa.'},404)
  if(current.status==='incomplete')return response({error:'Conclua o pagamento da assinatura atual antes de alterar o plano.'},409)
  const {data:target,error:targetError}=await db.from('plans').select('id,code,name,price_monthly,price_yearly,payment_provider').eq('code',targetCode).eq('active',true).maybeSingle()
  if(targetError)return response({error:'Não foi possível carregar o plano de destino.'},500)
  if(!target)return response({error:'Plano de destino não encontrado.'},404)
  if(targetCode==='free'){
   await mpRequest(`/preapproval/${encodeURIComponent(current.provider_subscription_id)}`,{method:'PUT',body:JSON.stringify({status:'cancelled'})})
   const{error}=await db.from('subscriptions').update({status:'canceled',ends_at:new Date().toISOString(),current_period_end:new Date().toISOString(),cancel_at_period_end:false,scheduled_plan_id:null,scheduled_billing_interval:null,scheduled_change_at:null,updated_at:new Date().toISOString()}).eq('id',current.id)
   if(error)throw error
   return response({mode:'canceled',effective_at:new Date().toISOString(),provider:'mercadopago'})
  }
  const amount=Number(interval==='yearly'?target.price_yearly:target.price_monthly)
  if(!Number.isFinite(amount)||amount<=0)return response({error:'Preço do plano inválido.'},500)
  if(target.id===current.plan_id&&interval===current.billing_interval)return response({mode:'noop',provider:'mercadopago'})
  if(interval!==current.billing_interval)return response({error:'A troca entre cobrança mensal e anual exige uma nova autorização no Mercado Pago. Use o checkout do novo ciclo após o cancelamento da assinatura atual.'},409)
  const updated=await mpRequest(`/preapproval/${encodeURIComponent(current.provider_subscription_id)}`,{method:'PUT',body:JSON.stringify({reason:`VitrineLocal ${target.name}`,external_reference:[business.id,target.id,interval,user.id].join('|'),auto_recurring:{transaction_amount:amount,currency_id:'BRL'}})})
  const status=['authorized','active'].includes(String(updated.status))?'active':String(updated.status)==='paused'?'paused':current.status
  const{error}=await db.from('subscriptions').update({plan_id:target.id,billing_interval:interval,provider_price_id:`mp:${target.code}:${interval}`,provider_customer_id:updated.payer_id?String(updated.payer_id):current.provider_customer_id,mercadopago_payer_id:updated.payer_id?String(updated.payer_id):null,current_period_start:updated.date_created||null,current_period_end:updated.next_payment_date||null,ends_at:updated.next_payment_date||null,cancel_at_period_end:false,status,scheduled_plan_id:null,scheduled_billing_interval:null,scheduled_change_at:null,updated_at:new Date().toISOString()}).eq('id',current.id)
  if(error)throw error
  return response({mode:'immediate',provider:'mercadopago',plan:target.code})
 }catch(e){const message=e instanceof MercadoPagoError?e.message:e instanceof Error?e.message:'Erro inesperado ao alterar a assinatura.';return response({error:message},e instanceof MercadoPagoError?e.status:500)}
})
