const IDS={tools:'vl-admin-tools-link',banners:'vl-admin-premium-edit-link'}
function isAdminRoute(){return location.pathname==='/admin'||location.pathname==='/admin/'}
function upsert(id,href,text,icon){
  let el=document.getElementById(id)
  if(!isAdminRoute()){el?.remove();return}
  if(el)return
  el=document.createElement('a');el.id=id;el.href=href;el.textContent=`${icon} ${text}`;el.setAttribute('aria-label',text);document.body.appendChild(el)
}
function update(){
  upsert(IDS.tools,'/admin/gestao','Gestão da plataforma','⚙')
  upsert(IDS.banners,'/admin/banners','Editar banners Premium','✎')
}
function schedule(){window.clearTimeout(window.__vlAdminNavTimer);window.__vlAdminNavTimer=window.setTimeout(update,180)}
function install(){
  if(document.getElementById('vl-admin-nav-style'))return
  const css=document.createElement('style');css.id='vl-admin-nav-style';css.textContent=`#${IDS.tools},#${IDS.banners}{position:fixed;top:88px;z-index:6500;display:inline-flex;align-items:center;gap:7px;padding:10px 13px;border-radius:11px;background:#fff;border:1px solid #d9e3ee;color:#18324f;text-decoration:none;font:800 11px Inter,system-ui,sans-serif;box-shadow:0 10px 25px rgba(14,31,54,.11);transition:.16s ease}#${IDS.tools}{right:24px}#${IDS.banners}{right:24px;top:136px}#${IDS.tools}:hover,#${IDS.banners}:hover{transform:translateY(-2px);box-shadow:0 15px 30px rgba(14,31,54,.15);border-color:#b9cff2}@media(max-width:700px){#${IDS.tools},#${IDS.banners}{right:14px;font-size:10px;padding:9px 11px}#${IDS.tools}{top:76px}#${IDS.banners}{top:120px}}`
  document.head.appendChild(css)
  window.addEventListener('popstate',schedule)
  const push=history.pushState;history.pushState=function(...args){const r=push.apply(this,args);schedule();return r}
  const replace=history.replaceState;history.replaceState=function(...args){const r=replace.apply(this,args);schedule();return r}
  const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true})
  schedule()
}
install()
