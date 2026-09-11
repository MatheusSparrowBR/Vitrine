import Stripe from 'npm:stripe'
import { createClient } from 'npm:@supabase/supabase-js@2'
const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')||'')
const admin=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||'')
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
const res=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,'Content-Type':'application/json'}})
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 if(req.method!=='POST')return res({error:'Method not allowed'},405)
 if(!Deno.env.get('STRIPE_SECRET_KEY'))return res({error:'Stripe não configurado no Supabase.'},500)
 const siteUrl=(Deno.env.get('SITE_URL')||'').replace(/\/+$/,'');if(!siteUrl)return res({error:'SITE_URL não configurada.'},500)
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return res({error:'Não autenticado.'},401)
 const{data:{user},error}=await admin.auth.getUser(token);if(error||!user)return res({error:'Sessão inválida.'},401)
 const body=await req.json().catch(()=>({})),businessId=String(body.business_id||''),returnTo=body.return_to==='account'?'account':'plans'
 if(!businessId)return res({error:'Empresa obrigatória.'},400)
 const{data:business}=await admin.from('businesses').select('id,owner_id').eq('id',businessId).eq('owner_id',user.id).maybeSingle();if(!business)return res({error:'Empresa não encontrada ou sem permissão.'},403)
 const{data:sub,error:subError}=await admin.from('subscriptions').select('provider_customer_id,external_customer_id,provider_subscription_id,status').eq('user_id',user.id).eq('business_id',businessId).eq('provider','stripe').in('status',['active','trialing','past_due','unpaid','paused']).order('created_at',{ascending:false}).limit(1).maybeSingle()
 if(subError)return res({error:'Não foi possível localizar a assinatura.'},500)
 const customer=sub?.provider_customer_id||sub?.external_customer_id;if(!customer)return res({error:'Nenhuma assinatura Stripe encontrada para esta empresa.'},404)
 const returnUrl=returnTo==='account'?`${siteUrl}/conta?business_id=${encodeURIComponent(businessId)}`:`${siteUrl}/planos?business_id=${encodeURIComponent(businessId)}`
 const session=await stripe.billingPortal.sessions.create({customer,return_url:returnUrl})
 return res({url:session.url})
})
