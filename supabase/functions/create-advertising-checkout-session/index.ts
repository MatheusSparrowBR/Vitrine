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
  const{data:{user},error:authError}=await db.auth.getUser(token);if(authError||!user)return response({error:'Sessão inválida.'},401)
  const body=await req.json().catch(()=>({})),requestId=String(body.request_id||'');if(!requestId)return response({error:'request_id é obrigatório.'},400)
  const{data:request,error:requestError}=await db.from('advertising_requests').select('id,business_id,title,description,target_url,desired_start_at,desired_end_at,final_price,payment_status,creative_mode,artwork_path,artwork_url').eq('id',requestId).maybeSingle();if(requestError||!request)return response({error:'Solicitação não encontrada.'},404)
  const{data:business,error:businessError}=await db.from('businesses').select('id,name,owner_id').eq('id',request.business_id).maybeSingle();if(businessError)return response({error:'Não foi possível validar a empresa.'},500);if(!business||business.owner_id!==user.id)return response({error:'A solicitação não pertence ao usuário autenticado.'},403)
  const{data:featurePlan}=await db.rpc('get_effective_plan_id',{p_business_id:request.business_id});if(!featurePlan)return response({error:'A empresa não possui um plano elegível.'},403)
  const{data:plan}=await db.from('plans').select('features').eq('id',featurePlan).maybeSingle();if(plan?.features?.premium_ads!==true)return response({error:'Publicidade Premium está disponível apenas para o plano Premium.'},403)
  if(request.payment_status!=='awaiting_payment'||Number(request.final_price||0)<=0)return response({error:'Esta solicitação ainda não está liberada para pagamento.'},409)
  if(request.creative_mode==='self'&&(!request.artwork_path||!request.artwork_url))return response({error:'Envie a arte do banner antes de pagar.'},409)
  const origin=siteUrl(),amount=Number(request.final_price);if(!Number.isFinite(amount)||amount<=0)return response({error:'Valor da campanha inválido.'},409)
  const start=request.desired_start_at?new Date(request.desired_start_at):null,end=request.desired_end_at?new Date(request.desired_end_at):null;if(start&&Number.isNaN(start.getTime()))return response({error:'Data inicial inválida.'},409);if(end&&Number.isNaN(end.getTime()))return response({error:'Data final inválida.'},409);if(end&&end<=new Date())return response({error:'A data final da campanha já passou.'},409);if(start&&end&&end<=start)return response({error:'A data final da campanha precisa ser posterior à inicial.'},409)
  const subscription=await mpRequest('/preapproval',{method:'POST',body:JSON.stringify({reason:`Publicidade Premium · ${request.title}`,external_reference:`VL-AD-${request.id}`,payer_email:user.email||undefined,auto_recurring:{frequency:1,frequency_type:'months',transaction_amount:amount,currency_id:'BRL',...(end?{end_date:end.toISOString()}:{})},back_url:`${origin}/conta/publicidade?business_id=${encodeURIComponent(request.business_id)}&payment=success&provider=mercadopago`,status:'pending'})})
  const{error:saveError}=await db.from('advertising_requests').update({payment_provider:'mercadopago',mercadopago_subscription_id:String(subscription.id),payment_status:'awaiting_payment'}).eq('id',request.id);if(saveError){try{await mpRequest(`/preapproval/${encodeURIComponent(String(subscription.id))}`,{method:'PUT',body:JSON.stringify({status:'cancelled'})})}catch{};return response({error:'Assinatura criada no Mercado Pago, mas não foi possível registrar a solicitação.'},500)}
  return response({url:subscription.init_point,id:subscription.id,provider:'mercadopago'})
 }catch(e){const message=e instanceof MercadoPagoError?e.message:e instanceof Error?e.message:'Erro inesperado ao iniciar a cobrança.';return response({error:message},e instanceof MercadoPagoError?e.status:500)}
})
