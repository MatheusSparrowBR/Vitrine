import React,{useEffect} from 'react'

/**
 * Adds the Events entry to the existing platform-management tab bar without
 * duplicating the event CRUD implementation. The event CRUD keeps its own
 * modal/workspace, while this bridge makes it reachable from the main admin UI.
 */
export default function AdminEventsTabBridge(){
 useEffect(()=>{
  let disposed=false
  let observer

  const attach=()=>{
   if(disposed)return true
   const tabs=document.querySelector('.vl-admin-tools-tabs')
   const trigger=document.querySelector('.vl-admin-events-trigger')
   if(!tabs||!trigger)return false
   if(tabs.querySelector('[data-vl-events-tab="true"]'))return true

   const button=document.createElement('button')
   button.type='button'
   button.dataset.vlEventsTab='true'
   button.textContent='Eventos'
   button.setAttribute('aria-label','Abrir gestão de eventos')
   button.addEventListener('click',()=>trigger.click())
   tabs.appendChild(button)
   return true
  }

  if(!attach()){
   observer=new MutationObserver(()=>attach())
   observer.observe(document.body,{childList:true,subtree:true})
  }

  return()=>{
   disposed=true
   observer?.disconnect()
   document.querySelector('[data-vl-events-tab="true"]')?.remove()
  }
 },[])

 return null
}
