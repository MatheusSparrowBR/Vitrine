import { createClient } from '@supabase/supabase-js'

const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase=URL&&KEY?createClient(URL,KEY):null
const CITY_KEY='vitrinelocal:selected-city'
const state={lastProfile:''}

function parts(){return window.location.pathname.split('/').filter(Boolean).map(decodeURIComponent)}
function route(){const p=parts();if(p[0]==='planos'||p[0]==='admin')return {kind:p[0]};if(!p[0])return {kind:'home',city:localStorage.getItem(CITY_KEY)||'laguna'};if(p[1]==='empresa'&&p[2])return {kind:'business',city:p[0],slug:p[2]};if(p[1]==='promocoes')return {kind:'promotions',city:p[0]};return {kind:'city',city:p[0]}}
function setMeta(name,content){let el=document.querySelector(`meta[name="${name}"]`);if(!el){el=document.createElement('meta');el.name=name;document.head.appendChild(el)}el.content=content}
function setCanonical(href){let el=document.querySelector('link[rel="canonical"]');if(!el){el=document.createElement('link');el.rel='canonical';document.head.appendChild(el)}el.href=href}
function saveCity(slug){if(slug)localStorage.setItem(CITY_KEY,slug)}
async function loadBusiness(slug){if(!supabase)return null;const {data}=await supabase.from('businesses').select('id,name,slug,short_description,description,cities(name,state,slug),categories(name)').eq('slug',slug).eq('status','active').maybeSingle();return data||null}

function patchInternalNavigation(){
 document.addEventListener('click',event=>{
   const button=event.target.closest('button')
   if(button){const text=(button.textContent||'').trim();const r=route();if(text==='Explorar'&&r.city){history.pushState({},'',`/${r.city}`)} if(text==='Promoções'&&r.city){history.pushState({},'',`/${r.city}/promocoes`)} if(text==='Minha conta'){} }
 },true)
 const observer=new MutationObserver(async()=>{
   const profile=document.querySelector('.profile-hero')
   const h1=profile?.querySelector('h1')
   if(!h1)return
   const name=h1.textContent.trim()
   if(name===state.lastProfile)return
   state.lastProfile=name
   const r=route();const city=r.city||localStorage.getItem(CITY_KEY)||'laguna'
   const data=await loadBusinessByName(name,city)
   if(data){const target=`/${city}/empresa/${data.slug}`;if(window.location.pathname!==target)history.replaceState({},'',target);updateBusinessMeta(data)}
 })
 observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true})
}
async function loadBusinessByName(name,citySlug){if(!supabase)return null;const city=await supabase.from('cities').select('id,slug,name,state').eq('slug',citySlug).maybeSingle();if(!city.data)return null;const {data}=await supabase.from('businesses').select('id,name,slug,short_description,description,cities(name,state,slug),categories(name)').eq('name',name).eq('city_id',city.data.id).eq('status','active').maybeSingle();return data||null}
function updateBusinessMeta(data){const city=data.cities?.name||'sua cidade';document.title=`${data.name} | VitrineLocal ${city}`;setMeta('description',`${data.short_description||data.description||'Conheça esta empresa local.'} — ${data.name} em ${city}.`);setCanonical(window.location.href)}
async function openDirectBusiness(){const r=route();if(r.kind!=='business')return;saveCity(r.city);const data=await loadBusiness(r.slug);if(!data)return;
 const clickExplore=()=>{const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').trim()==='Explorar');if(b){b.click();return true}return false}
 const tryOpen=()=>{const cards=[...document.querySelectorAll('.business-card')];const card=cards.find(c=>(c.querySelector('h3')?.textContent||'').trim()===data.name);if(card){card.click();updateBusinessMeta(data);return true}return false}
 let tries=0;const timer=setInterval(()=>{tries++;if(!document.querySelector('.business-card'))clickExplore();if(tryOpen()||tries>30)clearInterval(timer)},250)
}
async function openDirectPromotions(){const r=route();if(r.kind!=='promotions')return;saveCity(r.city);let tries=0;const timer=setInterval(()=>{tries++;const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').trim()==='Promoções');if(b){b.click();clearInterval(timer)}else if(tries>30)clearInterval(timer)},250)}
async function boot(){const r=route();if(r.city)saveCity(r.city);if(r.kind==='home'&&window.location.pathname==='/')history.replaceState({},'',`/${localStorage.getItem(CITY_KEY)||'laguna'}`);if(r.kind!=='planos'&&r.kind!=='admin'){const city=r.city||localStorage.getItem(CITY_KEY)||'laguna';const cityData=await (supabase?supabase.from('cities').select('id,name,state,slug').eq('slug',city).eq('active',true).maybeSingle():Promise.resolve({data:null}));if(cityData?.data){document.title=`VitrineLocal — ${cityData.data.name} | Empresas, promoções e novidades`;setMeta('description',`Encontre empresas, promoções, serviços e novidades de ${cityData.data.name} - ${cityData.data.state}.`);setCanonical(window.location.href)}}
 patchInternalNavigation();setTimeout(openDirectBusiness,300);setTimeout(openDirectPromotions,300)
 window.addEventListener('popstate',()=>window.location.reload())
}
boot()
