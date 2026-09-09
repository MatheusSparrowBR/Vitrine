import React,{useEffect,useState} from 'react'
import AdminTools from './admin-tools.jsx'
import AdminEventsPanel from './AdminEventsPanel.jsx'
import AdminEventsTabBridge from './AdminEventsTabBridge.jsx'
import './admin-tools.css'

export default function AdminPlatformPage({supabase}){
 const [checking,setChecking]=useState(true)
 const [allowed,setAllowed]=useState(false)
 const [session,setSession]=useState(null)
 const [toast,setToast]=useState({text:'',error:false})
 useEffect(()=>{
  let live=true
  async function check(){
   if(!supabase){setChecking(false);return}
   const {data:{session}}=await supabase.auth.getSession()
   if(!live)return
   setSession(session)
   if(!session){setChecking(false);return}
   const {data,error}=await supabase.from('profiles').select('role').eq('id',session.user.id).maybeSingle()
   if(live){setAllowed(!error&&data?.role==='admin');setChecking(false)}
  }
  check()
  return()=>{live=false}
 },[supabase])
 function close(){window.location.href='/admin'}
 if(checking)return <div className="app"><main className="page section"><div className="empty"><h3>Verificando acesso administrativo…</h3></div></main></div>
 if(!supabase||!session||!allowed)return <div className="app"><main className="page section"><div className="empty"><h3>Acesso restrito</h3><p>Esta área é exclusiva para administradores.</p><button className="btn primary" onClick={()=>window.location.href='/admin'}>Voltar ao admin</button></div></main></div>
 return <div className="app" style={{minHeight:'100vh',background:'#eef3f8'}}><AdminTools supabase={supabase} session={session} onClose={close} onToast={(text,error=false)=>{setToast({text,error});window.setTimeout(()=>setToast({text:'',error:false}),3200)}} /><AdminEventsPanel supabase={supabase}/><AdminEventsTabBridge/>{toast.text&&<div style={{position:'fixed',top:18,left:'50%',transform:'translateX(-50%)',zIndex:2147483600,padding:'11px 16px',borderRadius:11,background:toast.error?'#fff0f0':'#10253e',color:toast.error?'#a12e2e':'#fff',boxShadow:'0 12px 28px rgba(0,0,0,.18)',fontWeight:800,fontSize:12}}>{toast.text}</div>}</div>
}
