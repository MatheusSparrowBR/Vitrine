import React,{useEffect,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import AdminShell from './AdminShell.jsx'
import './admin-v2.css'

const U=import.meta.env.VITE_SUPABASE_URL,K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,db=U&&K?createClient(U,K):null
const actions=[
 ['businesses','Empresas','Gerencie cadastros, status, destaque e verificação.','/admin/empresas'],
 ['promotions','Promoções','Edite ofertas, altere status e remova campanhas.','/admin/gestao?tab=promotions'],
 ['events','Eventos','Mantenha a agenda pública atualizada.','/admin/gestao?tab=events'],
 ['banners','Banners Premium','Controle os espaços patrocinados da Home.','/admin/banners'],
]
export default function AdminHomePage(){
 const [checking,setChecking]=useState(true),[allowed,setAllowed]=useState(false),[session,setSession]=useState(null),[data,setData]=useState({cities:0,businesses:0,published:0,pending:0,events:0,banners:0}),[loading,setLoading]=useState(true)
 useEffect(()=>{let live=true;(async()=>{if(!db){setChecking(false);return}const {data:{session:s}}=await db.auth.getSession();if(!live)return;setSession(s||null);if(!s){setChecking(false);return}const {data:p,error:e}=await db.from('profiles').select('role').eq('id',s.user.id).maybeSingle();if(!live)return;const ok=!e&&p?.role==='admin';setAllowed(ok);setChecking(false);if(!ok)return;const [c,b,pr,ev,ad]=await Promise.all([db.from('cities').select('id,active'),db.from('businesses').select('id,status'),db.from('promotions').select('id,status'),db.from('events').select('id'),db.from('advertisements').select('id,active').eq('placement','home_banner')]);if(!live)return;setData({cities:(c.data||[]).filter(x=>x.active).length,businesses:(b.data||[]).filter(x=>x.status==='active').length,published:(pr.data||[]).filter(x=>x.status==='published').length,pending:(pr.data||[]).filter(x=>x.status==='pending_review').length,events:(ev.data||[]).length,banners:(ad.data||[]).filter(x=>x.active).length});setLoading(false)})();return()=>{live=false}},[])
 if(checking)return <div className="admin-v2-shell"><div className="admin-v2-empty">Verificando acesso administrativo…</div></div>
 if(!allowed)return <div className="admin-v2-shell"><main className="admin-v2-content"><div className="admin-v2-card admin-v2-empty"><strong>Acesso restrito</strong><span>Faça login com uma conta administradora para continuar.</span><a className="admin-v2-btn primary" href="/login?next=%2Fadmin">Entrar</a></div></main></div>
 return <AdminShell active="dashboard" title="Visão geral" description="Uma central única para operar o catálogo, publicidade, agenda e modelo comercial da VitrineLocal." email={session?.user?.email}>
  <section className="admin-v2-stats">
   <div className="admin-v2-card admin-v2-stat"><span>Cidades ativas</span><strong>{loading?'—':data.cities}</strong><small>Presença geográfica da plataforma</small></div>
   <div className="admin-v2-card admin-v2-stat green"><span>Empresas ativas</span><strong>{loading?'—':data.businesses}</strong><small>Perfis disponíveis para descoberta</small></div>
   <div className="admin-v2-card admin-v2-stat amber"><span>Promoções publicadas</span><strong>{loading?'—':data.published}</strong><small>{loading?'—':`${data.pending} aguardando revisão`}</small></div>
   <div className="admin-v2-card admin-v2-stat purple"><span>Banners ativos</span><strong>{loading?'—':data.banners}</strong><small>{loading?'—':`${data.events} eventos cadastrados`}</small></div>
  </section>
  <section className="admin-v2-grid-2">
   <div className="admin-v2-card admin-v2-section"><div className="admin-v2-section-head"><div><h2>Ações rápidas</h2><p>Os fluxos mais usados, organizados para reduzir cliques.</p></div></div><div className="admin-v2-quick-grid">{actions.map(([key,label,text,href])=><a className="admin-v2-quick" href={href} key={key}><span>{key==='promotions'?'％':key==='events'?'◫':key==='banners'?'▰':'▦'} · {label}</span><strong>Abrir gestão</strong><small>{text}</small></a>)}</div></div>
   <div className="admin-v2-card admin-v2-section"><div className="admin-v2-section-head"><div><h2>Saúde do painel</h2><p>Indicadores operacionais básicos.</p></div></div><div className="admin-v2-list"><div className="admin-v2-list-row"><div><strong>Catálogo público</strong><small>Empresas e cidades disponíveis</small></div><span className="admin-v2-pill green">Operacional</span></div><div className="admin-v2-list-row"><div><strong>Moderação comercial</strong><small>Promoções pendentes de revisão</small></div><span className={`admin-v2-pill ${data.pending?'amber':'green'}`}>{data.pending?`${data.pending} pendente(s)`:'Tudo em dia'}</span></div><div className="admin-v2-list-row"><div><strong>Agenda</strong><small>Eventos publicados no calendário</small></div><span className="admin-v2-pill blue">{data.events} evento(s)</span></div><div className="admin-v2-list-row"><div><strong>Publicidade</strong><small>Banners Premium atualmente ativos</small></div><span className="admin-v2-pill purple">{data.banners} ativo(s)</span></div></div></div>
  </section>
  <section className="admin-v2-card admin-v2-section"><div className="admin-v2-section-head"><div><h2>Fluxo recomendado</h2><p>Use Promoções para revisar conteúdo comercial e Banners para mídia patrocinada.</p></div><div className="admin-v2-actions"><a className="admin-v2-btn primary" href="/admin/gestao?tab=promotions">Revisar promoções</a><a className="admin-v2-btn" href="/admin/empresas">Ver empresas</a></div></div></section>
 </AdminShell>
}
