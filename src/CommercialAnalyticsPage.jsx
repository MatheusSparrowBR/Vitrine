import React,{useEffect,useState}from'react'
import{supabase as db}from'./supabase-client.js'
import{hasPlanFeature}from'./phase2-rules.js'
import{chooseBusiness,getRequestedBusinessId,persistBusinessId}from'./business-selection.js'
import'./commercial-analytics.css'

const fmt=v=>Number(v||0).toLocaleString('pt-BR')
const pct=(v,d)=>d?((v/d)*100).toFixed(1):'0.0'
const deltaLabel=(current,previous)=>{
 const p=Number(previous||0),c=Number(current||0)
 if(!p)return null
 const d=((c-p)/p)*100
 return (d>0?'+':'')+d.toFixed(1)+'%'
}
const deltaClass=(current,previous)=>{
 const d=Number(current||0)-Number(previous||0)
 return d>0?'positive':d<0?'negative':'neutral'
}
const dateTime=v=>v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeZone:'America/Sao_Paulo'}).format(new Date(v)):'—'

export default function CommercialAnalyticsPage(){
 const[s,setS]=useState({loading:true,session:null,businesses:[],businessId:'',plan:null,summary:null,advanced:null,advancedError:'',ads:[],requests:[],adsError:'',error:''})
 const[range,setRange]=useState(30)

 useEffect(()=>{let live=true;(async()=>{
  if(!db){setS(x=>({...x,loading:false}));return}
  const{data:{session}}=await db.auth.getSession()
  if(!live)return
  if(!session){setS(x=>({...x,loading:false}));return}
  const{data:businesses,error}=await db.from('businesses').select('id,name,status').eq('owner_id',session.user.id).order('created_at',{ascending:false})
  if(!live)return
  if(error){setS(x=>({...x,loading:false,session,businesses:[],businessId:'',plan:null,summary:null,advanced:null,error:error.message}));return}
  const selected=chooseBusiness(businesses,getRequestedBusinessId())
  persistBusinessId(selected?.id)
  setS(x=>({...x,loading:false,session,businesses:businesses||[],businessId:selected?.id||'',error:'',advanced:null,advancedError:'',ads:[],requests:[],adsError:''}))
 })();return()=>{live=false}},[])

 useEffect(()=>{let live=true;(async()=>{
  if(!db||!s.session||!s.businessId)return
  setS(x=>({...x,plan:null,summary:null,advanced:null,advancedError:'',ads:[],requests:[],adsError:'',error:''}))
  const[{data:planId,error:pe},{data:biz,error:be}]=await Promise.all([
   db.rpc('get_effective_plan_id',{p_business_id:s.businessId}),
   db.from('businesses').select('id,name,status').eq('id',s.businessId).eq('owner_id',s.session.user.id).maybeSingle()
  ])
  if(!live)return
  if(pe||be||!biz){setS(x=>({...x,error:(pe||be)?.message||'Não foi possível validar a empresa.'}));return}
  const{data:plan,error:ple}=await db.from('plans').select('id,code,name,features').eq('id',planId).maybeSingle()
  if(!live)return
  if(ple||!plan){setS(x=>({...x,error:ple?.message||'Plano não encontrado.'}));return}
  if(!hasPlanFeature(plan.features,'analytics',false)){setS(x=>({...x,plan,biz,error:''}));return}
  const advancedEnabled=hasPlanFeature(plan.features,'advanced_analytics',false)
  const[{data:summary,error:se},{data:advanced,error:ae},{data:ads,error:ade},{data:requests,error:re}]=await Promise.all([
   db.rpc('get_business_analytics_summary',{p_business_id:s.businessId,p_days:range}),
   advancedEnabled?db.rpc('get_business_advanced_analytics',{p_business_id:s.businessId,p_days:range}):Promise.resolve({data:null,error:null}),
   db.from('advertisements').select('id,title,active,starts_at,ends_at,monthly_price,billing_status,image_url,created_at').eq('business_id',s.businessId).eq('placement','home_banner').order('created_at',{ascending:false}),
   db.from('advertising_requests').select('id,title,status,desired_start_at,desired_end_at,final_price,admin_note,created_at').eq('business_id',s.businessId).eq('requested_placement','home_banner').order('created_at',{ascending:false}).limit(5)
  ])
  if(!live)return
  if(se){setS(x=>({...x,plan,biz,error:se.message||'Não foi possível carregar as métricas.'}));return}
  if(ade||re){setS(x=>({...x,plan,biz,summary:summary?.[0]||null,advanced:advanced?.[0]||null,advancedError:advancedEnabled?(ae?.message||''):'',ads:ads||[],requests:requests||[],adsError:(ade||re)?.message||'Não foi possível carregar os dados de publicidade.',error:''}));return}
  setS(x=>({...x,plan,biz,summary:summary?.[0]||null,advanced:advanced?.[0]||null,advancedError:advancedEnabled?(ae?.message||''):'',ads:ads||[],requests:requests||[],error:''}))
 })();return()=>{live=false}},[s.session?.user?.id,s.businessId,range])

 const m=s.summary||{},a=s.advanced||{}
 const leadCount=Number(m.whatsapp_clicks||0)+Number(m.instagram_clicks||0)+Number(m.website_clicks||0)
 const conversion=m.profile_views?((leadCount/m.profile_views)*100).toFixed(1):'0.0'
 const previous=Number(m.previous_profile_views||0)
 const currentViews=Number(m.profile_views||0)
 const delta=deltaLabel(currentViews,previous)
 const uniqueVisitors=Number(a.unique_visitors||0)
 const previousUniqueVisitors=Number(a.previous_unique_visitors||0)
 const uniqueVisitorsDelta=deltaLabel(uniqueVisitors,previousUniqueVisitors)
 const engagedInteractions=Number(a.engaged_interactions||0)
 const actionsPerVisitor=uniqueVisitors?(engagedInteractions/uniqueVisitors).toFixed(1):'0.0'
 const additionalViews=Math.max(0,Number(a.profile_views||0)-uniqueVisitors)
 const daily=Array.isArray(a.daily)?a.daily:[]
 const maxDaily=Math.max(1,...daily.map(x=>Number(x?.profile_views||0)))
 const channelEntries=[['WhatsApp',a.channels?.whatsapp||0],['Instagram',a.channels?.instagram||0],['Site',a.channels?.website||0]]
 const activeAds=s.ads.filter(x=>x.active&&(!x.starts_at||new Date(x.starts_at)<=new Date())&&(!x.ends_at||new Date(x.ends_at)>new Date()))
 const hasCampaignHistory=s.ads.length>0
 const latestAd=s.ads[0]||null
 const pendingRequests=s.requests.filter(x=>x.status==='pending')
 const advancedEnabled=hasPlanFeature(s.plan?.features,'advanced_analytics',false)

 if(s.loading)return <div className="commercial-analytics-page"><div className="ca-empty">Carregando desempenho comercial…</div></div>
 if(!s.session)return <div className="commercial-analytics-page"><div className="ca-empty"><h1>Acompanhe o desempenho da sua empresa</h1><a href="/login?next=%2Fconta%2Fanalytics">Entrar</a></div></div>
 if(!s.businesses.length)return <div className="commercial-analytics-page"><div className="ca-empty"><h1>Nenhuma empresa cadastrada</h1><a href="/conta?new=business">Cadastrar empresa</a></div></div>
 if(s.error)return <div className="commercial-analytics-page"><div className="ca-empty"><h1>Não foi possível carregar o desempenho</h1><p>{s.error}</p><a href="/conta">Voltar para minha conta</a></div></div>
 if(s.plan&&!hasPlanFeature(s.plan.features,'analytics',false))return <main className="commercial-analytics-page"><div className="ca-shell"><div className="ca-locked"><span>PLANO {s.plan.name?.toUpperCase()||'GRÁTIS'}</span><h1>Transforme visitas em oportunidades</h1><p>Veja quem encontrou sua empresa, quais canais geram contatos e como suas ações estão performando.</p><a href={'/planos?business_id='+encodeURIComponent(s.businessId)}>Fazer upgrade para Pro →</a></div></div></main>

 const business=s.businesses.find(x=>x.id===s.businessId)||s.businesses[0]
 const recommendation=currentViews===0
  ?{kind:'PRIMEIRO PASSO',title:'Comece a atrair visitas para sua empresa',text:'Seu perfil ainda não registrou visualizações no período. Complete a apresentação, adicione fotos e mantenha seus canais de contato visíveis.',action:'Melhorar minha empresa',href:'/conta'}
  :leadCount===0
  ?{kind:'ATENÇÃO',title:'Transforme visitas em contatos',text:'Seu perfil recebeu visitas, mas ainda não registrou contatos no período. Deixe o WhatsApp em destaque e ofereça um próximo passo claro.',action:'Ir para Minha empresa',href:'/conta'}
  :Number(m.promotion_clicks||0)===0
  ?{kind:'OPORTUNIDADE',title:'Crie sua primeira promoção',text:'Você já recebe interesse no perfil. Uma oferta relevante pode criar um motivo mais forte para o cliente agir.',action:'Criar promoção',href:'/conta'}
  :Number(m.gallery_opens||0)===0
  ?{kind:'OPORTUNIDADE',title:'Fortaleça sua vitrine visual',text:'Seu perfil tem tráfego, mas ainda não registra aberturas da galeria no período.',action:'Adicionar fotos',href:'/conta'}
  :{kind:'CONTINUE ASSIM',title:'Continue acompanhando seus resultados',text:'Seu perfil já está gerando interações. Use o desempenho para descobrir quais canais merecem mais atenção.',action:'Ver Minha conta',href:'/conta'}

 const funnel=[['Visualizações',currentViews,100],['Contatos',leadCount,Number(conversion)]]

 return <main className="commercial-analytics-page"><div className="ca-shell">
  <header className="ca-head">
   <div><span>DESEMPENHO COMERCIAL</span><h1>Desempenho da sua empresa</h1><p>{business?.name||'Empresa'} · veja o que aconteceu e o próximo passo recomendado.</p></div>
   <div className="ca-actions"><a href="/conta">← Minha conta</a><select value={s.businessId} onChange={e=>{persistBusinessId(e.target.value);setS(x=>({...x,businessId:e.target.value}))}} aria-label="Empresa analisada">{s.businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><select value={range} onChange={e=>setRange(Number(e.target.value))} aria-label="Período do desempenho"><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option></select></div>
  </header>

  <section className="ca-kpis">
   <Kpi title="Visualizações" value={fmt(m.profile_views)} note={range+' dias'} trend={delta} trendClass={deltaClass(currentViews,previous)}/>
   <Kpi title="Contatos" value={fmt(leadCount)} note="WhatsApp + Instagram + site" tone="green"/>
   <Kpi title="Taxa de contato" value={conversion+'%'} note="contatos ÷ visualizações" tone="purple"/>
   <Kpi title="Interações" value={fmt(m.total_interactions)} note="ações registradas" tone="amber"/>
  </section>

  <section className="ca-insight-card">
   <div className="ca-insight-icon">!</div><div><span>{recommendation.kind}</span><h2>{recommendation.title}</h2><p>{recommendation.text}</p></div><a href={recommendation.href}>{recommendation.action} →</a>
  </section>

  <section className="ca-card ca-summary-story">
   <div className="ca-card-head"><div><span>RESUMO DO PERÍODO</span><h2>O que aconteceu nos últimos {range} dias?</h2><p>Uma leitura simples dos principais sinais do seu perfil.</p></div></div>
   <div className="ca-story-grid"><div><strong>{fmt(m.profile_views)}</strong><span>visualizações no perfil</span></div><div><strong>{fmt(leadCount)}</strong><span>contatos gerados</span></div><div><strong>{fmt(m.gallery_opens)}</strong><span>aberturas da galeria</span></div><div><strong>{fmt(m.promotion_clicks)}</strong><span>cliques em promoções</span></div></div>
   <p className="ca-story-text">{leadCount>0?'Seu perfil está recebendo visitas e já gerou '+fmt(leadCount)+' contato(s). O foco agora é repetir as ações que geram mais interação.':'Seu perfil recebeu '+fmt(m.profile_views)+' visualizações, mas ainda não transformou essas visitas em contatos. Use o painel para ajustar a apresentação e criar um próximo passo claro.'}</p>
  </section>

  <section className="ca-card ca-trend-card">
   <div className="ca-card-head"><div><span>TENDÊNCIA</span><h2>Visualizações ao longo do período</h2><p>Veja como o interesse evoluiu dia a dia.</p></div><span className="ca-period-chip">{range} dias</span></div>
   <div className="ca-daily-chart ca-daily-chart-large" aria-label="Visualizações por dia">{daily.length?daily.map(row=><div className="ca-day-bar" key={row.day} title={String(row.day)+': '+fmt(row.profile_views)+' visualizações'}><i style={{height:Math.max(6,(Number(row.profile_views||0)/maxDaily)*100)+'%'}}/><small>{String(row.day||'').slice(8,10)}</small></div>):<div className="ca-chart-upgrade"><strong>Tendência diária</strong><span>O detalhamento por dia está disponível nas estatísticas avançadas do Premium.</span><a href={'/planos?business_id='+encodeURIComponent(s.businessId)}>Conhecer o Premium →</a></div>}</div>
   <p className="ca-caption">{delta?'Variação de '+delta+' em visualizações em relação ao período anterior.':'Ainda não há período anterior suficiente para comparar.'}</p>
  </section>

  <section className="ca-grid">
   <article className="ca-card">
    <div className="ca-card-head"><div><span>FUNIL</span><h2>De visita a contato</h2><p>Entenda onde o interesse acontece no seu perfil.</p></div></div>
    <div className="ca-funnel">{funnel.map(([label,value,ratio],index)=>{const width=index===0?100:Math.min(100,Math.max(3,Number(ratio||0)));return <div className="ca-funnel-row" key={label}><div><strong>{label}</strong><small>{fmt(value)}</small></div><div className="ca-track"><i style={{width:width+'%'}}/></div><b>{index===0?'100.0%':Number(ratio||0).toFixed(1)+'%'}</b></div>})}</div>
   </article>
   <article className="ca-card ca-channels-card">
    <div className="ca-card-head"><div><span>CANAIS DE CONTATO</span><h2>Canais que geraram contatos</h2><p>Veja quais ações de contato aconteceram no seu perfil.</p></div></div>
    <div className="ca-channel-list ca-channel-list-emphasis">{channelEntries.map(([label,value])=><div key={label}><div><strong>{label}</strong><span>{fmt(value)}</span></div><div className="ca-channel-track"><i style={{width:Math.max(4,pct(Number(value),leadCount))+'%'}}/></div></div>)}</div>
    <p className="ca-caption">Aqui medimos as ações realizadas no perfil. Isso não representa a origem externa do visitante.</p>
   </article>
  </section>

  <section className="ca-card">
   <div className="ca-card-head"><div><span>PUBLICIDADE</span><h2>Banner Premium</h2><p>{hasCampaignHistory?'Resultado de exposição patrocinada.':'Este recurso ainda não foi contratado.'}</p></div><strong className={'ca-ad-status '+(hasCampaignHistory?'contracted':'not-contracted')}>{hasCampaignHistory?'CONTRATADO':'NÃO CONTRATADO'}</strong></div>
   {s.adsError&&<p className="ca-inline-error">Os dados de publicidade não puderam ser atualizados agora. O restante do desempenho continua disponível.</p>}
   {hasCampaignHistory?<><div className="ca-ad-campaign"><div><span>{activeAds.length?'● Campanha ativa':'Última campanha'}</span><strong>{latestAd?.title||'Campanha Premium'}</strong><small>{activeAds.length?activeAds.length+' campanha(s) ativa(s)':latestAd?.ends_at?'Encerrada em '+dateTime(latestAd.ends_at):'Campanha registrada'}</small></div><a href={'/conta/publicidade?business_id='+encodeURIComponent(s.businessId)}>Gerenciar →</a></div><div className="ca-ad-metrics"><Metric label="Impressões" value={fmt(m.banner_impressions)}/><Metric label="Cliques" value={fmt(m.banner_clicks)}/><Metric label="CTR" value={pct(m.banner_clicks,m.banner_impressions)+'%'}/></div>{s.ads.length>1&&<div className="ca-ad-history">{s.ads.slice(0,3).map(ad=><div key={ad.id}><strong>{ad.title}</strong><span>{ad.active?'Ativa':'Encerrada'}{ad.starts_at?' · '+dateTime(ad.starts_at):''}</span></div>)}</div>}</>:<div className="ca-ad-not-contracted"><div><strong>Coloque sua empresa em destaque na Home</strong><p>Este espaço só passa a mostrar resultados quando sua empresa contratar o Banner Premium. Enquanto isso, não há dados de campanha para exibir.</p></div><a href={'/conta/publicidade?business_id='+encodeURIComponent(s.businessId)}>{pendingRequests.length?'Ver solicitação em análise':'Conhecer Banner Premium'} →</a></div>}
  </section>

  <section className="ca-card ca-advanced-card">
   <div className="ca-card-head"><div><span>ESTATÍSTICAS AVANÇADAS</span><h2>O que os dados avançados acrescentam</h2><p>Indicadores exclusivos para entender qualidade do tráfego e engajamento sem repetir os gráficos acima.</p></div><strong className="ca-premium-badge">PREMIUM</strong></div>
   {advancedEnabled?s.advanced?<><div className="ca-advanced-kpis"><Kpi title="Visitantes únicos" value={fmt(uniqueVisitors)} note="sessões únicas com visita ao perfil" trend={uniqueVisitorsDelta} trendClass={deltaClass(uniqueVisitors,previousUniqueVisitors)} /><Kpi title="Engajamentos" value={fmt(engagedInteractions)} note="interações qualificadas" tone="green"/><Kpi title="Ações por visitante" value={actionsPerVisitor} note="interações por visitante único" tone="purple"/><Kpi title="Visualizações adicionais" value={fmt(additionalViews)} note="estimativa; não identifica pessoas" tone="amber"/></div><p className="ca-advanced-note">Os dados avançados ajudam a entender profundidade de interação. “Visualizações adicionais” é a diferença entre visualizações e sessões únicas, não uma contagem de pessoas recorrentes.</p></>:<div className="ca-advanced-loading">Carregando estatísticas avançadas…</div>:<div className="ca-advanced-locked"><span>EXCLUSIVO DO PREMIUM</span><h3>Estatísticas avançadas</h3><p>O Premium libera visitantes únicos, engajamentos, ações por visitante e indicadores de profundidade de interação.</p><a href={'/planos?business_id='+encodeURIComponent(s.businessId)}>Conhecer o Premium →</a></div>}
   {s.advancedError&&<p className="ca-advanced-error">Não foi possível carregar as estatísticas avançadas agora. Os demais indicadores continuam disponíveis.</p>}
  </section>

  <section className="ca-card ca-opportunities-card">
   <div className="ca-card-head"><div><span>OPORTUNIDADES</span><h2>O que vale fazer agora</h2><p>Transforme os sinais do seu perfil em ações práticas.</p></div></div>
   <div className="ca-opportunities">
    <div><b>WhatsApp</b><strong>{fmt(m.whatsapp_clicks)}</strong><small>{m.whatsapp_clicks?'Seu canal de contato já está funcionando.':'Deixe o WhatsApp claro no perfil e convide o visitante a entrar em contato.'}</small><a href="/conta">Ajustar →</a></div>
    <div><b>Promoções</b><strong>{fmt(m.promotion_clicks)}</strong><small>{m.promotion_clicks?'Suas ofertas já estão recebendo interação.':'Crie uma oferta relevante para dar um próximo passo ao visitante.'}</small><a href="/conta">Criar promoção →</a></div>
    <div><b>Galeria</b><strong>{fmt(m.gallery_opens)}</strong><small>{m.gallery_opens?'Sua vitrine visual já está despertando interesse.':'Adicione fotos para mostrar melhor sua empresa e produtos.'}</small><a href="/conta">Adicionar fotos →</a></div>
   </div>
  </section>
 </div></main>
}

function Kpi({title,value,note,tone='',trend,trendClass='neutral'}){return <div className={'ca-kpi '+tone}><span>{title}</span><strong>{value}</strong><small>{note}</small>{trend&&<em className={'ca-kpi-trend '+trendClass}>{trend}</em>}</div>}
function Metric({label,value}){return <div><span>{label}</span><strong>{value}</strong></div>}
