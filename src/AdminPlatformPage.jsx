import React,{useEffect,useState} from 'react'
import AdminTools from './admin-tools.jsx'
import AdminEventsMain from './AdminEventsMain.jsx'
import AdminPromotionsPage from './AdminPromotionsPage.jsx'
import AdminPlanAssignments from './AdminPlanAssignments.jsx'
import AdminShell from './AdminShell.jsx'
import './admin-modern.css'
import './admin-v2.css'

export default function AdminPlatformPage({supabase}){
 const [checking,setChecking]=useState(true),[allowed,setAllowed]=useState(false),[session,setSession]=useState(null)
 const [tab,setTab]=useState(new URLSearchParams(location.search).get('tab')||'promotions')
 useEffect(()=>{let live=true;(async()=>{if(!supabase){setChecking(false);return}const {data:{session:s}}=await supabase.auth.getSession();if(!live)return;setSession(s||null);if(!s){setChecking(false);return}const {data,error}=await supabase.from('profiles').select('role').eq('id',s.user.id).maybeSingle();if(live){setAllowed(!error&&data?.role==='admin');setChecking(false)}})();const sync=()=>setTab(new URLSearchParams(location.search).get('tab')||'promotions');window.addEventListener('popstate',sync);return()=>{live=false;window.removeEventListener('popstate',sync)}},[supabase])
 if(checking)return <div className="admin-v2-shell"><div className="admin-v2-empty">Verificando acesso administrativo…</div></div>
 if(!supabase||!session||!allowed)return <div className="admin-v2-shell"><main className="admin-v2-content"><div className="admin-v2-card admin-v2-empty"><strong>Acesso restrito</strong><span>Esta área é exclusiva para administradores.</span><a className="admin-v2-btn primary" href="/admin">Voltar ao admin</a></div></main></div>
 const titles={promotions:['Promoções','Crie, agende e gerencie ofertas com horário local, imagem e controle de publicação.'],cities:['Cidades','Gerencie as cidades atendidas pela plataforma.'],categories:['Categorias','Organize a descoberta de empresas e serviços.'],plans:['Planos','Ajuste a estrutura comercial e os benefícios disponíveis.'],assignments:['Planos por empresa','Conceda Pro ou Premium manualmente, defina validade e acompanhe o plano efetivo de cada empresa.'],events:['Eventos','Cadastre e modere a agenda pública da cidade.']}
 const [title,description]=titles[tab]||titles.promotions
 const activeKey=tab==='assignments'?'plan_assignments':tab==='events'?'events':tab
 return <AdminShell active={activeKey} title={title} description={description} email={session.user.email}>
  {tab==='events'?<AdminEventsMain supabase={supabase}/>:tab==='promotions'?<AdminPromotionsPage supabase={supabase}/>:tab==='assignments'?<AdminPlanAssignments supabase={supabase}/>:<AdminTools supabase={supabase} defaultTab={tab}/>} 
 </AdminShell>
}
