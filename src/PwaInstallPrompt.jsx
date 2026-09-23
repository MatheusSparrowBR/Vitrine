import React from 'react'
import {isIosDevice,isPwaInstalled,promptPwaInstall,subscribePwaInstall} from './pwa-install.js'
import './pwa-install.css'

const DISMISS_KEY='vitrine-pwa-install-dismissed-until'
const DISMISS_MS=7*24*60*60*1000

function wasRecentlyDismissed(){
  try{return Number(localStorage.getItem(DISMISS_KEY)||0)>Date.now()}catch{return false}
}

function dismissForLater(){
  try{localStorage.setItem(DISMISS_KEY,String(Date.now()+DISMISS_MS))}catch{}
}

export default function PwaInstallPrompt(){
  const [state,setState]=React.useState({canInstall:false,installed:isPwaInstalled()})
  const [visible,setVisible]=React.useState(false)
  const [installing,setInstalling]=React.useState(false)

  React.useEffect(()=>{
    const unsubscribe=subscribePwaInstall(next=>{
      setState(next)
      if(next.installed)setVisible(false)
      else if(next.canInstall&&!wasRecentlyDismissed())setVisible(true)
    })
    return unsubscribe
  },[])

  React.useEffect(()=>{
    if(!state.canInstall||state.installed||wasRecentlyDismissed())return
    const timer=window.setTimeout(()=>setVisible(true),900)
    return()=>window.clearTimeout(timer)
  },[state.canInstall,state.installed])

  if(state.installed||!visible)return null

  const ios=isIosDevice()

  const close=()=>{
    dismissForLater()
    setVisible(false)
  }

  const install=async()=>{
    if(ios){
      setVisible(false)
      return
    }
    setInstalling(true)
    try{
      const result=await promptPwaInstall()
      if(result.outcome==='accepted'||result.outcome==='dismissed')setVisible(false)
    }finally{
      setInstalling(false)
    }
  }

  return <aside className="pwa-install-card" role="dialog" aria-label="Instalar VitrineLocal">
    <div className="pwa-install-icon" aria-hidden="true"><img src="/icons/vitrine-local.svg" alt=""/></div>
    <div className="pwa-install-copy">
      <strong>Instale o VitrineLocal</strong>
      {ios
        ? <p>Tenha o VitrineLocal na tela inicial. No Safari, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p>
        : <p>Acesse sua cidade com um toque, direto pela tela inicial do celular.</p>}
    </div>
    <button className="pwa-install-close" type="button" onClick={close} aria-label="Agora não">×</button>
    {!ios&&<button className="pwa-install-action" type="button" onClick={install} disabled={installing}>{installing?'Abrindo…':'Instalar agora'}</button>}
    {ios&&<button className="pwa-install-action" type="button" onClick={install}>Entendi</button>}
    <button className="pwa-install-later" type="button" onClick={close}>Agora não</button>
  </aside>
}
