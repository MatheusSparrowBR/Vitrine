const PREMIUM_LABEL='Publicidade Premium'
const PREMIUM_SUBLABEL='Solicitar banner na Home'

function addPremiumAdvertisingNavItem(){
  const nav=document.querySelector('.account-sidebar-nav')
  if(!nav||nav.querySelector('[data-account-premium-ad-nav]'))return
  const item=document.createElement('a')
  item.href='/conta/publicidade'
  item.className='account-nav-item account-premium-nav-item'
  item.dataset.accountPremiumAdNav='true'
  if(location.pathname==='/conta/publicidade')item.classList.add('active')
  item.setAttribute('aria-label',PREMIUM_LABEL)
  item.innerHTML=`<span class="nav-icon">✦</span><span class="account-premium-nav-copy"><strong>${PREMIUM_LABEL}</strong><small>${PREMIUM_SUBLABEL}</small></span>`
  const media=Array.from(nav.querySelectorAll('.account-nav-item')).find(el=>el.textContent?.trim().startsWith('Mídias'))
  if(media)nav.insertBefore(item,media)
  else nav.appendChild(item)
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addPremiumAdvertisingNavItem,{once:true})
else addPremiumAdvertisingNavItem()

new MutationObserver(addPremiumAdvertisingNavItem).observe(document.documentElement,{childList:true,subtree:true})
