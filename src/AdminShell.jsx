import React,{useEffect,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
const U=import.meta.env.VITE_SUPABASE_URL
const K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=U&&K?createClient(U,K):null
const NAV=[
 ['dashboard','Visão geral','⌂','/admin'],
 ['businesses','Empresas','▦','/admin/empresas'],
 ['promotions','Promoções','％','/admin/gestao?tab=promotions'],
 ['events','Eventos','◫','/admin/gestao?tab=events'],
 ['advertising','Publicidade','▣','/admin/publicidade'],
 ['banners','Banners','▰','/admin/banners'],
 ['analytics','Analytics','◔','/admin/analytics'],
 ['categories','Categorias','◇','/admin/gestao?tab=categories'],
 ['cities','Cidades','⌖','/admin/gestao?tab=cities'],
 ['plans','Planos','◆','/admin/gestao?tab=plans'],
 ['plan_assignments','Planos por empresa','↕','/admin/gestao?tab=assignments'],
]
export default function AdminShell({active='dashboard',title,description,email,children}){
 const[mobileOpen,setMobileOpen]=useState(false),[emailState,setEmailState]=useState(email||'')
 useEffect(()=>{if(email){setEmailState(email);return}db?.auth.getSession().then(({data})=>setEmailState(data?.session?.user?.email||''))},[email])
 const go=href=>{setMobileOpen(false);window.location.href=href}
 const logout=async()=>{if(db)await db.auth.signOut();window.location.href='/laguna'}
 return <div className="admin-v2-shell"><aside className={`admin-v2-sidebar ${mobileOpen?'open':''}`}><div className="admin-v2-brand"><a href="/admin"><span className="admin-v2-brand-mark">V</span><span><strong>Vitrine<span>Local</span></strong><small>Central administrativa</small></span></a></div><nav className="admin-v2-nav" aria-label="Navegação administrativa"><small>PLATAFORMA</small>{NAV.map(([key,label,icon,href])=><button key={key} className={active===key?'active':''} onClick={()=>go(href)}><span className="icon">{icon}</span><span>{label}</span></button>)}</nav><div className="admin-v2-sidebar-bottom"><a href="/laguna" className="admin-v2-back-site">↗ Ver site público</a><button className="admin-v2-logout" onClick={logout}>Sair da conta</button></div></aside>{mobileOpen&&<button className="admin-v2-overlay" aria-label="Fechar menu" onClick={()=>setMobileOpen(false)}/>}<div className="admin-v2-main"><header className="admin-v2-topbar"><div className="admin-v2-mobile-head"><button className="admin-v2-menu" onClick={()=>setMobileOpen(true)} aria-label="Abrir menu">☰</button><span>VitrineLocal</span></div><div className="admin-v2-user"><span className="admin-v2-avatar">{(emailState||'A').slice(0,1).toUpperCase()}</span><div><strong>{emailState||'Administrador'}</strong><small>Administrador</small></div><span className="admin-v2-dot"/></div></header><main className="admin-v2-content"><div className="admin-v2-heading"><div><span className="admin-v2-kicker">PAINEL ADMINISTRATIVO</span><h1>{title}</h1>{description&&<p>{description}</p>}</div><div className="admin-v2-heading-meta"><span>Online</span><small>VitrineLocal</small></div></div>{children}</main></div></div>
}
