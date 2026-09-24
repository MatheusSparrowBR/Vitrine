import React,{useEffect,useState} from 'react'
import{supabase as db}from'./supabase-client.js'
import AdminShell from './AdminShell.jsx'
import './admin-v2.css'
import './admin-home.css'

const actions=[
 ['notifications','Notificações','Envie Push personalizados e reutilize promoções, eventos ou empresas.','/admin/notificacoes'],
 ['invitations','Convites','Acompanhe convites pendentes, gere novos links e reenvie acessos.','/admin/convites'],
 ['businesses','Empresas','Revise cadastros, status, destaque e verificação.','/admin/empresas'],
 ['promotions','Promoções','Edite ofertas, altere status e remova campanhas.','/admin/gestao?tab=promotions'],
 ['events','Eventos','Mantenha a agenda pública atualizada.','/admin/gestao?tab=events'],
 ['banners','Banners Premium','Controle os espaços patrocinados da Home.','/admin/banners'],
]
export default function AdminHomePage(){
 const [checking,setChecking]=useState(true),[allowed,setAllowed]=useState(false),[session,setSession]=useState(null),[data,setData]=useState({cities:0,businesses:0,published:0,pendingPromotions:0,pendingBusinesses:0,rejectedBusinesses:0,events:0,banners:0,maintenanceStatus:'—',maintenanceAt:null,billingEvents:0,problemSubscriptions:0}),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let live=true;(async()=>{
  if(!db){setChecking(false);return}
  const{data:{session:s}}=await db.auth.getSession();if(!live)return
  setSession(s||null);if(!s){setChecking(false);return}
  const{data:p,error:e}=await db.from('profiles').select('role').eq('id',s.user.id).maybeSingle();if(!live)return
  const ok=!e&&p?.role==='admin';setAllowed(ok);setChecking(false);if(!ok)return
  setLoading(true);setError('')
  const[counts,m,latestBilling,problemSubs]=await Promise.all([
   Promise.all([
    db.from('cities').select('id',{count:'exact',head:true}).eq('active',true),
    db.from('businesses').select('id',{count:'exact',head:true}).eq('status','active'),
    db.from('promotions').select('id',{count:'exact',head:true}).eq('status','published'),
    db.from('advertisements').select('id',{count:'exact',head:true}).eq('placement','home_banner').eq('active',true),
    db.from('businesses').select('id',{count:'exact',head:true}).eq('status','pending'),
    db.from('promotions').select('id',{count:'exact',head:true}).eq('status','pending_review'),
    db.from('businesses').select('id',{count:'exact',head:true}).eq('status','rejected'),
    db.from('events').select('id',{count:'exact',head:true})
   ]),
   db.from('operational_maintenance_runs').select('status,finished_at,started_at').order('started_at',{ascending:false}).limit(1).maybeSingle(),
   db.from('billing_events').select('id,processed_at').order('processed_at',{ascending:false}).limit(1).maybeSingle(),
   db.from('subscriptions').select('id',{count:'exact',head:true}).in('status',['past_due','unpaid','incomplete','incomplete_expired'])
  ])
  if(!live)return
  const[citiesCount,businessesCount,publishedCount,bannersCount,pendingBusinessesCount,pendingPromotionsCount,rejectedBusinessesCount,eventsCount]=counts
  const firstError=[...counts.map(x=>x.error),m.error,latestBilling.error,problemSubs.error].find(Boolean)
  if(firstError)setError(firstError.message||'Não foi possível carregar todos os indicadores.')
  setData({
   cities:Number(citiesCount.count||0),
   businesses:Number(businessesCount.count||0),
   published:Number(publishedCount.count||0),
   pendingPromotions:Number(pendingPromotionsCount.count||0),
   pendingBusinesses:Number(pendingBusinessesCount.count||0),
   rejectedBusinesses:Number(rejectedBusinessesCount.count||0),
   events:Number(eventsCount.count||0),
   banners:Number(bannersCount.count||0),
   maintenanceStatus:m.data?.status||'—',
   maintenanceAt:m.data?.finished_at||m.data?.started_at||null,
   billingEvents:latestBilling.data?1:0,
   problemSubscriptions:Number(problemSubs.count||0)
  })
  setLoading(false)
 })();return()=>{live=false}},[])
 if(checking)return <div className="admin-v2-shell"><div className="admin-v2-empty">Verificando acesso administrativo…</div></div>
 if(!allowed)return <div className="admin-v2-shell"><main className="admin-v2-content"><div className="admin-v2-card admin-v2-empty"><strong>Acesso restrito</strong><span>Faça login com uma conta administradora para continuar.</span><a className="admin-v2-btn primary" href="/login?next=%2Fadmin">Entrar</a></div></main></div>
 const maintenanceHealthy=data.maintenanceStatus==='success';const attentionCount=data.pendingBusinesses+data.pendingPromotions+data.problemSubscriptions
 return <AdminShell active="dashboard" title="Visão geral" description="Uma central única para operar catálogo, publicidade, agenda e modelo comercial da VitrineLocal." email={session?.user?.email}>
  {error&&<div className="admin-v2-alert">{error}</div>}
  {data.pendingBusinesses>0&&<div className="vl-phase2-admin-queue"><div><strong>{data.pendingBusinesses} empresa(s) aguardando análise</strong><span>O próximo passo é revisar e publicar ou rejeitar esses cadastros.</span></div><a href="/admin/empresas?status=pending">Revisar empresas →</a></div>}
  <section className="admin-v2-stats admin-home-kpis">
   <div className="admin-v2-card admin-v2-stat admin-home-kpi"><span>Cidades ativas</span><strong>{loading?'—':data.cities}</strong><small>Presença geográfica da plataforma</small></div>
   <div className="admin-v2-card admin-v2-stat green admin-home-kpi"><span>Empresas ativas</span><strong>{loading?'—':data.businesses}</strong><small>{loading?'—':`${data.pendingBusinesses} aguardando análise`}</small></div>
   <div className="admin-v2-card admin-v2-stat amber admin-home-kpi"><span>Promoções publicadas</span><strong>{loading?'—':data.published}</strong><small>{loading?'—':`${data.pendingPromotions} aguardando revisão`}</small></div>
   <div className="admin-v2-card admin-v2-stat purple admin-home-kpi"><span>Banners ativos</span><strong>{loading?'—':data.banners}</strong><small>{loading?'—':`${data.events} eventos cadastrados`}</small></div>
  </section>
  <section className="admin-v2-grid-2 admin-home-main-grid">
   <div className="admin-v2-card admin-v2-section admin-home-actions-card"><div className="admin-v2-section-head"><div><span className="admin-v2-kicker">ATALHOS</span><h2>Ações rápidas</h2><p>Os fluxos mais usados, organizados para reduzir cliques.</p></div></div><div className="admin-v2-quick-grid admin-home-quick-grid">{actions.map(([key,label,text,href])=><a className="admin-v2-quick admin-home-quick" href={href} key={key}><span>{key==='notifications'?'🔔':key==='promotions'?'％':key==='events'?'◫':key==='banners'?'▰':'▦'} · {label}</span><strong>Abrir gestão</strong><small>{text}</small><b className="admin-home-quick-arrow">→</b></a>)}</div></div>
   <div className="admin-v2-card admin-v2-section admin-home-health-card"><div className="admin-v2-section-head"><div><span className="admin-v2-kicker">MONITORAMENTO</span><h2>Saúde do painel</h2><p>Indicadores operacionais básicos.</p></div><span className="admin-home-attention-badge">{attentionCount?attentionCount+' atenção(ões)':'Tudo em dia'}</span></div><div className="admin-v2-list admin-home-health-list"><div className="admin-v2-list-row admin-home-health-row"><div><strong>Catálogo público</strong><small>Empresas e cidades disponíveis</small></div><span className="admin-v2-pill green">Operacional</span></div><div className="admin-v2-list-row admin-home-health-row"><div><strong>Moderação de empresas</strong><small>Cadastros aguardando decisão</small></div><span className={`admin-v2-pill ${data.pendingBusinesses?'amber':'green'}`}>{data.pendingBusinesses?`${data.pendingBusinesses} pendente(s)`:'Tudo em dia'}</span></div><div className="admin-v2-list-row admin-home-health-row"><div><strong>Moderação comercial</strong><small>Promoções pendentes de revisão</small></div><span className={`admin-v2-pill ${data.pendingPromotions?'amber':'green'}`}>{data.pendingPromotions?`${data.pendingPromotions} pendente(s)`:'Tudo em dia'}</span></div><div className="admin-v2-list-row admin-home-health-row"><div><strong>Agenda</strong><small>Eventos cadastrados no calendário</small></div><span className="admin-v2-pill blue">{data.events} evento(s)</span></div><div className="admin-v2-list-row admin-home-health-row"><div><strong>Publicidade</strong><small>Banners Premium atualmente ativos</small></div><span className="admin-v2-pill purple">{data.banners} ativo(s)</span></div><div className="admin-v2-list-row admin-home-health-row"><div><strong>Manutenção automática</strong><small>{data.maintenanceAt?'Última execução registrada':'Nenhuma execução registrada'}</small></div><span className={`admin-v2-pill ${maintenanceHealthy?'green':'amber'}`}>{data.maintenanceStatus}</span></div><div className="admin-v2-list-row admin-home-health-row"><div><strong>Billing / webhooks</strong><small>Último evento processado disponível</small></div><span className={`admin-v2-pill ${data.billingEvents?'green':'blue'}`}>{data.billingEvents?'Registrado':'Sem eventos ainda'}</span></div><div className="admin-v2-list-row admin-home-health-row"><div><strong>Assinaturas com problema</strong><small>Estados que exigem atenção operacional</small></div><span className={`admin-v2-pill ${data.problemSubscriptions?'amber':'green'}`}>{data.problemSubscriptions||'Tudo em dia'}</span></div></div></div>
  </section>
  <section className="admin-v2-card admin-v2-section"><div className="admin-v2-section-head"><div><h2>Fluxo recomendado</h2><p>Revise empresas, depois acompanhe promoções, eventos, publicidade e analytics.</p></div><div className="admin-v2-actions"><a className="admin-v2-btn primary" href="/admin/empresas">Revisar empresas</a><a className="admin-v2-btn" href="/admin/gestao?tab=promotions">Revisar promoções</a><a className="admin-v2-btn" href="/admin/analytics">Ver analytics →</a></div></div></section>
 </AdminShell>
}
