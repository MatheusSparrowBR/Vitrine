import React,{useEffect,useMemo,useState}from'react'
import{createClient}from'@supabase/supabase-js'
import'./billing-plans.css'

const U=import.meta.env.VITE_SUPABASE_URL
const K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=U&&K?createClient(U,K):null
const FALLBACK=[
 {id:'free',code:'free',name:'Grátis',price_monthly:0,price_yearly:0,description:'Presença básica e recursos essenciais.',features:{photos:5,items:10,promotions:1,ai_posts:3}},
 {id:'pro',code:'pro',name:'Pro',price_monthly:29.9,price_yearly:299,description:'Mais destaque e recursos para crescer.',features:{photos:30,items:50,promotions:5,ai_posts:30,analytics:true,featured:true,verified:true}},
 {id:'premium',code:'premium',name:'Premium',price_monthly:59.9,price_yearly:599,description:'Máxima presença e recursos avançados.',features:{photos:100,items:200,promotions:20,ai_posts:100,analytics:true,featured:true,verified:true,city_instagram:true,advanced_analytics:true}}
]
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const label=(k,n)=>({photos:`Até ${n} fotos/mídias`,items:`Até ${n} produtos/serviços`,promotions:`Até ${n} promoções`,ai_posts:`${n} usos de IA por mês`,analytics:'Analytics completo',featured:'Destaque nas buscas',verified:'Selo de verificação',city_instagram:'Presença no Instagram da cidade',advanced_analytics:'Estatísticas avançadas'})[k]||k
function featureList(f={}){return['photos','items','promotions','ai_posts','analytics','featured','verified','advanced_analytics','city_instagram'].map(k=>['photos','items','promotions','ai_posts'].includes(k)?Number(f[`${k}_limit`]??f[k])>0?label(k,Number(f[`${k}_limit`]??f[k])):null:f[k]===true?label(k):null).filter(Boolean).slice(0,9)}

