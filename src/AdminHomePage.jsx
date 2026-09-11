import React,{useEffect,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import AdminShell from './AdminShell.jsx'
import './admin-v2.css'

const U=import.meta.env.VITE_SUPABASE_URL,K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,db=U&&K?createClient(U,K):null
const actions=[
 ['businesses','Empresas','Revise cadastros, status, destaque e verificação.','/admin/empresas'],
 ['promotions','Promoções','Edite ofertas, altere status e remova campanhas.','/admin/gestao?tab=promotions'],
 ['events','Eventos','Mantenha a agenda pública atualizada.','/admin/gestao?tab=events'],
 ['banners','Banners Premium','Controle os espaços patrocinados da Home.','/admin/banners'],
]
export default function AdminHomePage(){
 const [checking,setChecking]=useState(true),[allowed,setAllowed]=useState(false),[session,setSession]=useState(null),[data,setData]=useState({cities:0,businesses:0,published:0,pendingPromotions:0,pendingBusinesses:0,rejectedBusinesses:0,events:0,banners:0,maintenanceStatus:'—',maintenanceAt:null,billingEvents:0,problemSubscriptions:0}),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let live=true;(async()=>{if(!db){setChecking(false);return}const {data:{session:s}}=await db.auth.getSession();if(!live)return;setSession(s||null);if(!s){setChecking(false);return}const {data:p,error:e}=await db.from('profiles').select('role').eq('id',s.user.id).maybeSingle();if(!live)return;const ok=!e&&p?.role==='admin';setAllowed(ok);setChecking(false);if(!ok)return;const [c,b,pr,ev,ad,m,bill,sub]=await Promise.all([
 db.from('cities').select('id,active'),
 db.from('businesses').select('id,status'),
 db.from('promotions').select('id,status'),
 db.from('events').select('id'),
 db.from('advertisements').select('id,active').eq('placement','home_banner'),
 db.from('operational_maintenance_runs').select('status,finished_at,started_at').order('started_at',{ascending:false}).limit(1).maybeSingle(),
 db.from('billing_events').select('id,processed_at').order('processed_at',{ascending:false}).limit(1).maybeSingle(),
 db.from('subscriptions').select('id,status').in('status',['past_due','unpaid','incomplete','incomplete_expired'])
 ]);if(!live)return;const firstError=[c.error,b.error,pr.error,ev.error,ad.error,m.error,bill.error,sub.error].find(Boolean);if(firstError)setError(firstError.message||'Não foi possível carregar todos os indicadores.');setData({cities:(c.data||[]).filter(x=>x.active).length,businesses:(b.data||[]).filter(x=>x.status==='active').length,published:(pr.data||[]).filter(x=>x.status==='published').length,pendingPromotions:(pr.data||[]).filter(x=>x.status==='pending_review').length,pendingBusinesses:(b.data||[]).filter(x=>x.status==='pending').length,rejectedBusinesses:(b.data||[]).filter(x=>x.status==='rejected').length,events:(ev.data||[]).length,banners:(ad.data||[]).filter(x=>x.active).length,maintenanceStatus:m.data?.status||'—',maintenanceAt:m.data?.finished_at||m.data?.started_at||null,billingEvents:bill.data?1:0,problemSubscriptions:(sub.data||[]).length});setLoading(false)})();return()=>{live=false}},[])
 if(checking)return <div className="admin-v2-shell"><div className="admin-v2-empty">Verificando acesso administrativo…</div></div>
 if(!allowed)return <div className="admin-v2-shell"><main className="admin-v2-content"><div className="admin-v2-card admin-v2-empty"><strong>Acesso restrito</strong><span>Faça login com uma conta administradora para continuar.</span><a className="admin-v2-btn primary" href="/login?next=%2Fadmin">Entrar</a></div></main></div>
 const maintenanceHealthy=data.maintenanceStatus==='success'
 return <AdminShell active="dashboard" title="Visão geral" description="Uma central única para operar catálogo, publicidade, agenda e modelo comercial da VitrineLocal." email={session?.user?.email}>
  {error&&<div className="admin-v2-alert">{error}</div>}
  {data.pendingBusinesses>0&&<div className="vl-phase2-admin-queue"><div><strong>{data.pendingBusinesses} empresa(s) aguardando análise</strong><span>O próximo passo é revisar e publicar ou rejeitar esses cadastros.</span></div><a href="/admin/empresas?status=pending">Revisar empresas →</a></div>}
  <section className="admin-v2-stats">
   <div className="admin-v2-card admin-v2-stat"><span>Cidades ativas</span><strong>{loading?'—':data.cities}</strong><small>Presença geográfica da plataforma</small></div>
   <div className="admin-v2-card admin-v2-stat green"><span>Empresas ativas</span><strong>{loading?'—':data.businesses}</strong><small>{loading?'—':`${data.pendingBusinesses} aguardando análise`}</small></div>
   <div className="admin-v2-card admin-v2-stat amber"><span>Promoções publicadas</span><strong>{loading?'—':data.published}</strong><small>{loading?'—':`${data.pendingPromotions} aguardando revisão`}</small></div>
   <div className="admin-v2-card admin-v2-stat purple"><span>Banners ativos</span><strong>{loading?'—':data.banners}</strong><small>{loading?'—':`${data.events} eventos cadastrados`}</small></div>
  </section>
  <section className="admin-v2-grid-2">
   <div className="admin-v2-card admin-v2-section"><div className="admin-v2-section-head"><div><h2>Ações rápidas</h2><p>Os fluxos mais usados, organizados para reduzir cliques.</p></div></div><div className="admin-v2-quick-grid">{actions.map(([key,label,text,href])=><a className="admin-v2-quick" href={href} key={key}><span>{key==='promotions'?'％':key==='events'?'◫':key==='banners'?'▰':'▦'} · {label}</span><strong>Abrir gestão</strong><small>{text}</small></a>)}</div></div>
   <div className="admin-v2-card admin-v2-section"><div className="admin-v2-section-head"><div><h2>Saúde do painel</h2><p>Indicadores operacionais básicos.</p></div></div><div className="admin-v2-list"><div className="admin-v2-list-row"><div><strong>Catálogo público</strong><small>Empresas e cidades disponíveis</small></div><span className="admin-v2-pill green">Operacional</span></div><div className="admin-v2-list-row"><div><strong>Moderação de empresas</strong><small>Cadastros aguardando decisão</small></div><span className={`admin-v2-pill ${data.pendingBusinesses?'amber':'green'}`}>{data.pendingBusinesses?`${data.pendingBusinesses} pendente(s)`:'Tudo em dia'}</span></div><div className="admin-v2-list-row"><div><strong>Moderação comercial</strong><small>Promoções pendentes de revisão</small></div><span className={`admin-v2-pill ${data.pendingPromotions?'amber':'green'}`}>{data.pendingPromotions?`${data.pendingPromotions} pendente(s)`:'Tudo em dia'}</span></div><div className="admin-v2-list-row"><div><strong>Agenda</strong><small>Eventos cadastrados no calendário</small></div><span className="admin-v2-pill blue">{data.events} evento(s)</span></div><div className="admin-v2-list-row"><div><strong>Publicidade</strong><small>Banners Premium atualmente ativos</small></div><span className="admin-v2-pill purple">{data.banners} ativo(s)</span></div><div className="admin-v2-list-row"><div><strong>Manutenção automática</strong><small>{data.maintenanceAt?'Última execução registrada':'Nenhuma execução registrada'}</small></div><span className={`admin-v2-pill ${maintenanceHealthy?'green':'amber'}`}>{data.maintenanceStatus}</span></div><div className="admin-v2-list-row"><div><strong>Billing / webhooks</strong><small>Último evento processado disponível</small></div><span className={`admin-v2-pill ${data.billingEvents?'green':'blue'}`}>{data.billingEvents?'Registrado':'Sem eventos ainda'}</span></div><div className="admin-v2-list-row"><div><strong>Assinaturas com problema</strong><small>Estados que exigem atenção operacional</small></div><span className={`admin-v2-pill ${data.problemSubscriptions?'amber':'green'}`}>{data.problemSubscriptions||'Tudo em dia'}</span></div></div></div>
  </section>
  <section className="admin-v2-card admin-v2-section"><div className="admin-v2-section-head"><div><h2>Fluxo recomendado</h2><p>Revise empresas, depois acompanhe promoções, eventos, publicidade e analytics.</p></div><div className="admin-v2-actions"><a className="admin-v2-btn primary" href="/admin/empresas">Revisar empresas</a><a className="admin-v2-btn" href="/admin/gestao?tab=promotions">Revisar promoções</a><a className="admin-v2-btn" href="/admin/analytics">Ver analytics →</a></div></div></section>
 </AdminShell>
}
