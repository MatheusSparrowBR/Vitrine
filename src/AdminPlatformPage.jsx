import React,{useEffect,useState} from 'react'
import AdminTools from './admin-tools.jsx'
import AdminEventsPanel from './AdminEventsPanel.jsx'
import AdminShell from './AdminShell.jsx'
import './admin-modern.css'
import './admin-v2.css'

export default function AdminPlatformPage({supabase}){
 const [checking,setChecking]=useState(true),[allowed,setAllowed]=useState(false),[session,setSession]=useState(null)
 const [tab,setTab]=useState(new URLSearchParams(location.search).get('tab')||'promotions')
 useEffect(()=>{let live=true;(async()=>{if(!supabase){setChecking(false);return}const {data:{session:s}}=await supabase.auth.getSession();if(!live)return;setSession(s||null);if(!s){setChecking(false);return}const {data,error}=await supabase.from('profiles').select('role').eq('id',s.user.id).maybeSingle();if(live){setAllowed(!error&&data?.role==='admin');setChecking(false)}})();const sync=()=>setTab(new URLSearchParams(location.search).get('tab')||'promotions');window.addEventListener('popstate',sync);return()=>{live=false;window.removeEventListener('popstate',sync)}},[supabase])
 if(checking)return <div className="admin-v2-shell"><div className="admin-v2-empty">Verificando acesso administrativo…</div></div>
 if(!supabase||!session||!allowed)return <div className="admin-v2-shell"><main className="admin-v2-content"><div className="admin-v2-card admin-v2-empty"><strong>Acesso restrito</strong><span>Esta área é exclusiva para administradores.</span><a className="admin-v2-btn primary" href="/admin">Voltar ao admin</a></div></main></div>
 const titles={promotions:['Promoções','Publique, edite e remova ofertas do catálogo com controle de status e período.'],cities:['Cidades','Gerencie as cidades atendidas pela plataforma.'],categories:['Categorias','Organize a descoberta de empresas e serviços.'],plans:['Planos','Ajuste a estrutura comercial e os benefícios disponíveis.'],events:['Eventos','Cadastre e modere a agenda pública da cidade.']}
 const [title,description]=titles[tab]||titles.promotions
 return <AdminShell active={tab==='events'?'events':tab} title={title} description={description} email={session.user.email}>
  {tab==='events'?<section className="admin-v2-card admin-v2-section admin-v2-event-launch"><div className="admin-v2-section-head"><div><span className="admin-v2-kicker">AGENDA</span><h2>Gestão de eventos</h2><p>Cadastre, edite, destaque, publique e exclua eventos sem sair da central administrativa.</p></div></div><div className="admin-v2-event-card"><div><strong>Agenda da cidade</strong><span>O editor completo de eventos abre em uma janela de trabalho otimizada para desktop e mobile.</span></div><AdminEventsPanel supabase={supabase}/></div></section>:<AdminTools supabase={supabase} defaultTab={tab}/>} 
 </AdminShell>
}