export default function BillingPlansPage(){
 const[plans,setPlans]=useState(FALLBACK),[session,setSession]=useState(null),[businesses,setBusinesses]=useState([]),[businessId,setBusinessId]=useState(''),[current,setCurrent]=useState(null),[interval,setIntervalValue]=useState('monthly'),[msg,setMsg]=useState(''),[loading,setLoading]=useState(true)
 const params=useMemo(()=>new URLSearchParams(location.search),[])
 async function loadCurrent(uid,bid){
  if(!db||!uid||!bid){setCurrent(null);return}
  const{data,error}=await db.from('subscriptions').select('id,business_id,status,plan_id,started_at,ends_at,scheduled_plan_id,scheduled_change_at').eq('user_id',uid).eq('business_id',bid).in('status',['active','trialing','pending']).order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(error){setMsg(error.message||'Não foi possível verificar o plano atual.');return}
  setCurrent(data||null)
 }
 useEffect(()=>{let live=true;(async()=>{if(!db){setLoading(false);return}const requested=params.get('business_id')||'';const[{data:{session:s}},{data:p,error:pe}]=await Promise.all([db.auth.getSession(),db.from('plans').select('id,code,name,price_monthly,price_yearly,description,features').eq('active',true).order('sort_order')]);if(!live)return;setSession(s||null);if(!pe&&p?.length)setPlans(p);if(!s){setLoading(false);return}const{data:b,error:be}=await db.from('businesses').select('id,name,status').eq('owner_id',s.user.id).order('created_at',{ascending:false});if(be)setMsg(be.message||'Não foi possível carregar suas empresas.');setBusinesses(b||[]);const chosen=(b||[]).find(x=>x.id===requested)||(b||[])[0];setBusinessId(chosen?.id||'');if(chosen?.id)await loadCurrent(s.user.id,chosen.id);setLoading(false)})();return()=>{live=false}},[])
 useEffect(()=>{if(session?.user?.id&&businessId)loadCurrent(session.user.id,businessId)},[session?.user?.id,businessId])
 const annualSaving=useMemo(()=>plans.reduce((a,p)=>{const full=Number(p.price_monthly||0)*12,y=Number(p.price_yearly||0);a[p.code]=full>0&&y>0?Math.max(0,Math.round((1-y/full)*100)):0;return a},{}),[plans])
 const currentCode=current?.plan_id?(plans.find(p=>p.id===current.plan_id)?.code||'free'):'free'
 const currentPlan=plans.find(p=>p.code===currentCode)||plans[0]
 if(loading)return <div className="vl-plans-app"><main className="page section"><div className="plan-message">Carregando planos…</div></main></div>
 const selectPlan=code=>{if(code===currentCode){setMsg('Este já é o plano atual da empresa.');return}setMsg('Os planos pagos estão temporariamente indisponíveis. A contratação será liberada quando o módulo de pagamentos for configurado novamente.')}
 return <div className="vl-plans-app"><main className="page section">
  <div className="plans-heading"><div className="plans-back"><a className="back-link" href={businessId?`/conta?business_id=${encodeURIComponent(businessId)}`:'/laguna'}>← {businessId?'Voltar para minha conta':'Voltar para Laguna'}</a></div><span className="section-kicker">PLANOS</span><h1>Escolha o plano ideal para o seu negócio</h1><p>Os planos e limites continuam disponíveis. A contratação de planos pagos será configurada posteriormente.</p></div>
  {businesses.length>0&&<div className="billing-bar"><label>Empresa<select value={businessId} onChange={e=>setBusinessId(e.target.value)}>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}{b.status==='pending'?' · em análise':''}</option>)}</select></label><div className="billing-toggle"><button type="button" className={interval==='monthly'?'active':''} onClick={()=>setIntervalValue('monthly')}>Mensal</button><button type="button" className={interval==='yearly'?'active':''} onClick={()=>setIntervalValue('yearly')}>Anual</button></div></div>}
  {current&&<div className="billing-current"><div><span>PLANO ATUAL</span><strong>{currentPlan?.name||'Plano ativo'}</strong><small>Gerenciado pela administração da plataforma</small></div><div><b>Sem cobrança online configurada</b><span>{current.ends_at?'Válido até '+new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeZone:'America/Sao_Paulo'}).format(new Date(current.ends_at)):'Vigente conforme a atribuição administrativa'}</span></div></div>}
  {msg&&<div className="plan-message info">{msg}</div>}
  <div className="plans-grid">{plans.map(p=>{const price=interval==='yearly'?p.price_yearly:p.price_monthly,isCurrent=currentCode===p.code,features=featureList(p.features),paid=p.code!=='free';return <article className={`plan-card ${p.code==='premium'?'featured':''} ${isCurrent?'current':''}`} key={p.id}><span className="section-kicker">{p.code==='premium'?'MAIS COMPLETO':p.code==='pro'?'RECOMENDADO':'COMECE AQUI'}</span><h2>{p.name}</h2><p>{p.description}</p><div className="plan-price">{money(price)}<small>/{interval==='yearly'?'ano':'mês'}</small></div>{interval==='yearly'&&annualSaving[p.code]>0&&<span className="billing-saving">Economize {annualSaving[p.code]}%</span>}<ul>{features.map(item=><li key={item}>{item}</li>)}</ul><button type="button" className={isCurrent?'outline':'primary'} disabled={isCurrent} onClick={()=>paid&&selectPlan(p.code)}>{isCurrent?'Plano atual':paid?'Disponível em breve':'Começar grátis'}</button></article>})}</div>
  {session&&businessId&&<div className="billing-after-grid"><div><strong>Gestão de planos</strong><span>Os limites, recursos e atribuições administrativas continuam funcionando normalmente.</span></div><a href={`/conta?business_id=${encodeURIComponent(businessId)}`}>Abrir minha conta →</a><a href={`/conta/analytics?business_id=${encodeURIComponent(businessId)}`}>Ver desempenho →</a></div>}
 </main></div>
}
