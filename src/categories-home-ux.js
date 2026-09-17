const STYLE_ID='vl-home-categories-ux-css'
const ROOT_ID='vl-home-categories-modal'

function injectStyles(){
  if(document.getElementById(STYLE_ID))return
  const style=document.createElement('style')
  style.id=STYLE_ID
  style.textContent=`
    .vl-category-slot{padding:12px!important}
    .vl-category-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 6px 10px}
    .vl-category-toolbar-copy{display:flex;align-items:baseline;gap:8px;min-width:0}
    .vl-category-toolbar-title{font:900 12px/1 'Manrope',sans-serif;color:#09294d;letter-spacing:-.01em}
    .vl-category-toolbar-count{font:700 9px/1 'DM Sans',sans-serif;color:#8190a3;white-space:nowrap}
    .vl-category-toolbar-actions{display:flex;align-items:center;gap:6px;flex:none}
    .vl-category-nav-btn,.vl-category-all-btn{height:32px;border:1px solid #d9e5f1;background:#fff;border-radius:10px;color:#31506e;font:800 10px 'DM Sans',sans-serif;cursor:pointer;transition:.18s ease}
    .vl-category-nav-btn{width:32px;font-size:15px}
    .vl-category-all-btn{padding:0 11px;color:#216df3;border-color:#cfe0f8;background:#f5f9ff}
    .vl-category-nav-btn:hover,.vl-category-all-btn:hover{transform:translateY(-1px);border-color:#b9d2ed;background:#eef6ff}
    .vl-category-nav-btn:disabled{opacity:.35;cursor:default;transform:none}
    .vl-category-viewport{position:relative;min-width:0}
    .vl-category-viewport:after{content:'';position:absolute;right:0;top:0;bottom:0;width:30px;border-radius:0 14px 14px 0;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.98));pointer-events:none;opacity:0;transition:.2s}
    .vl-category-slot.has-overflow .vl-category-viewport:after{opacity:1}
    .vl-category-slot.at-end .vl-category-viewport:after{opacity:0}
    .vl-category-dots{display:none}
    .vl-category-modal-backdrop{position:fixed;inset:0;z-index:40000;display:grid;place-items:center;padding:18px;background:rgba(4,12,24,.62);backdrop-filter:blur(8px)}
    .vl-category-modal{width:min(900px,100%);max-height:min(82vh,760px);overflow:auto;background:#fff;border:1px solid #dce7f2;border-radius:24px;box-shadow:0 30px 100px rgba(5,29,53,.28);padding:24px}
    .vl-category-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
    .vl-category-modal-kicker{display:block;color:#216df3;font:900 9px/1 'DM Sans',sans-serif;letter-spacing:.14em;text-transform:uppercase}
    .vl-category-modal h3{margin:7px 0 4px;color:#09294d;font:900 24px/1.05 'Manrope',sans-serif;letter-spacing:-.035em}
    .vl-category-modal p{margin:0;color:#71859b;font:500 11px/1.5 'DM Sans',sans-serif}
    .vl-category-modal-close{width:36px;height:36px;border:1px solid #dce5ee;background:#f5f8fb;border-radius:11px;color:#587089;font-size:21px;cursor:pointer;flex:none}
    .vl-category-modal-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:20px}
    .vl-category-modal-grid .category-card{min-height:116px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:12px 8px;border:1px solid #e0e8f1;border-radius:15px;background:#fff;color:#09294d;text-decoration:none;transition:.18s ease}
    .vl-category-modal-grid .category-card:hover{transform:translateY(-2px);border-color:#c5dbf1;background:#f7fbff;box-shadow:0 10px 24px rgba(20,69,111,.08)}
    .vl-category-modal-grid .category-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:14px;background:#eef5ff;font-size:21px}
    .vl-category-modal-grid strong{font:900 11px/1.2 'DM Sans',sans-serif;text-align:center}
    .vl-category-modal-footer{margin-top:18px;padding-top:13px;border-top:1px solid #edf2f6;color:#8998aa;font:500 9px/1.4 'DM Sans',sans-serif}
    @media(max-width:800px){.vl-category-modal-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
    @media(max-width:560px){.vl-category-slot{padding:9px!important}.vl-category-toolbar{padding:1px 3px 8px}.vl-category-toolbar-title{font-size:11px}.vl-category-toolbar-count{display:none}.vl-category-nav-btn{display:none}.vl-category-all-btn{height:30px}.vl-category-modal{padding:18px;border-radius:20px;max-height:88vh}.vl-category-modal h3{font-size:21px}.vl-category-modal-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.vl-category-modal-grid .category-card{min-height:100px;padding:9px 5px}.vl-category-modal-grid .category-icon{width:42px;height:42px;font-size:19px}}
  `
  document.head.appendChild(style)
}

