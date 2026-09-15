import React,{useEffect,useMemo,useState}from'react'
import{createClient}from'@supabase/supabase-js'
import'./billing-plans.css'

const U=import.meta.env.VITE_SUPABASE_URL
const K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=U&&K?createClient(U,K):null
const FALLBACK=[
 {id:'free',code:'free',name:'Grátis',price_monthly:0,price_yearly:0,description:'Presença básica e recursos essenciais para começar no VitrineLocal.',features:{photos:5,items:10,promotions:1}},
 {id:'pro',code:'pro',name:'Pro',price_monthly:29.9,price_yearly:299,description:'Mais destaque e recursos para crescer com sua empresa.',features:{photos:30,items:50,promotions:5,analytics:true,featured:true,verified:true}},
 {id:'premium',code:'premium',name:'Premium',price_monthly:59.9,price_yearly:599,description:'Máxima presença, reputação avançada e recursos exclusivos, incluindo resposta às avaliações e estatísticas avançadas.',features:{photos:100,items:200,promotions:20,analytics:true,featured:true,verified:true,city_instagram:true,advanced_analytics:true,review_management:true}}
]
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const label=(k,n)=>({photos:`Até ${n} fotos/mídias`,items:`Até ${n} produtos/serviços`,promotions:`Até ${n} promoções`,analytics:'Analytics comercial',featured:'Destaque nas buscas',verified:'Selo de verificação',city_instagram:'Presença no Instagram da cidade',advanced_analytics:'Estatísticas avançadas',review_management:'Reputação + respostas às avaliações'})[k]||k
function featureList(f={}){return['photos','items','promotions','analytics','featured','verified','advanced_analytics','city_instagram','review_management'].map(k=>['photos','items','promotions'].includes(k)?Number(f[`${k}_limit`]??f[k])>0?label(k,Number(f[`${k}_limit`]??f[k])):null:f[k]===true?label(k):null).filter(Boolean).slice(0,10)}

