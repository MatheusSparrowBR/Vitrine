const SLOT='data-vl-premium-slot'
const HOME_RX=/^\/[^/]+\/?$/

function schedule(){window.clearTimeout(window.__vlPremiumSlotTimer);window.__vlPremiumSlotTimer=window.setTimeout(update,120)}
function isCityHome(){return HOME_RX.test(location.pathname)}
function update(){
  const existing=document.querySelector(`[${SLOT}]`)
  if(!isCityHome()){existing?.remove();return}
  const hero=document.querySelector('.hero')
  if(!hero)return
  const hasBanner=Boolean(document.querySelector('.hero + section.page.section .content-card'))
  if(hasBanner){existing?.remove();return}
  if(existing)return
  const section=document.createElement('section')
  section.className='page section vl-premium-empty-slot'
  section.setAttribute(SLOT,'true')
  section.innerHTML='<div class="vl-premium-empty-card"><div class="vl-premium-empty-icon">★</div><div><span class="section-kicker">ESPAÇO PUBLICITÁRIO</span><h2>Banner Premium da cidade</h2><p>Este espaço é reservado para empresas que desejam colocar sua promoção em destaque na página inicial.</p><strong>Entre em contato para anunciar no VitrineLocal.</strong></div></div>'
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
