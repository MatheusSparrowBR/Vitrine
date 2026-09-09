const SLOT='data-vl-premium-slot'
const HOME_RX=/^\/[^/]+\/?$/

function schedule(){window.clearTimeout(window.__vlPremiumSlotTimer);window.__vlPremiumSlotTimer=window.setTimeout(update,120)}
function isCityHome(){const p=location.pathname;return HOME_RX.test(p)&&!p.startsWith('/admin')&&!p.startsWith('/conta')&&!p.startsWith('/planos')}
function findPremiumSection(){
  return [...document.querySelectorAll('.page.section')].find(section=>{
    const heading=section.querySelector('h2')?.textContent?.trim().toLowerCase()
    return heading==='oferta em destaque'&&section.querySelector('.content-card')
  })
}
function styleActive(section){
  section.classList.add('vl-premium-active-slot')
  section.setAttribute(SLOT,'true')
  const kicker=section.querySelector('.section-kicker')
  const heading=section.querySelector('h2')
  if(kicker)kicker.textContent='ESPAÇO PUBLICITÁRIO'
  if(heading)heading.textContent=''
  const card=section.querySelector('.content-card')
  if(card){
    card.classList.add('vl-premium-banner-card')
    card.setAttribute('aria-label','Espaço publicitário Premium')
  }
}
function update(){
  if(!isCityHome()){
    document.querySelector(`[${SLOT}]`)?.removeAttribute(SLOT)
    return
  }
  const hero=document.querySelector('.hero')
  if(!hero)return
  const active=findPremiumSection()
  if(active){
    styleActive(active)
    if(hero.nextElementSibling!==active)hero.insertAdjacentElement('afterend',active)
    document.querySelectorAll(`[${SLOT}].vl-premium-empty-slot`).forEach(node=>node.remove())
    return
  }
  const existing=document.querySelector(`[${SLOT}].vl-premium-empty-slot`)
  if(existing){if(hero.nextElementSibling!==existing)hero.insertAdjacentElement('afterend',existing);return}
  const section=document.createElement('section')
  section.className='page section vl-premium-empty-slot'
  section.setAttribute(SLOT,'empty')
  section.innerHTML='<div class="vl-premium-empty-card"><div class="vl-premium-empty-icon">★</div><div><span class="section-kicker">ESPAÇO PUBLICITÁRIO</span><h2></h2><p>Este espaço é reservado para empresas que desejam colocar sua promoção em destaque na página inicial.</p><strong>Entre em contato para anunciar no VitrineLocal.</strong></div></div>'
  hero.insertAdjacentElement('afterend',section)
}
function install(){
  document.addEventListener('DOMContentLoaded',()=>window.setTimeout(update,450),{once:true})
  window.addEventListener('load',()=>window.setTimeout(update,150),{once:true})
  window.addEventListener('popstate',schedule)
  document.addEventListener('change',e=>{if(e.target?.matches?.('.city-select'))schedule()})
  const root=document.getElementById('root')
  if(root){const observer=new MutationObserver(mutations=>{if(mutations.some(m=>[...m.addedNodes].some(node=>node.nodeType===1&&!node.hasAttribute?.(SLOT))))schedule()});observer.observe(root,{childList:true,subtree:true})}
  const originalPush=history.pushState
  history.pushState=function(...args){const result=originalPush.apply(this,args);schedule();return result}
  const originalReplace=history.replaceState
  history.replaceState=function(...args){const result=originalReplace.apply(this,args);schedule();return result}
  schedule()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install()
