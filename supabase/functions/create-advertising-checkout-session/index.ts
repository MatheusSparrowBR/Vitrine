import Stripe from 'npm:stripe'
import { createClient } from 'npm:@supabase/supabase-js@2'
const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')||'')
const supabaseUrl=Deno.env.get('SUPABASE_URL')||''
const publishableKey=Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||Deno.env.get('SUPABASE_ANON_KEY')||''
const adminKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||''
const db=createClient(supabaseUrl,publishableKey),admin=createClient(supabaseUrl,adminKey)
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}})
Deno.serve(async req=>{
 if(req.method!=='POST')return json({error:'Method not allowed'},405)
 if(!adminKey||!Deno.env.get('STRIPE_SECRET_KEY'))return json({error:'Checkout de publicidade não configurado.'},500)
 const auth=req.headers.get('Authorization')||''
 const{data:{user},error:authError}=await db.auth.getUser(auth.replace(/^Bearer\s+/i,''))
 if(authError||!user)return json({error:'Não autenticado.'},401)
 let body:any;try{body=await req.json()}catch{return json({error:'JSON inválido.'},400)}
 const requestId=String(body?.request_id||'');if(!requestId)return json({error:'request_id é obrigatório.'},400)
 const{data:request,error:requestError}=await admin.from('advertising_requests').select('id,business_id,title,description,target_url,desired_start_at,desired_end_at,final_price,payment_status,creative_mode,artwork_path,artwork_url').eq('id',requestId).maybeSingle()
 if(requestError||!request)return json({error:'Solicitação não encontrada.'},404)
 const{data:business}=await admin.from('businesses').select('id,name,owner_id').eq('id',request.business_id).maybeSingle()
 if(!business||business.owner_id!==user.id)return json({error:'A solicitação não pertence ao usuário autenticado.'},403)
 const{data:featurePlan}=await admin.rpc('get_effective_plan_id',{p_business_id:request.business_id})
 if(!featurePlan)return json({error:'A empresa não possui um plano elegível.'},403)
 const{data:plan}=await admin.from('plans').select('features').eq('id',featurePlan).maybeSingle()
 if(plan?.features?.premium_ads!==true)return json({error:'Publicidade Premium está disponível apenas para o plano Premium.'},403)
 if(request.payment_status!=='awaiting_payment'||Number(request.final_price||0)<=0)return json({error:'Esta solicitação ainda não está liberada para pagamento.'},409)
 if(request.creative_mode==='self'&&(!request.artwork_path||!request.artwork_url))return json({error:'Envie a arte do banner antes de pagar.'},409)
 const siteUrl=Deno.env.get('SITE_URL')||'';let origin:URL
 try{origin=new URL(siteUrl);if(!/^https?:$/.test(origin.protocol))throw new Error()}catch{return json({error:'SITE_URL não configurado corretamente.'},500)}
 const amount=Math.round(Number(request.final_price)*100);if(!Number.isSafeInteger(amount)||amount<100)return json({error:'Valor da campanha inválido.'},409)
 const successUrl=new URL(`/conta/publicidade?business_id=${encodeURIComponent(request.business_id)}&payment=success`,origin).toString()
 const cancelUrl=new URL(`/conta/publicidade?business_id=${encodeURIComponent(request.business_id)}&payment=cancelled`,origin).toString()
 const cancelAt=request.desired_end_at?Math.floor(new Date(request.desired_end_at).getTime()/1000):undefined
 if(cancelAt&&(!Number.isFinite(cancelAt)||cancelAt<=Math.floor(Date.now()/1000)))return json({error:'A data final da campanha já passou.'},409)
 const session=await stripe.checkout.sessions.create({mode:'subscription',line_items:[{price_data:{currency:'brl',unit_amount:amount,recurring:{interval:'month'},product_data:{name:`Publicidade Premium · ${request.title}`,description:`VitrineLocal · ${business.name}`}},quantity:1}],success_url:successUrl,cancel_url:cancelUrl,customer_creation:'always',client_reference_id:request.id,metadata:{flow:'premium_advertising',request_id:request.id,business_id:request.business_id,user_id:user.id},subscription_data:{metadata:{flow:'premium_advertising',request_id:request.id,business_id:request.business_id,user_id:user.id},...(cancelAt?{cancel_at:cancelAt}:{})}})
 const{error:saveError}=await admin.from('advertising_requests').update({stripe_checkout_session_id:session.id,payment_status:'awaiting_payment'}).eq('id',request.id)
 if(saveError)return json({error:'Checkout criado, mas não foi possível registrar a sessão.'},500)
 return json({url:session.url})
})
