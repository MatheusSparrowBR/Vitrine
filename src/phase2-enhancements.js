import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db = URL && KEY ? createClient(URL, KEY) : null
const DEFAULT_PROMOTION_IMAGE = '/promotion-default.svg'
const MEDIA_BUCKET = 'business-media'
const PROMOTION_TZ = 'America/Sao_Paulo'
const PROMOTION_OFFSET = '-03:00'
const seenBanners = new Set()
let enhancementTimer = null
let enhancementObserver = null
let bannerObserver = null
let promotionRefreshTimer = null
let promotionLoadToken = 0
let promotionRouteKey = ''
let accountPromotionListenerInstalled = false
let mediaFitInstalled = false
const cityIdCache = new Map()
let currentPromotions = []
let promotionsLoaded = false

function sessionId(){
  try{
    let id=localStorage.getItem('vl_analytics_session')
    if(!id){id=crypto.randomUUID();localStorage.setItem('vl_analytics_session',id)}
    return id
  }catch{return null}
}

async function getSession(){
  if(!db)return null
  const {data}=await db.auth.getSession()
  return data?.session||null
}

async function getCityId(){
  if(!db)return null
  const parts=location.pathname.split('/').filter(Boolean)
  const slug=parts[0]&&!['admin','planos','conta','privacidade','termos','atualizar-senha'].includes(parts[0].toLowerCase())?parts[0].toLowerCase():'laguna'
  if(cityIdCache.has(slug))return cityIdCache.get(slug)
  const {data}=await db.from('cities').select('id').eq('slug',slug).maybeSingle()
  const id=data?.id||null
  cityIdCache.set(slug,id)
  return id
}

function isPromotionCurrent(promotion, now=Date.now()){
  if(!promotion || promotion.status!=='published')return false
  const start=promotion.starts_at?new Date(promotion.starts_at).getTime():null
  const end=promotion.ends_at?new Date(promotion.ends_at).getTime():null
  if(start!==null&&!Number.isFinite(start))return false
  if(end!==null&&!Number.isFinite(end))return false
  if(start!==null&&start>now)return false
  if(end!==null&&end<=now)return false
  return true
}

function promotionKey(promotion){
  const title=String(promotion?.title||'').trim().toLowerCase()
  const businessSlug=String(promotion?.businesses?.slug||'').trim().toLowerCase()
  return `${title}|${businessSlug}`
}

function promotionNameKey(promotion){
  const title=String(promotion?.title||'').trim().toLowerCase()
  const businessName=String(promotion?.businesses?.name||'').trim().toLowerCase()
  return `${title}|${businessName}`
}

function publicPromotionRoute(){
  const parts=location.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  if(parts.length===2&&parts[1]==='promocoes')return{type:'listing',citySlug:parts[0]}
  if(parts.length===3&&parts[1]==='empresa')return{type:'business',citySlug:parts[0],businessSlug:parts[2]}
  if(parts.length===1&&!['admin','planos','conta','login','privacidade','termos','atualizar-senha'].includes(parts[0].toLowerCase()))return{type:'home',citySlug:parts[0]}
  if(parts.length===0)return{type:'home',citySlug:'laguna'}
  return null
}

async function loadCurrentPromotions(){
  if(!db)return
  const route=publicPromotionRoute()
  if(!route)return
  const token=++promotionLoadToken
  const cityId=await getCityId()
  if(!cityId)return
  try{
    const {data,error}=await db.from('promotions')
      .select('id,title,image_url,starts_at,ends_at,status,businesses!inner(id,name,slug,city_id)')
      .eq('status','published')
      .eq('businesses.city_id',cityId)
      .order('created_at',{ascending:false})
      .limit(500)
    if(token!==promotionLoadToken)return
    if(error)return
    currentPromotions=(data||[]).filter(p=>isPromotionCurrent(p))
    promotionsLoaded=true
    applyPromotionVisibility()
  }catch{}
}

