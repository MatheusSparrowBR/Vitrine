import React,{useEffect,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {DEFAULT_PROMOTION_IMAGE,getActiveCityPromotions,projectTodayISO} from './promotion-service.js'
import './city-home.css'
import './premium-banner-carousel.css'
import './home-v2.css'
import './home-v2-fixes.css'
import './home-content-layout.css'
import './launch-home-preview.css'

const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=URL&&KEY?createClient(URL,KEY):null
const FALLBACK={id:'fallback',name:'Laguna',state:'SC',slug:'laguna',active:true}
const FALLBACK_CATS=[['Restaurantes','🍽️'],['Lojas','🛍️'],['Serviços','🧰'],['Saúde','❤️'],['Beleza','✨'],['Turismo','📍'],['Automóveis','🚗'],['Imóveis','🏠'],['Pets','🐾'],['Outros','✦']]
const fallbackCategories=()=>FALLBACK_CATS.map(([name,icon],i)=>({id:`fallback-${i}`,name,icon,slug:String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}))
const slugify=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
const money=value=>value==null||value===''?'':`R$ ${Number(value).toFixed(2).replace('.',',')}`
const withTimeout=(promise,ms=8000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tempo limite de carregamento excedido.')),ms))])
const weatherLabel=code=>{const map={0:['☀️','Céu limpo'],1:['🌤️','Predominantemente limpo'],2:['⛅','Parcialmente nublado'],3:['☁️','Nublado'],45:['🌫️','Neblina'],48:['🌫️','Neblina com geada'],51:['🌦️','Garoa leve'],53:['🌦️','Garoa moderada'],55:['🌦️','Garoa intensa'],56:['🌧️','Garoa congelante'],57:['🌧️','Garoa congelante'],61:['🌦️','Chuva leve'],63:['🌧️','Chuva moderada'],65:['🌧️','Chuva forte'],66:['🌧️','Chuva congelante'],67:['🌧️','Chuva congelante forte'],71:['🌨️','Neve leve'],73:['🌨️','Neve moderada'],75:['❄️','Neve forte'],77:['❄️','Grãos de neve'],80:['🌦️','Pancadas leves'],81:['🌧️','Pancadas moderadas'],82:['⛈️','Pancadas fortes'],85:['🌨️','Pancadas de neve leves'],86:['❄️','Pancadas de neve fortes'],95:['⛈️','Trovoada'],96:['⛈️','Trovoada com granizo'],99:['⛈️','Trovoada com granizo']};return map[Number(code)]||['🌡️','Condição atual']}

async function fetchCityWeather(city){
 const name=String(city?.name||'').trim()
 if(!name)return null
 const state=String(city?.state||'').trim()
 const country=String(city?.country||'Brasil').trim()
 const normalizeLocation=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
 const brazilStates={AC:'Acre',AL:'Alagoas',AP:'Amapa',AM:'Amazonas',BA:'Bahia',CE:'Ceara',DF:'Distrito Federal',ES:'Espirito Santo',GO:'Goias',MA:'Maranhao',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Para',PB:'Paraiba',PR:'Parana',PE:'Pernambuco',PI:'Piaui',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondonia',RR:'Roraima',SC:'Santa Catarina',SP:'Sao Paulo',SE:'Sergipe',TO:'Tocantins'}
 const normalizedCountry=normalizeLocation(country)
 const isBrazil=!country||normalizedCountry==='brasil'||normalizedCountry==='brazil'||normalizedCountry==='br'
 const countryCode=isBrazil?'BR':(/^[A-Za-z]{2}$/.test(country)?country.toUpperCase():'')
 const stateName=isBrazil?brazilStates[state.toUpperCase()]||state:state
 const geoQuery=stateName?`${name}, ${stateName}`:name
 const geoUrl=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(geoQuery)}&count=10&language=pt&format=json${countryCode?`&countryCode=${countryCode}`:''}`
 const geoResponse=await fetch(geoUrl)
 if(!geoResponse.ok)throw new Error('Falha ao localizar a cidade para consultar o clima.')
 const geo=await geoResponse.json()
 const candidates=Array.isArray(geo?.results)?geo.results:[]
 const expectedName=normalizeLocation(name)
 const expectedState=normalizeLocation(stateName)
 const match=candidates.find(item=>{
  const itemName=normalizeLocation(item?.name)
  const itemState=normalizeLocation(item?.admin1)
  const itemCountry=String(item?.country_code||'').toUpperCase()
  const sameName=itemName===expectedName
  const sameState=!expectedState||itemState===expectedState||String(item?.admin1_code||'').toUpperCase()===state.toUpperCase()
  const sameCountry=!countryCode||itemCountry===countryCode
  return sameName&&sameState&&sameCountry
 })
 if(!match?.latitude||!match?.longitude)throw new Error('Não foi possível localizar a cidade para o clima.')
 const weatherUrl=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(match.latitude)}&longitude=${encodeURIComponent(match.longitude)}&current=temperature_2m,apparent_temperature,weather_code,is_day&temperature_unit=celsius&timezone=America%2FSao_Paulo`
 const weatherResponse=await fetch(weatherUrl)
 if(!weatherResponse.ok)throw new Error('Falha ao consultar o clima atual.')
 const data=await weatherResponse.json()
 const current=data?.current
 if(current?.temperature_2m==null)return null
 const [icon,description]=weatherLabel(current.weather_code)
 return {temperature:Number(current.temperature_2m),apparentTemperature:current.apparent_temperature==null?null:Number(current.apparent_temperature),icon,description,updatedAt:current.time||null}
}

export default function CityHomePage({citySlug='laguna'}){
 const [cities,setCities]=useState([]),[city,setCity]=useState(citySlug==='laguna'?FALLBACK:{...FALLBACK,slug:citySlug,name:citySlug}),[categories,setCategories]=useState(fallbackCategories),[businesses,setBusinesses]=useState([]),[promotions,setPromotions]=useState([]),[events,setEvents]=useState([]),[banners,setBanners]=useState([]),[bannerIndex,setBannerIndex]=useState(0),[catStart,setCatStart]=useState(0),[q,setQ]=useState(''),[loading,setLoading]=useState(true),[eventError,setEventError]=useState(''),[promoError,setPromoError]=useState(''),[weather,setWeather]=useState(null),[weatherLoading,setWeatherLoading]=useState(true),[weatherError,setWeatherError]=useState('')
 useEffect(()=>{if(!db){setLoading(false);return}let alive=true;(async()=>{try{const{data,error}=await withTimeout(db.from('cities').select('id,name,state,country,slug,active').eq('active',true).eq('slug',citySlug).maybeSingle());if(!alive)return;if(error||!data){setEventError(error?.message||'Não foi possível localizar a cidade.');setLoading(false);return}setCities([data]);setCity(data)}catch(error){if(alive){setEventError(error?.message||'Não foi possível localizar a cidade.');setLoading(false)}}})();return()=>{alive=false}},[citySlug])
 useEffect(()=>{setCatStart(0)},[city?.id])
 useEffect(()=>{if(!city?.name)return;let alive=true;let timer=null;const loadWeather=async()=>{setWeatherLoading(true);setWeatherError('');try{const result=await fetchCityWeather(city);if(!alive)return;setWeather(result)}catch(error){if(!alive)return;setWeather(null);setWeatherError(error?.message||'Clima indisponível')}finally{if(alive)setWeatherLoading(false)}};loadWeather();timer=setInterval(loadWeather,10*60*1000);return()=>{alive=false;if(timer)clearInterval(timer)}},[city?.id,city?.name,city?.state,city?.country])
 useEffect(()=>{if(!db||!city?.id||city.id==='fallback')return;let alive=true;setLoading(true);setEventError('');setPromoError('')
  const loadCategories=async()=>{try{const r=await withTimeout(db.from('categories').select('id,name,slug,icon').eq('active',true).order('sort_order').order('name'));if(!alive)return;setCategories(r.data?.length?r.data:fallbackCategories())}catch(_){if(alive)setCategories(fallbackCategories())}}
  const loadBusinesses=async()=>{try{const r=await withTimeout(db.from('public_business_directory').select('id,name,slug,short_description,cover_url,address,featured,verified,category_name,created_at').eq('city_id',city.id).order('featured',{ascending:false}).order('created_at',{ascending:false}).limit(8));if(!alive)return;setBusinesses((r.data||[]).map(row=>({...row,categories:row.category_name?{name:row.category_name}:null})))}catch(_){if(alive)setBusinesses([])}}
  const loadPromotions=async()=>{try{const r=await withTimeout(getActiveCityPromotions(db,city.id,{limit:100}));if(!alive)return;if(r.error){setPromoError(r.error.message||'Não foi possível carregar as promoções.');setPromotions([])}else setPromotions(r.data||[])}catch(error){if(alive){setPromotions([]);setPromoError(error?.message||'Não foi possível carregar as promoções.')}}}
  const loadEvents=async()=>{setLoading(true);setEventError('');try{const r=await withTimeout(db.from('events').select('id,title,description,image_url,event_date,start_time,location,featured').eq('city_id',city.id).eq('active',true).gte('event_date',projectTodayISO()).order('featured',{ascending:false}).order('event_date').order('start_time').limit(4));if(!alive)return;if(r.error){setEvents([]);setEventError(r.error.message||'Não foi possível carregar os eventos.')}else setEvents(r.data||[])}catch(error){if(alive){setEvents([]);setEventError(error?.message||'Não foi possível carregar os eventos.')}}finally{if(alive)setLoading(false)}}
  const loadBanners=async()=>{try{const r=await withTimeout(db.from('advertisements').select('id,title,description,image_url,target_url,priority,starts_at,ends_at').eq('city_id',city.id).eq('placement','home_banner').eq('active',true).order('priority',{ascending:false}).order('created_at',{ascending:false}).limit(20));if(!alive)return;const now=Date.now();const eligible=(r.data||[]).filter(x=>(!x.starts_at||new Date(x.starts_at).getTime()<=now)&&(!x.ends_at||new Date(x.ends_at).getTime()>=now));setBanners(eligible);setBannerIndex(0)}catch(_){if(alive){setBanners([]);setBannerIndex(0)}}}
  loadCategories();loadBusinesses();loadPromotions();loadEvents();loadBanners();return()=>{alive=false}},[city?.id])
 useEffect(()=>{if(banners.length<2)return;const timer=setInterval(()=>setBannerIndex(i=>(i+1)%banners.length),6000);return()=>clearInterval(timer)},[banners.length])
 useEffect(()=>{if(bannerIndex>=banners.length&&banners.length)setBannerIndex(0)},[banners.length,bannerIndex])
 const filtered=businesses.filter(b=>{const x=q.trim().toLowerCase();return !x||[b.name,b.short_description,b.description,b.address,b.categories?.name].filter(Boolean).join(' ').toLowerCase().includes(x)})
 const featuredBusinesses=filtered.filter(b=>b.featured===true)
 const businessCount=Math.min(featuredBusinesses.length,4)
 const promoCount=Math.min(promotions.length,3)
 const eventCount=Math.min(events.length,3)
 const banner=banners[bannerIndex]||null
 const base=`/${city?.slug||citySlug}`
 const visibleCats=categories.slice(catStart,catStart+Math.min(7,categories.length))
 const maxCatStart=Math.max(0,categories.length-7)
 const go=path=>location.href=path
 const categoryHref=c=>base+'/empresas?categoria='+encodeURIComponent(c.slug)
 const quickCategories=categories.slice(0,4)
 const todayLabel=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date()).replace('.','').toUpperCase()
 const formatEventDate=value=>{const date=new Date(`${value}T00:00:00`);return Number.isNaN(date.getTime())?{day:'--',month:'--'}:{day:date.toLocaleDateString('pt-BR',{day:'2-digit'}),month:date.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase()}}
 return <div className='lvp-page'>
  <main>
   <section className='lvp-hero'>
    <div className='lvp-hero-bg'></div>
    <div className='lvp-hero-inner'>
     <div className='lvp-hero-copy'>
      <span className='lvp-kicker'>✦ A cidade na palma da mão</span>
      <h1>Descubra o que <span>{city?.name||'sua cidade'}</span> tem de melhor.</h1>
      <p>Encontre empresas, serviços, promoções e eventos perto de você — tudo em um só lugar.</p>
      <form className='lvp-search' onSubmit={e=>{e.preventDefault();go(base+'/empresas'+(q.trim()?'?q='+encodeURIComponent(q.trim()):''))}}>
       <span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder='O que você procura hoje?' aria-label='O que você procura hoje?'/><button type='submit'>Buscar</button>
      </form>
      <div className='lvp-quick'>{quickCategories.map(c=><a key={c.id} href={categoryHref(c)}>{c.name}</a>)}</div>
      <div className='lvp-note'>● Catálogo local de {city?.name||'sua cidade'} · atualizado por negócios da cidade.</div>
     </div>
     <aside className='lvp-hero-card'>
      <div className='lvp-mini-head'><span>HOJE EM {String(city?.name||'CIDADE').toUpperCase()}</span><strong>{todayLabel}</strong></div>
      <div className='lvp-weather hero-weather'><span className='lvp-weather-icon'>{weatherLoading?'◌':weather?.icon||'🌡️'}</span><div><b>{weatherLoading?'Carregando clima…':weather?.temperature!=null?`${Math.round(weather.temperature)}°C`:'Clima indisponível'}</b><small>{weather?.description?`${city?.name||'Cidade'} · ${weather.description}${weather.apparentTemperature!=null?` · sensação ${Math.round(weather.apparentTemperature)}°C`:''}`:(weatherError||'Atualização em tempo real')}</small></div><span className='lvp-live-dot'>{weather?'AO VIVO':'INFO'}</span></div>
      <div className='lvp-mini-stat'><span className='lvp-mini-icon'>🏪</span><div><b>{businesses.length} empresas cadastradas</b><small>Negócios disponíveis no catálogo local</small></div></div>
      <div className='lvp-mini-stat'><span className='lvp-mini-icon'>🏷️</span><div><b>{promotions.length} promoções ativas</b><small>Ofertas publicadas por empresas locais</small></div></div>
      <div className='lvp-mini-stat'><span className='lvp-mini-icon'>📅</span><div><b>{events.length} eventos próximos</b><small>Programação cadastrada na cidade</small></div></div>
      <a className='lvp-mini-cta' href={base+'/empresas'}>Explorar empresas →</a>
     </aside>
    </div>
   </section>
   <section id='categorias' className='lvp-wrap lvp-categories'>
    <div className='lvp-section-head'><div><span className='lvp-eyebrow'>EXPLORE</span><h2>Encontre por categoria</h2><p>Use as categorias cadastradas no VitrineLocal para encontrar o que precisa.</p></div><a href={base+'/empresas'}>Ver todas →</a></div>
    <div className='lvp-cat-box'>
     <button className='lvp-arrow' type='button' onClick={()=>setCatStart(v=>Math.max(0,v-1))} disabled={catStart===0} aria-label='Categorias anteriores'>‹</button>
     <div className='lvp-cat-grid'>{visibleCats.map(c=><a href={categoryHref(c)} key={c.id}><span>{c.icon||'✦'}</span><b>{c.name}</b></a>)}</div>
     <button className='lvp-arrow' type='button' onClick={()=>setCatStart(v=>Math.min(maxCatStart,v+1))} disabled={catStart>=maxCatStart} aria-label='Próximas categorias'>›</button>
    </div>
    <div className='lvp-category-count'>{categories.length} {categories.length===1?'categoria disponível':'categorias disponíveis'}</div>
   </section>
   <section className='lvp-wrap lvp-sponsored-wrap'>
    {banner?<a className='lvp-sponsored' href={banner.target_url||'#'} target={banner.target_url?'_blank':undefined} rel='noreferrer'>
      <div className='lvp-sponsored-image'><img src={banner.image_url||'/laguna-hero.svg'} alt={banner.title||'Espaço publicitário'}/></div>
      <div className='lvp-sponsored-copy'><span className='lvp-sponsored-label'>DESTAQUE PATROCINADO</span><h2>{banner.title}</h2><p>{banner.description||'Publicidade publicada pela plataforma.'}</p><strong>Ver destaque →</strong></div>
      {banners.length>1&&<span className='lvp-sponsored-badge'>{bannerIndex+1}/{banners.length}</span>}
    </a>:<div className='lvp-sponsored lvp-empty-sponsored'><div className='lvp-sponsored-copy'><span className='lvp-sponsored-label'>ESPAÇO PREMIUM</span><h2>Seu negócio pode aparecer aqui.</h2><p>Este espaço só é preenchido quando um anúncio premium é cadastrado e publicado no sistema.</p><a href='/conta/publicidade'>Conhecer publicidade →</a></div></div>}
   </section>
   <section id='explorar' className='lvp-wrap lvp-featured'>
    <div className='lvp-section-head'><div><span className='lvp-eyebrow'>NEGÓCIOS CADASTRADOS</span><h2>Empresas em destaque</h2><p>Veja apenas empresas reais cadastradas no catálogo desta cidade.</p></div><a href={base+'/empresas'}>Ver todas →</a></div>
    {featuredBusinesses.length?<div className={`lvp-business-grid ${featuredBusinesses.length===1?'lvp-business-grid-single':''}`}>{featuredBusinesses.slice(0,4).map(b=><a href={base+'/empresa/'+encodeURIComponent(b.slug)} className='lvp-business-card' key={b.id}>
      <div className='lvp-business-image'>{b.cover_url?<img src={b.cover_url} alt='' loading='lazy'/>:<div className='lvp-business-placeholder'>V</div>}{b.verified&&<span className="verified">✓ Verificada</span>}</div>
      <div className='lvp-business-body'><span className='lvp-card-cat'>{b.categories?.name||'Empresa local'}</span><h3>{b.name}</h3><p>{b.short_description||'Conheça este negócio local.'}</p>{b.address&&<small className='lvp-card-address'>📍 {b.address}</small>}<span className='lvp-card-link'>Ver empresa →</span></div>
    </a>)}</div>:<div className='lvp-empty-panel'><h3>Nenhuma empresa em destaque cadastrada.</h3><p>Quando uma empresa for marcada como destaque no sistema, ela aparecerá aqui.</p><a href={base+'/empresas'}>Abrir catálogo de empresas →</a></div>}
   </section>
   {promotions.length>0&&<section id='promocoes' className='lvp-soft'>
    <div className='lvp-wrap'><div className='lvp-section-head'><div><span className='lvp-eyebrow'>OFERTAS</span><h2>Promoções em {city?.name||'sua cidade'}</h2><p>Somente promoções ativas cadastradas no sistema.</p></div><a href={base+'/promocoes'}>Ver todas →</a></div>
     {promoError?<div className='lvp-empty-panel'><h3>Não foi possível carregar as promoções.</h3><p>{promoError}</p></div>:<div className={`lvp-promo-grid ${promotions.length===1?'lvp-promo-grid-single':''}`}>{promotions.slice(0,3).map(p=><a href={base+'/empresa/'+encodeURIComponent(p.businesses?.slug||'')} className='lvp-promo-card' key={p.id}>
       <div className='lvp-promo-image'><img src={p.image_url||DEFAULT_PROMOTION_IMAGE} alt={p.title||'Promoção'} loading='lazy'/><strong>PROMOÇÃO</strong></div>
       <div className='lvp-promo-body'><span>{p.businesses?.name||'Empresa local'}</span><h3>{p.title}</h3><p>{p.description||'Confira esta oferta.'}</p><div className='lvp-price'>{p.price!=null?money(p.price):'Confira'}{p.original_price!=null&&<del>{money(p.original_price)}</del>}</div><b>Ver oferta →</b></div>
      </a>)}</div>}
    </div>
   </section>}
   <section id='eventos' className='lvp-wrap lvp-events'>
    <div className='lvp-section-head'><div><span className='lvp-eyebrow'>AGENDA LOCAL</span><h2>O que está acontecendo em {city?.name||'sua cidade'}</h2><p>Eventos publicados e ainda válidos para a cidade.</p></div><a href={base+'/eventos'}>Ver agenda →</a></div>
    {loading?<div className='lvp-empty-panel'><h3>Carregando agenda…</h3></div>:eventError?<div className='lvp-empty-panel'><h3>Não foi possível carregar os eventos.</h3><p>{eventError}</p><a href={base+'/eventos'}>Abrir agenda →</a></div>:events.length?<div className='lvp-event-list'>{events.slice(0,3).map(e=>{const d=formatEventDate(e.event_date);return <a className='lvp-event' href={base+'/eventos'} key={e.id}><div className='lvp-date'><b>{d.day}</b><span>{d.month}</span></div><div><h3>{e.title}</h3><p>📍 {e.location||'Local a confirmar'}{e.start_time?` · 🕐 ${String(e.start_time).slice(0,5)}`:''}</p></div><span className='lvp-event-arrow'>→</span></a>})}</div>:<div className='lvp-empty-panel'><h3>Nenhum evento próximo cadastrado.</h3><p>Quando novos eventos forem cadastrados, eles aparecerão aqui.</p><a href={base+'/eventos'}>Abrir agenda →</a></div>}
   </section>
   <section className='lvp-business-cta-section'>
    <div className='lvp-wrap lvp-business-cta-wrap'><div><span className='lvp-eyebrow'>PARA EMPRESAS</span><h2>Sua empresa precisa ser encontrada.</h2><p>Crie seu espaço no VitrineLocal e coloque seu negócio na frente de quem está procurando o que você oferece.</p><div className='lvp-business-points'><span>✓ Perfil da empresa</span><span>✓ Produtos e serviços</span><span>✓ Promoções</span><span>✓ Mais visibilidade</span></div></div><a href='/conta?new=business' className='lvp-business-cta-button'>Cadastrar minha empresa →</a></div>
   </section>
  </main>
  <footer className='lvp-footer'>
   <div className='lvp-wrap lvp-footer-grid'>
    <div>
     <img src='/vitrine-local-header-logo.svg' alt='VitrineLocal'/>
     <p>A cidade em um só lugar.</p>
    </div>
    <div>
     <b>Explorar</b>
     <a href={base+'/empresas'}>Empresas</a>
     <a href={base+'/promocoes'}>Promoções</a>
     <a href={base+'/eventos'}>Eventos</a>
     <a href={base+'#categorias'}>Categorias</a>
    </div>
    <div>
     <b>Para empresas</b>
     <a href='/conta?new=business'>Cadastrar empresa</a>
     <a href='/conta/publicidade'>Publicidade</a>
     <a href='/planos'>Planos</a>
    </div>
    <div>
     <b>VitrineLocal</b>
     <a href='/'>Início</a>
     <a href='mailto:contato@vitrinelocal.net'>Contato</a>
     <a href='/privacidade'>Privacidade</a>
     <a href='/termos'>Termos</a>
    </div>
   </div>
   <div className='lvp-footer-bottom'>© 2026 VitrineLocal · {city?.name||'Laguna'}, {city?.state||'SC'}</div>
  </footer>
 </div>
}
