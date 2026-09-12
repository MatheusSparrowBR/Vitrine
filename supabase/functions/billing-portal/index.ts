import {createClient} from 'npm:@supabase/supabase-js@2'
import {mpRequest,MercadoPagoError,siteUrl} from '../_shared/mercadopago.ts'
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
function admin(){const url=Deno.env.get('SUPABASE_URL')||'',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||'';if(!url||!key)throw new Error('Supabase administrativo não configurado.');return createClient(url,key)}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 if(req.method!=='POST')return response({error:'Method not allowed'},405)
 try{
  const db=admin(),token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return response({error:'Não autenticado.'},401)
  const {data:{user},error:authError}=await db.auth.getUser(token);if(authError||!user)return response({error:'Sessão inválida.'},401)
  const body=await req.json().catch(()=>({})),businessId=String(body.business_id||''),returnTo=body.return_to==='account'?'account':'plans'
  if(!businessId)return response({error:'Empresa obrigatória.'},400)
  const{data:business,error:businessError}=await db.from('businesses').select('id,owner_id').eq('id',businessId).eq('owner_id',user.id).maybeSingle();if(businessError)return response({error:'Não foi possível validar a empresa.'},500);if(!business)return response({error:'Empresa não encontrada ou sem permissão.'},403)
  const{data:sub,error:subError}=await db.from('subscriptions').select('provider_subscription_id,status').eq('user_id',user.id).eq('business_id',businessId).eq('provider','mercadopago').in('status',['active','trialing','past_due','unpaid','paused','incomplete']).order('created_at',{ascending:false}).limit(1).maybeSingle();if(subError)return response({error:'Não foi possível localizar a assinatura.'},500);if(!sub?.provider_subscription_id)return response({error:'Nenhuma assinatura Mercado Pago encontrada para esta empresa.'},404)
  const remote=await mpRequest(`/preapproval/${encodeURIComponent(sub.provider_subscription_id)}`)
  if(!remote?.id)return response({error:'O Mercado Pago não retornou a assinatura solicitada.'},502)
  const origin=siteUrl(),returnUrl=returnTo==='account'?`${origin}/conta?business_id=${encodeURIComponent(businessId)}`:`${origin}/planos?business_id=${encodeURIComponent(businessId)}`
  return response({url:remote.init_point||returnUrl,provider:'mercadopago'})
 }catch(e){const message=e instanceof MercadoPagoError?e.message:e instanceof Error?e.message:'Erro inesperado ao abrir a gestão da assinatura.';return response({error:message},e instanceof MercadoPagoError?e.status:500)}
})
