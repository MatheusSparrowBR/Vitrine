import React from 'react'
import {supabase} from './supabase-client.js'
import PrelaunchPage from './PrelaunchPage.jsx'

const PRELAUNCH_MODE=String(import.meta.env.VITE_PRELAUNCH_MODE ?? 'true').toLowerCase()!=='false'
const OPEN_PATHS=new Set([
 '/login','/planos','/em-breve/planos','/privacidade','/termos','/atualizar-senha','/demo',
 '/usuario/login','/usuario/cadastro','/usuario/perfil',
 '/conta','/conta/onboarding','/conta/analytics','/conta/analytics-comercial',
 '/conta/publicidade','/conta/publicidade-legado','/conta/nova'
])

const normalize=p=>p.replace(/\/+$/,'')||'/'
const canPassDuringPrelaunch=path=>{
 const value=normalize(path)
 return value.startsWith('/admin')||OPEN_PATHS.has(value)
}

export default function PrelaunchGate({children,path}){
 const [state,setState]=React.useState(()=>!PRELAUNCH_MODE||canPassDuringPrelaunch(path)?'open':'checking')
 React.useEffect(()=>{
  if(!PRELAUNCH_MODE||canPassDuringPrelaunch(path)){
   setState('open')
   return undefined
  }
  let live=true
  const resolve=async()=>{
   if(!supabase){if(live)setState('locked');return}
   try{
    const {data:{session}}=await supabase.auth.getSession()
    if(!session){if(live)setState('locked');return}
    const {data:profile}=await supabase.from('profiles').select('role').eq('id',session.user.id).maybeSingle()
    if(live)setState(profile?.role==='admin'?'open':'locked')
   }catch{
    if(live)setState('locked')
   }
  }
  resolve()
  const subscription=supabase?.auth?.onAuthStateChange?.(()=>setTimeout(resolve,0))
  return()=>{live=false;subscription?.data?.subscription?.unsubscribe?.()}
 },[path])
 if(state==='checking')return <div className="vl-prelaunch-loading" aria-live="polite"><span>Preparando o VitrineLocal…</span></div>
 if(state==='locked')return <PrelaunchPage/>
 return children
}

export {PRELAUNCH_MODE,canPassDuringPrelaunch}