function ensureDefaultPromotionImage(card,src=DEFAULT_PROMOTION_IMAGE){
  if(!card)return
  const existing=card.querySelector('img')
  if(existing){existing.src=existing.getAttribute('src')||src;return}
  const old=card.querySelector('.promotion-cover')
  const img=document.createElement('img')
  img.src=src
  img.alt='Imagem padrão de promoção VitrineLocal'
  img.loading='lazy'
  img.decoding='async'
  img.className='promotion-default-image'
  if(old)old.replaceWith(img);else card.insertAdjacentElement('afterbegin',img)
}

function removeExpiredPromotionCard(card){
  if(card&&!card.dataset.vlPromotionRemoved){
    card.dataset.vlPromotionRemoved='1'
    card.remove()
  }
}

function activeByBusinessSlug(slug){
  return currentPromotions.filter(p=>String(p.businesses?.slug||'').toLowerCase()===String(slug||'').toLowerCase())
}

function applyPromotionVisibility(){
  if(!promotionsLoaded)return
  const route=publicPromotionRoute()
  if(!route)return
  const activeKeySet=new Set(currentPromotions.map(promotionKey))
  const activeNameSet=new Set(currentPromotions.map(promotionNameKey))

  if(route.type==='listing'){
    const grid=document.querySelector('.promotion-grid')
    const cards=[...document.querySelectorAll('.promotion-card')]
    cards.forEach(card=>{
      const title=card.querySelector('.promotion-body h3')?.textContent?.trim().toLowerCase()||''
      const href=card.querySelector('.link-btn')?.getAttribute('href')||''
      const parts=href.split('/').filter(Boolean)
      const businessSlug=parts.length>=3&&parts[1]==='empresa'?decodeURIComponent(parts[2]||'').toLowerCase():''
      const key=`${title}|${businessSlug}`
      if(!activeKeySet.has(key))removeExpiredPromotionCard(card)
      else{
        const promotion=currentPromotions.find(p=>promotionKey(p)===key)
        const img=card.querySelector('img')
        if(img){img.src=promotion?.image_url||DEFAULT_PROMOTION_IMAGE;img.style.objectFit='contain'}
        else ensureDefaultPromotionImage(card,promotion?.image_url||DEFAULT_PROMOTION_IMAGE)
      }
    })
    if(grid&&!grid.querySelector('.promotion-card')){
      grid.style.display='none'
      if(!document.querySelector('[data-vl-promotion-empty]')){
        const empty=document.createElement('div')
        empty.className='empty'
        empty.dataset.vlPromotionEmpty='1'
        empty.style.marginTop='22px'
        empty.innerHTML='<h3>Nenhuma promoção disponível.</h3><p>Novas ofertas aparecerão aqui quando forem publicadas.</p>'
        grid.parentElement?.appendChild(empty)
      }
    }else if(grid){
      grid.style.display=''
      document.querySelector('[data-vl-promotion-empty]')?.remove()
    }
  }

  if(route.type==='home'){
    document.querySelectorAll('.promo-section .content-card-v2').forEach(card=>{
      const title=card.querySelector('h3')?.textContent?.trim().toLowerCase()||''
      const businessName=card.querySelector('.content-card-body p strong')?.textContent?.trim().toLowerCase()||''
      const key=`${title}|${businessName}`
      if(!activeNameSet.has(key))removeExpiredPromotionCard(card)
      else{
        const promotion=currentPromotions.find(p=>promotionNameKey(p)===key)
        const existing=card.querySelector('img')
        if(existing){existing.src=promotion?.image_url||DEFAULT_PROMOTION_IMAGE;existing.style.objectFit='contain'}
        else ensureDefaultPromotionImage(card,promotion?.image_url||DEFAULT_PROMOTION_IMAGE)
      }
    })
    const promoSection=document.querySelector('.promo-section')
    if(promoSection&&!promoSection.querySelector('.content-card-v2'))promoSection.remove()
    const promoCount=document.querySelector('.hero-panel .hero-stat:first-of-type strong')
    if(promoCount)promoCount.textContent=`${currentPromotions.length} promoções`
  }

  if(route.type==='business'){
    const activeTitles=new Set(activeByBusinessSlug(route.businessSlug).map(p=>String(p.title||'').trim().toLowerCase()))
    document.querySelectorAll('.profile-card .mini-row').forEach(row=>{
      const title=row.querySelector('strong')?.textContent?.trim().toLowerCase()||''
      if(title&&!activeTitles.has(title))row.remove()
    })
    document.querySelectorAll('.mbp-promo-card').forEach(card=>{
      const title=card.querySelector('strong')?.textContent?.trim().toLowerCase()||''
      if(title&&!activeTitles.has(title))removeExpiredPromotionCard(card)
      else{
        const promotion=currentPromotions.find(p=>String(p.businesses?.slug||'').toLowerCase()===String(route.businessSlug||'').toLowerCase()&&String(p.title||'').trim().toLowerCase()===title)
        const img=card.querySelector('img')
        if(img){img.src=promotion?.image_url||DEFAULT_PROMOTION_IMAGE;img.style.objectFit='contain'}
        else ensureDefaultPromotionImage(card,promotion?.image_url||DEFAULT_PROMOTION_IMAGE)
      }
    })
    document.querySelectorAll('.mbp-section').forEach(section=>{
      if(section.querySelector('.mbp-promo-grid')&&!section.querySelector('.mbp-promo-card'))section.remove()
    })
  }
}

