import React,{useEffect,useMemo,useState} from 'react'
import{supabase as sharedSupabase}from'./supabase-client.js'
import AdminShell from './AdminShell.jsx'
import{fmt,money,pct,delta,deltaClass,countOf,contactsOf,funnelSteps,peakDay,dayLabel,dateLong,linePoints,chartMax}from'./admin-analytics-format.js'
import './admin-analytics.css'

const db=sharedSupabase

export default function AdminAnalyticsPage(){
 const[s,setS]=useState({checking:true,allowed:false,session:null,data:null,error:''})
 const[range,setRange]=useState(30)
 const[refreshTick,setRefreshTick]=useState(0)
 const[realtimeStatus,setRealtimeStatus]=useState('connecting')

 useEffect(()=>{let live=true;(async()=>{
  if(!db){setS(x=>({...x,checking:false,error:'Supabase não está configurado.'}));return}
  const{data:{session}}=await db.auth.getSession()
  if(!live)return
  if(!session){setS(x=>({...x,checking:false}));return}
  const{data:p,error:pe}=await db.from('profiles').select('role').eq('id',session.user.id).maybeSingle()
  if(!live)return
  if(pe||p?.role!=='admin'){setS(x=>({...x,checking:false,session}));return}
  setS(x=>({...x,checking:false,allowed:true,session}))
 })();return()=>{live=false}},[])

 useEffect(()=>{let live=true;(async()=>{
  if(!db||!s.allowed)return
  const{data,error}=await db.rpc('admin_analytics_overview',{p_days:range})
  if(!live)return
  setS(x=>({...x,data:data||null,error:error?.message||''}))
 })();return()=>{live=false}},[s.allowed,range,refreshTick])

 useEffect(()=>{
  if(!db||!s.allowed)return
  let timer=null
  const channel=db.channel('admin-analytics-events')
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'analytics_events'},()=>{
    if(timer)clearTimeout(timer)
    timer=setTimeout(()=>setRefreshTick(v=>v+1),1200)
   })
   .subscribe(status=>{
    if(status==='SUBSCRIBED')setRealtimeStatus('connected')
    else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')setRealtimeStatus('unavailable')
   })
  return()=>{if(timer)clearTimeout(timer);db.removeChannel(channel)}
 },[s.allowed])

 const d=s.data
 const view=useMemo(()=>{
  if(!d)return null
  const cur=d.totals?.current||{},prev=d.totals?.previous||{}
  const contacts=contactsOf(cur),prevContacts=contactsOf(prev)
  const views=countOf(cur,['profile_view']),prevViews=countOf(prev,['profile_view'])
  return{
   cur,prev,contacts,prevContacts,views,prevViews,
   daily:d.daily||[],
   peak:peakDay(d.daily),
   funnel:funnelSteps(cur),
   topBusinesses:d.top_businesses||[],
   topCategories:d.top_categories||[],
   banners:d.banners||{impressions:0,clicks:0},
   topBanners:d.top_banners||[],
   growth:d.growth||{},
   subs:d.subscriptions||{active:0,mrr:0},
   activeBusinesses:d.businesses_active||0,
   pwa:d.pwa||{total:0,current:0,previous:0},
   period:d.period||{},
  }
 },[d])

 const periodText=view?.period?.start&&view?.period?.end?dateLong(view.period.start)+' → '+dateLong(view.period.end):''

 if(s.checking)return <div className="admin-v2-shell"><div className="admin-v2-empty">Verificando acesso administrativo…</div></div>
 if(!s.allowed)return <div className="admin-v2-shell"><main className="admin-v2-content"><div className="admin-v2-card admin-v2-empty"><strong>Acesso restrito</strong><span>Esta área é exclusiva para administradores.</span><a className="admin-v2-btn primary" href="/admin">Voltar ao admin</a></div></main></div>
 if(s.error)return <AdminShell active="analytics" title="Analytics" description="Descoberta, contatos, desempenho comercial e receita estimada." email={s.session?.user?.email}><div className="admin-v2-card admin-v2-empty"><strong>Não foi possível carregar os analytics.</strong><span>{s.error}</span></div></AdminShell>
 if(!view)return <AdminShell active="analytics" title="Analytics" description="Descoberta, contatos, desempenho comercial e receita estimada." email={s.session?.user?.email}><div className="admin-v2-card admin-v2-empty"><span>Carregando analytics…</span></div></AdminShell>

 const v=view,g=v.growth
 const dv=(c,p)=>({trend:delta(c,p),trendClass:deltaClass(c,p)})
 const ch=chartMax(v.daily,['page_views','profile_views','contacts'])

 return <AdminShell active="analytics" title="Analytics" description="Descoberta, contatos, desempenho comercial e receita estimada." email={s.session?.user?.email}>
   <div className="aa-toolbar">
    <div><span className="admin-v2-kicker">PERÍODO ANALISADO</span><strong>{periodText}</strong><small>Comparado com o período imediatamente anterior, de mesmo tamanho.</small><small className={realtimeStatus==='connected'?'aa-live-status connected':'aa-live-status'}>{realtimeStatus==='connected'?'● Atualização automática ativa':realtimeStatus==='unavailable'?'○ Atualização automática indisponível':'○ Conectando atualização automática…'}</small></div>
    <label>Período<select value={range} onChange={e=>setRange(Number(e.target.value))} aria-label="Período dos analytics"><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label>
   </div>

   <section className="aa-kpis aa-kpis-six">
    <Kpi label="Visitas ao perfil" value={fmt(v.views)} sub={'nas últimas '+range+' dias'} {...dv(v.views,v.prevViews)} tone=""/>
    <Kpi label="Contatos" value={fmt(v.contacts)} sub="WhatsApp, Instagram e site" {...dv(v.contacts,v.prevContacts)} tone="green"/>
    <Kpi label="Taxa de contato" value={pct(v.contacts,v.views)+'%'} sub="contatos ÷ visitas ao perfil" tone="purple"/>
    <Kpi label="Novas empresas" value={fmt(g.businesses?.current)} sub="cadastradas no período" {...dv(g.businesses?.current,g.businesses?.previous)} tone=""/>
    <Kpi label="Novos usuários" value={fmt(g.users?.current)} sub="cadastros no período" {...dv(g.users?.current,g.users?.previous)} tone=""/>
    <Kpi label="MRR estimado" value={money(v.subs.mrr)} sub={v.subs.active+' assinatura(s) ativa(s)'} tone="amber"/>
   </section>

   <section className="aa-insight">
    <div className="aa-insight-main"><div className="aa-insight-icon">↗</div><div><span>RESUMO EXECUTIVO</span><h2>O que aconteceu no período?</h2><p>{v.views||v.contacts?<>O perfil das empresas recebeu <b>{fmt(v.views)}</b> visitas{v.prevViews?<> ({delta(v.views,v.prevViews)} vs. período anterior)</>:null} e gerou <b>{fmt(v.contacts)}</b> contatos.</>:'Ainda não há visitas registradas no período selecionado.'}</p></div></div>
    <div className="aa-insight-facts">
     <div><span>Dia de maior movimento</span><strong>{v.peak?fmt(v.peak.profile_views)+' visitas':'—'}</strong><small>{v.peak?dayLabel(v.peak.day):'Sem visitas no período'}</small></div>
     <div><span>Empresa mais movimentada</span><strong>{v.topBusinesses[0]?.name||'—'}</strong><small>{v.topBusinesses[0]?fmt(v.topBusinesses[0].total)+' ações no período':'Sem dados'}</small></div>
     <div><span>Categoria mais buscada</span><strong>{v.topCategories[0]?.category||'—'}</strong><small>{v.topCategories[0]?fmt(v.topCategories[0].count)+' buscas':'Sem buscas no período'}</small></div>
    </div>
   </section>

   <section className="admin-v2-card aa-card">
    <div className="aa-head"><div><span className="admin-v2-kicker">TENDÊNCIA</span><h2>Visitas e contatos por dia</h2><p>Passe o cursor sobre o gráfico para ver os números de cada dia.</p></div>
     <div className="aa-legend"><span className="aa-dot-page"/>Páginas <span className="aa-dot-views"/>Visitas ao perfil <span className="aa-dot-contacts"/>Contatos</div></div>
    <TrendChart daily={v.daily} max={ch}/>
   </section>

   <section className="aa-grid">
    <article className="admin-v2-card aa-card">
     <div className="aa-head"><div><span className="admin-v2-kicker">FUNIL DE DESCOBERTA</span><h2>Do acesso ao contato</h2><p>Quanto do movimento vira contato em cada etapa.</p></div></div>
     <div className="aa-funnel">{v.funnel.map((step,i)=><FunnelRow key={step.label} step={step} first={i===0}/>)}</div>
     <div className="aa-funnel-note"><strong>{pct(v.contacts,v.views)}%</strong><span>das visitas ao perfil geraram um contato.</span></div>
    </article>

    <article className="admin-v2-card aa-card">
     <div className="aa-head"><div><span className="admin-v2-kicker">CANAIS</span><h2>Contatos por canal</h2><p>Participação de cada canal nos contatos do período.</p></div></div>
     <Channel label="WhatsApp" value={v.cur.whatsapp_click} total={v.contacts}/>
     <Channel label="Instagram" value={v.cur.instagram_click} total={v.contacts}/>
     <Channel label="Site" value={v.cur.website_click} total={v.contacts}/>
    </article>
   </section>

   <section className="aa-grid">
    <div className="admin-v2-card aa-card">
     <div className="aa-head"><div><span className="admin-v2-kicker">TOP NEGÓCIOS</span><h2>Empresas mais engajadas</h2><p>Por ações registradas no período (visitas, cliques, promoções, salvos e compartilhamentos).</p></div></div>
     {v.topBusinesses.length?<table className="aa-table"><thead><tr><th>Empresa</th><th>Visitas</th><th>Contatos</th><th>Engajamento</th><th>Taxa</th></tr></thead><tbody>{v.topBusinesses.map(b=><tr key={b.id}><td><strong>{b.name}</strong></td><td>{fmt(b.views)}</td><td>{fmt(b.contacts)}</td><td>{fmt(b.engagement)}</td><td>{pct(b.contacts,b.views)}%</td></tr>)}</tbody></table>:<div className="admin-v2-empty">Ainda não há ações por empresa no período.</div>}
    </div>
    <div className="admin-v2-card aa-card">
     <div className="aa-head"><div><span className="admin-v2-kicker">BUSCA</span><h2>Categorias mais buscadas</h2><p>Categorias que o público abriu no catálogo.</p></div></div>
     {v.topCategories.length?<div className="aa-ranking">{v.topCategories.map((c,i)=><BarRow key={c.category} label={c.category} value={c.count} max={v.topCategories[0].count} index={i}/>)}</div>:<div className="admin-v2-empty">Nenhuma categoria foi buscada no período.</div>}
    </div>
   </section>

   <section className="aa-grid">
    <div className="admin-v2-card aa-card">
     <div className="aa-head"><div><span className="admin-v2-kicker">PUBLICIDADE</span><h2>Banners</h2><p>Impressões e cliques dos banners premium.</p></div></div>
     <div className="aa-action-grid"><Stat label="Impressões" value={v.banners.impressions}/><Stat label="Cliques" value={v.banners.clicks}/><Stat label="Taxa de clique" value={pct(v.banners.clicks,v.banners.impressions)+'%'}/></div>
     {v.topBanners.length?<div className="aa-ranking">{v.topBanners.map((b,i)=><div className="aa-rank" key={b.id}><b>{i+1}</b><div><strong>{b.title}</strong><small>{fmt(b.impressions)} impressões · {fmt(b.clicks)} cliques</small></div><span>{pct(b.clicks,b.impressions)}%</span></div>)}</div>:<p className="aa-caption">Nenhum banner foi exibido no período.</p>}
    </div>
    <div className="admin-v2-card aa-card">
     <div className="aa-head"><div><span className="admin-v2-kicker">AÇÕES DO PÚBLICO</span><h2>Outras interações</h2><p>Além dos contatos, o que o público fez no período.</p></div></div>
     <div className="aa-action-grid">
      <Stat label="Cliques em promoções" value={v.cur.promotion_click}/>
      <Stat label="Cliques em eventos" value={v.cur.event_click}/>
      <Stat label="Salvos" value={v.cur.save_click}/>
      <Stat label="Compartilhamentos" value={v.cur.share_click}/>
      <Stat label="Galeria aberta" value={v.cur.gallery_open}/>
      <Stat label="Viu planos" value={v.cur.plan_view}/>
      <Stat label="Como chegar" value={v.cur.directions_click}/>
      <Stat label="Instalações do app" value={v.pwa.current} sub={v.pwa.total+' no total'}/>
     </div>
    </div>
   </section>

   <section className="admin-v2-card aa-card">
    <div className="aa-operational">
     <div><span>Empresas ativas</span><strong>{fmt(v.activeBusinesses)}</strong><small>Disponíveis no catálogo</small></div>
     <div><span>Assinaturas ativas</span><strong>{fmt(v.subs.active)}</strong><small>Planos ativos ou em teste</small></div>
     <div><span>MRR estimado</span><strong>{money(v.subs.mrr)}</strong><small>Receita mensal recorrente</small></div>
     <div><span>Novos eventos</span><strong>{fmt(g.events?.current)}</strong><small>publicados no período</small></div>
     <div><span>Novas avaliações</span><strong>{fmt(g.reviews?.current)}</strong><small>no período</small></div>
    </div>
   </section>
 </AdminShell>
}