function closeModal(){document.getElementById(ROOT_ID)?.remove();document.body.classList.remove('vl-category-modal-open')}

function openModal(nav){
  closeModal()
  const cards=[...nav.querySelectorAll('.category-grid .category-card')]
  if(!cards.length)return
  const root=document.createElement('div')
  root.id=ROOT_ID
  root.innerHTML=`<div class="vl-category-modal-backdrop"><section class="vl-category-modal" role="dialog" aria-modal="true" aria-labelledby="vl-category-modal-title"><div class="vl-category-modal-head"><div><span class="vl-category-modal-kicker">Catálogo local</span><h3 id="vl-category-modal-title">Todas as categorias</h3><p>Explore tudo o que está disponível na VitrineLocal.</p></div><button type="button" class="vl-category-modal-close" aria-label="Fechar">×</button></div><div class="vl-category-modal-grid"></div><div class="vl-category-modal-footer">${cards.length} categorias disponíveis · escolha uma para ver as empresas relacionadas.</div></section></div>`
  document.body.appendChild(root)
  const grid=root.querySelector('.vl-category-modal-grid')
  cards.forEach(card=>grid.appendChild(card.cloneNode(true)))
  root.querySelector('.vl-category-modal-close').onclick=closeModal
  root.querySelector('.vl-category-modal-backdrop').onclick=e=>{if(e.target===e.currentTarget)closeModal()}
  document.body.classList.add('vl-category-modal-open')
}

function enhance(nav){
  if(!nav||nav.dataset.vlHomeCategoryUx==='1')return
  const grid=nav.querySelector('.category-grid')
  if(!grid)return
  nav.dataset.vlHomeCategoryUx='1'
  injectStyles()

  const toolbar=document.createElement('div')
  toolbar.className='vl-category-toolbar'
  toolbar.innerHTML=`<div class="vl-category-toolbar-copy"><span class="vl-category-toolbar-title">Categorias</span><span class="vl-category-toolbar-count"></span></div><div class="vl-category-toolbar-actions"><button class="vl-category-nav-btn" type="button" data-category-prev aria-label="Ver categorias anteriores">‹</button><button class="vl-category-nav-btn" type="button" data-category-next aria-label="Ver próximas categorias">›</button><button class="vl-category-all-btn" type="button">Ver todas</button></div>`
  nav.insertBefore(toolbar,grid)

  const viewport=document.createElement('div')
  viewport.className='vl-category-viewport'
  grid.parentNode.insertBefore(viewport,grid)
  viewport.appendChild(grid)

  const prev=toolbar.querySelector('[data-category-prev]')
  const next=toolbar.querySelector('[data-category-next]')
  const all=toolbar.querySelector('.vl-category-all-btn')
  const count=toolbar.querySelector('.vl-category-toolbar-count')
  const step=()=>Math.max(180,Math.round(grid.clientWidth*.72))

  function update(){
    const overflow=grid.scrollWidth>grid.clientWidth+4
    const atStart=grid.scrollLeft<=4
    const atEnd=grid.scrollLeft+grid.clientWidth>=grid.scrollWidth-4
    nav.classList.toggle('has-overflow',overflow&&!atEnd)
    nav.classList.toggle('at-end',atEnd||!overflow)
    prev.disabled=!overflow||atStart
    next.disabled=!overflow||atEnd
    count.textContent=`${grid.children.length} disponíveis`
  }

  const refresh=()=>requestAnimationFrame(update)

  prev.onclick=()=>grid.scrollBy({left:-step(),behavior:'smooth'})
  next.onclick=()=>grid.scrollBy({left:step(),behavior:'smooth'})
  all.onclick=()=>openModal(nav)
  grid.addEventListener('scroll',update,{passive:true})
  window.addEventListener('resize',update,{passive:true})
  if(window.ResizeObserver)new ResizeObserver(update).observe(grid)

  // React repopulates this same grid after the first render. Observe child changes
  // so the count, overflow state and navigation buttons always reflect the real set.
  const childObserver=new MutationObserver(refresh)
  childObserver.observe(grid,{childList:true})
  refresh()
}

function boot(){
  injectStyles()
  const scan=()=>document.querySelectorAll('.vl-category-slot').forEach(enhance)
  const observer=new MutationObserver(scan)
  observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true})
  scan()
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()})
}

boot()