function wirePromotionLifecycle(){
  if(!document.body)return
  const route=publicPromotionRoute()
  const nextKey=route?`${route.type}|${route.citySlug||''}|${route.businessSlug||''}`:''
  if(!nextKey)return
  if(nextKey!==promotionRouteKey){
    promotionRouteKey=nextKey
    currentPromotions=[]
    promotionsLoaded=false
    window.clearInterval(promotionRefreshTimer)
    loadCurrentPromotions()
    promotionRefreshTimer=window.setInterval(loadCurrentPromotions,30000)
  }else{
    applyPromotionVisibility()
  }
}

function installUniversalMediaFit(){
  if(mediaFitInstalled||typeof document==='undefined')return
  mediaFitInstalled=true
  if(document.getElementById('vl-universal-media-fit'))return
  const style=document.createElement('style')
  style.id='vl-universal-media-fit'
  style.textContent=`
    .vl-public-app img,.app img,.account-workspace-app img,.admin-promotions-page img,.admin-v2-management img,.business-card img,.business-cover-image,.business-logo,.business-image img,.profile-cover img,.profile-logo img,.profile-gallery img,.item-card img,.content-card-v2 img,.promotion-card img,.mbp-gallery img,.mbp-promo-card img,.mbp-items img,.ad-media img{object-fit:contain!important;object-position:center!important;background:#f4f7fb!important;}
    .business-cover-image,.business-image img,.profile-gallery img,.item-card img,.content-card-v2 img,.promotion-card img,.mbp-gallery img,.mbp-promo-card img,.mbp-items img,.ad-media img{width:100%!important;height:100%!important;}
    .business-logo,.profile-logo img{max-width:100%!important;max-height:100%!important;}
    .promotion-default-image{width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important;background:#f4f7fb!important;display:block!important;}
  `
  document.head.appendChild(style)
}

function localInputToISO(value){
  if(!value||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/.test(value))return null
  const d=new Date(`${value}:00${PROMOTION_OFFSET}`)
  return Number.isNaN(d.getTime())?null:d.toISOString()
}

function closeAccountPromotionForm(){
  document.querySelector('.vl-account-promotion-creator')?.remove()
}

