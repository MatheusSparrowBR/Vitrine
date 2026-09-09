const ID='vl-admin-premium-edit-link'
function isAdminRoute(){return location.pathname==='/admin'||location.pathname==='/admin/'}
function update(){
  const current=document.getElementById(ID)
  if(!isAdminRoute()){current?.remove();return}
  if(current)return
  const link=document.createElement('a')
  link.id=ID
  link.href='/admin/banners'
  link.textContent='✎ Editar banners Premium'
  link.setAttribute('aria-label','Editar banners Premium')
  document.body.appendChild(link)
}
function schedule(){window.clearTimeout(window.__vlAdminBannerTimer);window.__vlAdminBannerTimer=window.setTimeout(update,120)}
function install(){
  const css=document.createElement('style')
  css.textContent='#'+ID+'{position:fixed;top:88px;right:24px;z-index:6500;display:inline-flex;align-items:center;gap:7px;padding:10px 13px;border-radius:11px;background:#fff;border:1px solid #d9e3ee;color:#18324f;text-decoration:none;font:800 11px Inter,system-ui,sans-serif;box-shadow:0 10px 25px rgba(14,31,54,.11);transition:.16s ease}#'+ID+':hover{transform:translateY(-2px);box-shadow:0 15px 30px rgba(14,31,54,.15);border-color:#b9cff2}@media(max-width:700px){#'+ID+'{top:78px;right:14px;font-size:10px;padding:9px 11px}}'
  document.head.appendChild(css)
  window.addEventListener('popstate',schedule)
  const push=history.pushState;history.pushState=function(...args){const r=push.apply(this,args);schedule();return r}
  const replace=history.replaceState;history.replaceState=function(...args){const r=replace.apply(this,args);schedule();return r}
  schedule()
}
install()
