import { createClient } from '@supabase/supabase-js'

const url=import.meta.env.VITE_SUPABASE_URL
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=url&&key?createClient(url,key):null
const labels={photos_limit:'Fotos/mídias',items_limit:'Produtos/serviços',promotions_limit:'Promoções',ai_posts_limit:'Gerações com IA'}
const planNames={free:'Grátis',pro:'Pro',premium:'Premium'}
let timer=0

function css(){if(document.getElementById('vl-plan-ui-css'))return;const s=document.createElement('style');s.id='vl-plan-ui-css';s.textContent=`
.vl-plan-panel{grid-column:1/-1;margin:0 0 16px;padding:18px;border:1px solid rgba(31,109,242,.18);border-radius:18px;background:linear-gradient(135deg,#fff,#f5f8ff);box-shadow:0 8px 30px rgba(15,35,65,.06)}
.vl-plan-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.vl-plan-title{font-size:18px;font-weight:900}.vl-plan-sub{font-size:12px;color:#667085;margin-top:3px}.vl-plan-badge{display:inline-flex;padding:7px 11px;border-radius:999px;background:#e9f1ff;color:#1f6df2;font-weight:900;font-size:12px}.vl-plan-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.vl-plan-meter{padding:11px;border-radius:12px;background:#fff;border:1px solid #e8edf5}.vl-plan-meter strong{display:block;font-size:12px}.vl-plan-meter span{display:block;font-size:11px;color:#667085;margin:4px 0 7px}.vl-plan-track{height:6px;border-radius:99px;background:#e9edf3;overflow:hidden}.vl-plan-track i{display:block;height:100%;background:#1f6df2;border-radius:99px}.vl-plan-warning{color:#b42318!important;font-weight:800}.vl-plan-upgrade{margin-top:12px;border:0;border-radius:10px;padding:9px 13px;background:#1f6df2;color:#fff;font-weight:800;cursor:pointer}.vl-plan-locked{opacity:.55!important;cursor:not-allowed!important;position:relative}.vl-plan-locked:after{content:'🔒 Limite do plano atingido';position:absolute;right:0;top:-7px;transform:translateY(-100%);background:#111827;color:#fff;padding:6px 9px;border-radius:8px;font-size:10px;white-space:nowrap;z-index:5}
@media(max-width:760px){.vl-plan-grid{grid-template-columns:repeat(2,1fr)}.vl-plan-top{align-items:flex-start}}
`;document.head.appendChild(s)}

async function getUsage(businessId){
 const {data:planId,error}=await db.rpc('get_effective_plan_id',{p_business_id:businessId})
 if(error||!planId)return null
 const {data:plan}=await db.from('plans').select('code,name,description,features,active').eq('id',planId).maybeSingle()
 if(!plan)return null
 const [ph,it,pr]=await Promise.all([
  db.from('business_photos').select('id',{count:'exact',head:true}).eq('business_id',businessId),
  db.from('business_items').select('id',{count:'exact',head:true}).eq('business_id',businessId),
  db.from('promotions').select('id',{count:'exact',head:true}).eq('business_id',businessId).in('status',['pending_review','published'])
 ])
 const f=plan.features||{}
 return {plan,counts:{photos:ph.count||0,items:it.count||0,promotions:pr.count||0},limits:{photos:Number(f.photos_limit??f.photos??0),items:Number(f.items_limit??f.items??0),promotions:Number(f.promotions_limit??f.promotions??0)}}
}

function selectedBusinessId(){const buttons=[...document.querySelectorAll('.business-picker button')];const active=buttons.find(x=>x.classList.contains('active'));return active?.getAttribute('data-business-id')||active?.dataset?.businessId||null}

async function render(){
 if(!db)return
 const {data:{session}}=await db.auth.getSession();if(!session)return
 const owner=await db.from('businesses').select('id').eq('owner_id',session.user.id).order('created_at',{ascending:false}).limit(20);const ids=(owner.data||[]).map(x=>x.id);if(!ids.length)return
 const id=selectedBusinessId()||ids[0];const usage=await getUsage(id);if(!usage)return
 const host=document.querySelector('.owner-layout');if(!host)return
 let panel=document.getElementById('vl-plan-panel');if(!panel){panel=document.createElement('section');panel.id='vl-plan-panel';panel.className='vl-plan-panel';host.prepend(panel)}
 const {plan,counts,limits}=usage;const code=plan.code||'free'
 const meter=(key)=>{const used=counts[key];const limit=limits[key];const pct=limit>0?Math.min(100,used/limit*100):0;const reached=limit>=0&&used>=limit;return `<div class="vl-plan-meter"><strong>${labels[`${key}_limit`]}</strong><span class="${reached?'vl-plan-warning':''}">${used}/${limit}</span><div class="vl-plan-track"><i style="width:${pct}%"></i></div></div>`}
 panel.innerHTML=`<div class="vl-plan-top"><div><div class="vl-plan-title">Seu plano e consumo</div><div class="vl-plan-sub">Os limites abaixo são aplicados também no banco de dados.</div></div><span class="vl-plan-badge">${planNames[code]||plan.name||code}</span></div><div class="vl-plan-grid">${meter('photos')}${meter('items')}${meter('promotions')}<div class="vl-plan-meter"><strong>Recursos</strong><span>${code==='free'?'Plano gratuito':'Recursos desbloqueados'}</span><div style="font-size:18px">${code==='premium'?'👑':code==='pro'?'⚡':'🔓'}</div></div></div>${code!=='premium'?'<button class="vl-plan-upgrade" id="vl-plan-upgrade">Ver planos e fazer upgrade →</button>':''}`
 panel.querySelector('#vl-plan-upgrade')?.addEventListener('click',()=>{history.pushState({},'', '/planos');dispatchEvent(new PopStateEvent('popstate'));scrollTo({top:0,behavior:'smooth'})})
 // Friendly client-side lock; database remains the authoritative enforcement layer.
 const picker=[...document.querySelectorAll('.business-picker button')];picker.forEach((b,i)=>{if(!b.dataset.businessId&&ids[i])b.dataset.businessId=ids[i]})
 const buttons=[...document.querySelectorAll('.form-actions button,.upload-box label')]
 buttons.forEach(b=>{const text=(b.textContent||'').toLowerCase();let lock=false;if(text.includes('promoção')&&limits.promotions>=0&&counts.promotions>=limits.promotions)lock=true;if(text.includes('produto')&&limits.items>=0&&counts.items>=limits.items)lock=true;if(text.includes('galeria')&&limits.photos>=0&&counts.photos>=limits.photos)lock=true;b.classList.toggle('vl-plan-locked',lock);if(lock)b.setAttribute('title','Limite do seu plano atingido. Faça upgrade para continuar.')})
}

function boot(){css();const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(render,250)});observer.observe(document.body,{subtree:true,childList:true});render();setInterval(render,10000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot()