function createAccountPromotionForm(){
  if(!db||!location.pathname.startsWith('/conta')||location.pathname==='/conta/analytics')return
  closeAccountPromotionForm()
  const host=document.querySelector('.account-content')
  if(!host)return
  const form=document.createElement('section')
  form.className='vl-account-promotion-creator'
  form.innerHTML=`
    <div class="vl-apc-head"><div><span class="vl-apc-kicker">NOVA PROMOÇÃO</span><h2>Criar promoção</h2><p>O período usa o fuso oficial do projeto: <strong>${PROMOTION_TZ} (${PROMOTION_OFFSET})</strong>. O horário digitado é gravado sem deslocamento.</p></div><button type="button" data-vl-promo-close aria-label="Fechar">×</button></div>
    <form data-vl-promo-form>
      <div class="vl-apc-grid">
        <label>Empresa<select name="business_id" required></select></label>
        <label>Título<input name="title" maxlength="120" required placeholder="Ex.: Pizza grande por R$ 39,90"/></label>
        <label class="full">Descrição<textarea name="description" rows="4" placeholder="Descreva a promoção, condições e detalhes importantes…"></textarea></label>
        <label>Preço promocional<input name="price" type="number" min="0" step="0.01" placeholder="39,90"/></label>
        <label>Preço original<input name="original_price" type="number" min="0" step="0.01" placeholder="59,90"/></label>
        <label>Início<input name="starts_at" type="datetime-local"/></label>
        <label>Final<input name="ends_at" type="datetime-local"/><small>No minuto do final, a promoção deixa de ser pública.</small></label>
      </div>
      <div class="vl-apc-upload"><div class="vl-apc-preview"><img data-vl-promo-preview src="${DEFAULT_PROMOTION_IMAGE}" alt="Prévia da promoção"/></div><div><span class="vl-apc-kicker">IMAGEM DA OFERTA</span><h3>Imagem personalizada</h3><p>Anexe a arte da própria promoção. Sem imagem, a VitrineLocal usa automaticamente a arte padrão.</p><input name="image" type="file" accept="image/*"/><small data-vl-promo-file>Imagem padrão selecionada.</small></div></div>
      <div class="vl-apc-actions"><button type="button" data-vl-promo-close class="secondary">Cancelar</button><button type="submit" class="primary">Enviar promoção</button></div>
      <div data-vl-promo-message class="vl-apc-message"></div>
    </form>`
  host.prepend(form)

  const businessSelect=form.querySelector('select[name="business_id"]')
  const imageInput=form.querySelector('input[name="image"]')
  const preview=form.querySelector('[data-vl-promo-preview]')
  const fileLabel=form.querySelector('[data-vl-promo-file]')
  const message=form.querySelector('[data-vl-promo-message]')
  const startInput=form.querySelector('input[name="starts_at"]')
  const endInput=form.querySelector('input[name="ends_at"]')

  getSession().then(async session=>{
    if(!session){businessSelect.innerHTML='<option value="">Faça login para cadastrar</option>';return}
    const {data,error}=await db.from('businesses').select('id,name,city_id,cities(name)').eq('owner_id',session.user.id).eq('status','active').order('name')
    if(error){message.textContent=error.message;message.className='vl-apc-message error';return}
    businessSelect.innerHTML='<option value="">Selecione a empresa</option>'+(data||[]).map(b=>`<option value="${b.id}">${String(b.name).replace(/"/g,'&quot;')}${b.cities?.name?` · ${String(b.cities.name).replace(/"/g,'&quot;')}`:''}</option>`).join('')
    const existing=document.querySelector('.account-business-switcher select')?.value
    if(existing&&(data||[]).some(b=>b.id===existing))businessSelect.value=existing
  })

  imageInput.addEventListener('change',()=>{
    const file=imageInput.files?.[0]
    if(!file){preview.src=DEFAULT_PROMOTION_IMAGE;fileLabel.textContent='Imagem padrão selecionada.';return}
    if(!file.type.startsWith('image/')){imageInput.value='';preview.src=DEFAULT_PROMOTION_IMAGE;fileLabel.textContent='Selecione uma imagem válida.';return}
    if(file.size>8*1024*1024){imageInput.value='';preview.src=DEFAULT_PROMOTION_IMAGE;fileLabel.textContent='A imagem deve ter no máximo 8 MB.';return}
    const url=URL.createObjectURL(file);preview.src=url;fileLabel.textContent=`${file.name} · ${(file.size/1024/1024).toFixed(1)} MB`;
  })
  form.querySelectorAll('[data-vl-promo-close]').forEach(btn=>btn.addEventListener('click',closeAccountPromotionForm))
  startInput.addEventListener('change',()=>{if(startInput.value&&endInput.value&&endInput.value<=startInput.value)endInput.value=''})
  endInput.addEventListener('change',()=>{if(startInput.value&&endInput.value&&endInput.value<=startInput.value){message.textContent='O encerramento deve ser posterior ao início.';message.className='vl-apc-message error'}})
  const promotionForm=form.querySelector('[data-vl-promo-form]')
  promotionForm.addEventListener('submit',async e=>{
    e.preventDefault();message.textContent='';message.className='vl-apc-message'
    const submittedForm=e.currentTarget
    const data=new FormData(submittedForm)
    const businessId=String(data.get('business_id')||'')
    const title=String(data.get('title')||'').trim()
    const startsValue=String(data.get('starts_at')||'')
    const endsValue=String(data.get('ends_at')||'')
    const starts=localInputToISO(startsValue),ends=localInputToISO(endsValue)
    if(!businessId||!title)return Object.assign(message,{textContent:'Preencha empresa e título.',className:'vl-apc-message error'})
    if(startsValue&&!starts||endsValue&&!ends)return Object.assign(message,{textContent:'Verifique as datas e horários.',className:'vl-apc-message error'})
    if(starts&&ends&&new Date(ends)<=new Date(starts))return Object.assign(message,{textContent:'O encerramento deve ser posterior ao início.',className:'vl-apc-message error'})
    const session=await getSession();if(!session)return Object.assign(message,{textContent:'Sua sessão expirou. Faça login novamente.',className:'vl-apc-message error'})
    const owner=await db.from('businesses').select('id').eq('id',businessId).eq('owner_id',session.user.id).eq('status','active').maybeSingle()
    if(owner.error||!owner.data)return Object.assign(message,{textContent:'Empresa não autorizada para este cadastro.',className:'vl-apc-message error'})
    let imageUrl=null;let imagePath=null
    const file=imageInput.files?.[0]
    try{
      if(file){
        const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg'
        imagePath=`${businessId}/promotions/${crypto.randomUUID()}.${ext}`
        const up=await db.storage.from(MEDIA_BUCKET).upload(imagePath,file,{cacheControl:'31536000',contentType:file.type,upsert:false})
        if(up.error)throw up.error
        imageUrl=db.storage.from(MEDIA_BUCKET).getPublicUrl(imagePath).data.publicUrl
      }
      const priceRaw=String(data.get('price')||'');const originalRaw=String(data.get('original_price')||'')
      const payload={business_id:businessId,title,description:String(data.get('description')||'').trim()||null,price:priceRaw===''?null:Number(priceRaw),original_price:originalRaw===''?null:Number(originalRaw),starts_at:starts,ends_at:ends,status:'pending_review',image_url:imageUrl,image_path:imagePath,updated_at:new Date().toISOString()}
      const insert=await db.from('promotions').insert(payload)
      if(insert.error)throw insert.error
      message.textContent='Promoção enviada para revisão. Ela aparecerá no catálogo após a publicação.';message.className='vl-apc-message success'
      submittedForm.reset();preview.src=DEFAULT_PROMOTION_IMAGE;fileLabel.textContent='Imagem padrão selecionada.'
      setTimeout(()=>location.reload(),700)
    }catch(err){
      if(imagePath)await db.storage.from(MEDIA_BUCKET).remove([imagePath]).catch(()=>{})
      message.textContent=err.message||'Não foi possível cadastrar a promoção.';message.className='vl-apc-message error'
    }
  })
}

function installAccountPromotionCreator(){
  if(accountPromotionListenerInstalled||typeof document==='undefined')return
  accountPromotionListenerInstalled=true
  document.addEventListener('click',e=>{
    if(!location.pathname.startsWith('/conta')||location.pathname==='/conta/analytics')return
    const button=e.target.closest('button')
    if(!button||!button.closest('.account-workspace-app'))return
    const text=button.textContent?.trim().toLowerCase()||''
    if(!/(promoção|promoções)/i.test(text)||!/^(adicionar|nova|criar|\+|＋)/i.test(text))return
    e.preventDefault();e.stopImmediatePropagation()
    createAccountPromotionForm()
  },true)
}

async function enhanceAccount(){
  if(!location.pathname.startsWith('/conta')||location.pathname==='/conta/analytics')return
  const host=document.querySelector('.account-content')
  const statusBadge=host?.querySelector('.account-status-badge')
  if(!host||!statusBadge||host.querySelector('.vl-phase2-review-banner'))return
  const label=statusBadge.textContent.trim().toLowerCase()
  const status=label.includes('em análise')?'pending':label.includes('rejeitada')?'rejected':label.includes('suspensa')?'suspended':null
  if(!status)return
  let reason=''
  if(status==='rejected'&&db){
    const session=await getSession()
    if(session){const {data}=await db.from('businesses').select('rejection_reason').eq('owner_id',session.user.id).eq('status','rejected').order('updated_at',{ascending:false}).limit(1).maybeSingle();reason=data?.rejection_reason||''}
  }
  const banner=document.createElement('div')
  banner.className=`vl-phase2-review-banner ${status}`
  const copy=status==='pending'?['Cadastro em análise','Sua empresa foi enviada para revisão. Enquanto isso, você pode completar seus dados e mídias.','Em análise']:status==='rejected'?['Cadastro precisa de ajustes',reason||'O administrador solicitou correções antes da publicação.','Rejeitada']:['Empresa suspensa','O perfil está temporariamente fora do catálogo público. Consulte o administrador para entender os próximos passos.','Suspensa']
  banner.innerHTML=`<div><strong>${copy[0]}</strong><p>${copy[1]}</p><div class="vl-phase2-review-tools"><a href="/conta">Continuar no painel</a></div></div><span class="vl-phase2-review-badge">${copy[2]}</span>`
  host.prepend(banner)
}

async function recordBannerImpression(element){
  if(!db||!element)return
  const title=element.querySelector('.vl-premium-copy strong')?.textContent?.trim()||element.getAttribute('aria-label')||'Banner Premium'
  const href=element.getAttribute('href')||''
  const key=`${title}|${href}`
  if(seenBanners.has(key))return
  seenBanners.add(key)
  const city_id=await getCityId()
  await db.from('analytics_events').insert({event_type:'banner_impression',session_id:sessionId(),user_id:null,city_id,business_id:null,metadata:{title,href}})
}

function wireBannerAnalytics(){
  if(!document.body)return
  document.querySelectorAll('.vl-premium-banner').forEach(recordBannerImpression)
  if(bannerObserver)return
  bannerObserver=new MutationObserver(()=>document.querySelectorAll('.vl-premium-banner').forEach(recordBannerImpression))
  bannerObserver.observe(document.getElementById('root')||document.body,{childList:true,subtree:true})
}

function runEnhancements(){
  window.clearTimeout(enhancementTimer)
  enhancementTimer=window.setTimeout(()=>{
    installUniversalMediaFit()
    installAccountPromotionCreator()
    enhanceAccount()
    wireBannerAnalytics()
    wirePromotionLifecycle()
    applyPromotionVisibility()
  },60)
}

function start(){
  runEnhancements()
  if(enhancementObserver)return
  enhancementObserver=new MutationObserver(()=>{
    window.clearTimeout(enhancementTimer)
    enhancementTimer=window.setTimeout(()=>{
      installUniversalMediaFit()
      installAccountPromotionCreator()
      enhanceAccount()
      wireBannerAnalytics()
      wirePromotionLifecycle()
      applyPromotionVisibility()
    },60)
  })
  enhancementObserver.observe(document.getElementById('root')||document.body,{childList:true,subtree:true})
  window.addEventListener('popstate',runEnhancements)
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