function Kpi({label,value,sub,trend,trendClass='neutral',tone=''}){return <div className={'admin-v2-card aa-kpi '+tone}><span>{label}</span><strong>{value}</strong><small>{sub}</small>{trend&&<em className={'aa-kpi-trend '+trendClass}>{trend} vs. período anterior</em>}</div>}

function TrendChart({daily,max}){
 const W=640,H=220
 const first=daily[0]?.day,last=daily.at?.(-1)?.day,mid=daily[Math.floor(daily.length/2)]?.day
 const series=[['page_views','aa-line-page'],['profile_views','aa-line-views'],['contacts','aa-line-contacts']]
 return <div className="aa-linechart"><svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Visitas e contatos por dia">
   {series.map(([key,cls])=><polyline key={key} className={cls} points={linePoints(daily,key,W,H,max)} fill="none" vectorEffect="non-scaling-stroke"/>)}
   {daily.map((d,i)=>{const step=daily.length>1?W/(daily.length-1):0;const x=i*step-(step/2);return <rect key={d.day} x={Math.max(0,x)} y="0" width={Math.max(step,8)} height={H} fill="transparent"><title>{`${dayLabel(d.day)}: ${fmt(d.profile_views)} visitas · ${fmt(d.contacts)} contatos · ${fmt(d.page_views)} páginas`}</title></rect>})}
  </svg>
  <div className="aa-axis"><span>{dayLabel(first)}</span><span>{dayLabel(mid)}</span><span>{dayLabel(last)}</span></div>
  <small className="aa-chart-scale">Máximo do gráfico: {fmt(max)}</small>
 </div>
}

function FunnelRow({step,first}){return <div className="aa-funnel-row"><div><strong>{step.label}</strong><span>{fmt(step.value)}{!first&&<em className="aa-funnel-rate"> · {step.rate}% da etapa anterior</em>}</span></div><div className="aa-track"><i style={{width:Math.max(step.value?3:0,Math.min(100,Number(step.share)))+'%'}}/></div><b>{step.share}%</b></div>}

function Channel({label,value,total}){const share=Number(pct(value,total));return <div className="aa-channel"><div><strong>{label}</strong><span>{fmt(value)+' · '+share+'%'}</span></div><div className="aa-channel-track"><i style={{width:Math.max(value?4:0,share)+'%'}}/></div></div>}

function BarRow({label,value,max,index}){const w=max?Math.max(4,(value/max)*100):0;return <div className="aa-bar-row"><b>{index+1}</b><div className="aa-bar-body"><div className="aa-bar-top"><strong>{label}</strong><span>{fmt(value)}</span></div><div className="aa-channel-track"><i style={{width:w+'%'}}/></div></div></div>}

function Stat({label,value,sub}){return <div className="aa-stat"><span>{label}</span><strong>{typeof value==='string'?value:fmt(value)}</strong>{sub&&<small>{sub}</small>}</div>}
