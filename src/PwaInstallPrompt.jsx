import React from 'react'
import {isIosDevice,isPwaInstalled,promptPwaInstall,subscribePwaInstall} from './pwa-install.js'
import './pwa-install.css'

const DISMISS_KEY='vitrine-pwa-install-dismissed-until'
const DISMISS_MS=7*24*60*60*1000
const SHOW_DELAY_MS=4000

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
  const ios=isIosDevice()

  React.useEffect(()=>{
    const unsubscribe=subscribePwaInstall(next=>{
      setState(next)
      if(next.installed)setVisible(false)
    })
    return unsubscribe
  },[])

  React.useEffect(()=>{
    if(state.installed||wasRecentlyDismissed())return
    const timer=window.setTimeout(()=>{
      if((ios||state.canInstall)&&!wasRecentlyDismissed())setVisible(true)
    },SHOW_DELAY_MS)
    return()=>window.clearTimeout(timer)
  },[ios,state.canInstall,state.installed])

  if(state.installed||!visible)return null

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
    <div className="pwa-install-icon" aria-hidden="true">
      <img src="/icons/vitrine-local.svg" alt=""/>
    </div>
    <div className="pwa-install-copy">
      <span className="pwa-install-eyebrow">VITRINELOCAL</span>
      <strong>Leve a sua cidade com você</strong>
      {ios
        ? <p>Adicione o VitrineLocal à tela inicial. No iPhone ou iPad, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p>
        : <p>Tenha acesso rápido a empresas, promoções e novidades, direto pela tela inicial.</p>}
    </div>
    <button className="pwa-install-close" type="button" onClick={close} aria-label="Fechar convite de instalação">×</button>
    {!ios&&<button className="pwa-install-action" type="button" onClick={install} disabled={installing}>{installing?'Abrindo…':'Instalar agora'}</button>}
    {ios&&<button className="pwa-install-action" type="button" onClick={install}>Entendi</button>}
    <button className="pwa-install-later" type="button" onClick={close}>Agora não</button>
  </aside>
}