export default function BillingPlansPage(){
 const[plans,setPlans]=useState(FALLBACK),[session,setSession]=useState(null),[businesses,setBusinesses]=useState([]),[businessId,setBusinessId]=useState(''),[current,setCurrent]=useState(null),[interval,setIntervalValue]=useState('monthly'),[msg,setMsg]=useState(''),[loading,setLoading]=useState(true),[checkoutLoading,setCheckoutLoading]=useState('')
 const params=useMemo(()=>new URLSearchParams(location.search),[])
 async function loadCurrent(uid,bid){
  if(!db||!uid||!bid){setCurrent(null);return}
  const{data,error}=await db.from('subscriptions').select('id,business_id,status,plan_id,started_at,ends_at,scheduled_plan_id,scheduled_change_at,provider,billing_interval,provider_checkout_url').eq('user_id',uid).eq('business_id',bid).in('status',['active','trialing','pending','paused']).order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(error){setMsg(error.message||'Não foi possível verificar o plano atual.');return}
  setCurrent(data||null)
 }
 useEffect(()=>{let live=true;(async()=>{if(!db){setLoading(false);return}const requested=params.get('business_id')||'';const[{data:{session:s}},{data:p,error:pe}]=await Promise.all([db.auth.getSession(),db.from('plans').select('id,code,name,price_monthly,price_yearly,description,features').eq('active',true).order('sort_order')]);if(!live)return;setSession(s||null);if(!pe&&p?.length)setPlans(p);if(!s){setLoading(false);return}const{data:b,error:be}=await db.from('businesses').select('id,name,status').eq('owner_id',s.user.id).order('created_at',{ascending:false});if(be)setMsg(be.message||'Não foi possível carregar suas empresas.');setBusinesses(b||[]);const chosen=(b||[]).find(x=>x.id===requested)||(b||[])[0];setBusinessId(chosen?.id||'');if(chosen?.id)await loadCurrent(s.user.id,chosen.id);setLoading(false)})();return()=>{live=false}},[])
 useEffect(()=>{if(session?.user?.id&&businessId)loadCurrent(session.user.id,businessId)},[session?.user?.id,businessId])
 const annualSaving=useMemo(()=>plans.reduce((a,p)=>{const full=Number(p.price_monthly||0)*12,y=Number(p.price_yearly||0);a[p.code]=full>0&&y>0?Math.max(0,Math.round((1-y/full)*100)):0;return a},{}),[plans])
 const currentCode=current?.plan_id?(plans.find(p=>p.id===current.plan_id)?.code||'free'):'free'
 const currentPlan=plans.find(p=>p.code===currentCode)||plans[0]
 if(loading)return <div className="vl-plans-app"><main className="page section"><div className="plan-message">Carregando planos…</div></main></div>
 const selectPlan=async code=>{
  if(code==='free')return
  if(code===currentCode&&current?.status!=='pending'){setMsg('Este já é o plano atual da empresa.');return}
  if(!db||!session?.user?.id||!businessId){setMsg('Entre na sua conta e selecione uma empresa para contratar um plano.');return}
  setCheckoutLoading(code);setMsg('Preparando o checkout seguro do Mercado Pago…')
  const{data,error}=await db.functions.invoke('mercadopago-authorize-subscription',{body:{business_id:businessId,plan_code:code,interval}})
  if(error||!data?.checkout_url){setCheckoutLoading('');setMsg(data?.error||error?.message||'Não foi possível iniciar o checkout do Mercado Pago.');return}
  window.location.href=data.checkout_url
 }
 const paymentReturn=params.get('checkout')==='return'
 const currentStatusLabel=current?.status==='pending'?'Pagamento pendente':current?.status==='paused'?'Assinatura pausada':current?.status==='active'?'Assinatura ativa':'Plano atual'
 return <div className="vl-plans-app"><main className="page section">
  <div className="plans-heading"><div className="plans-back"><a className="back-link" href={businessId?`/conta?business_id=${encodeURIComponent(businessId)}`:'/laguna'}>← {businessId?'Voltar para minha conta':'Voltar para Laguna'}</a></div><span className="section-kicker">PLANOS</span><h1>Escolha o plano ideal para o seu negócio</h1><p>Assinaturas mensais e anuais com cobrança recorrente pelo Mercado Pago.</p></div>
  {paymentReturn&&<div className="plan-message info">Estamos sincronizando o status da sua assinatura. O acesso pago só é liberado após a confirmação do Mercado Pago.</div>}
  {businesses.length>0&&<div className="billing-bar"><label>Empresa<select value={businessId} onChange={e=>setBusinessId(e.target.value)}>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}{b.status==='pending'?' · em análise':''}</option>)}</select></label><div className="billing-toggle"><button type="button" className={interval==='monthly'?'active':''} onClick={()=>setIntervalValue('monthly')}>Mensal</button><button type="button" className={interval==='yearly'?'active':''} onClick={()=>setIntervalValue('yearly')}>Anual</button></div></div>}
  {current&&<div className="billing-current"><div><span>ASSINATURA ATUAL</span><strong>{currentPlan?.name||'Plano ativo'}</strong><small>{current.provider==='mercadopago'?'Cobrança e status gerenciados pelo Mercado Pago.':'Gerenciado pela administração da plataforma.'}</small></div><div><b>{currentStatusLabel}</b><span>{current.ends_at?'Válido até '+new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeZone:'America/Sao_Paulo'}).format(new Date(current.ends_at)):current.provider_checkout_url&&current.status==='pending'?'Finalize o cadastro de pagamento para ativar o plano.':'Vigente conforme o status da assinatura.'}</span></div></div>}
  {msg&&<div className="plan-message info">{msg}</div>}
  <div className="plans-grid">{plans.map(p=>{const price=interval==='yearly'?p.price_yearly:p.price_monthly,isCurrent=currentCode===p.code&&current?.status!=='canceled',features=featureList(p.features),paid=p.code!=='free',busy=checkoutLoading===p.code;return <article className={`plan-card ${p.code==='premium'?'featured':''} ${isCurrent?'current':''}`} key={p.id}><span className="section-kicker">{p.code==='premium'?'MAIS COMPLETO':p.code==='pro'?'RECOMENDADO':'COMECE AQUI'}</span><h2>{p.name}</h2><p>{p.description}</p><div className="plan-price">{money(price)}<small>/{interval==='yearly'?'ano':'mês'}</small></div>{interval==='yearly'&&annualSaving[p.code]>0&&<span className="billing-saving">Economize {annualSaving[p.code]}%</span>}<ul>{features.map(item=><li key={item}>{item}</li>)}</ul><button type="button" className={isCurrent?'outline':'primary'} disabled={isCurrent||busy} onClick={()=>paid&&selectPlan(p.code)}>{isCurrent?(current?.status==='pending'?'Pagamento em andamento':'Plano atual'):busy?'Abrindo checkout…':paid?'Assinar com Mercado Pago':'Começar grátis'}</button></article>})}</div>
  {session&&businessId&&<div className="billing-after-grid"><div><strong>Gestão de assinatura</strong><span>O VitrineLocal confirma os eventos do Mercado Pago antes de liberar ou suspender os recursos pagos.</span></div><a href={`/conta?business_id=${encodeURIComponent(businessId)}`}>Abrir minha conta →</a><a href={`/conta/analytics?business_id=${encodeURIComponent(businessId)}`}>Ver desempenho →</a></div>}
 </main></div>
}
