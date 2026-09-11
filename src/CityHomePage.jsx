import React,{useEffect,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {DEFAULT_PROMOTION_IMAGE,getActiveCityPromotions,projectTodayISO} from './promotion-service.js'
import './city-home.css'
import './premium-banner-carousel.css'
import './home-v2.css'
import './home-v2-fixes.css'
import './home-content-layout.css'

const URL=import.meta.env.VITE_SUPABASE_URL
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=URL&&KEY?createClient(URL,KEY):null
const FALLBACK={id:'fallback',name:'Laguna',state:'SC',slug:'laguna',active:true}
const FALLBACK_CATS=[['Restaurantes','🍽️'],['Lojas','🛍️'],['Serviços','🧰'],['Saúde','❤️'],['Beleza','✨'],['Turismo','📍'],['Automóveis','🚗'],['Imóveis','🏠'],['Pets','🐾'],['Outros','✦']]
const slugify=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
const money=value=>value==null||value===''?'':`R$ ${Number(value).toFixed(2).replace('.',',')}`
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
 const [cities,setCities]=useState([]),[city,setCity]=useState(null),[categories,setCategories]=useState([]),[businesses,setBusinesses]=useState([]),[promotions,setPromotions]=useState([]),[events,setEvents]=useState([]),[banners,setBanners]=useState([]),[bannerIndex,setBannerIndex]=useState(0),[q,setQ]=useState(''),[loading,setLoading]=useState(true),[promoError,setPromoError]=useState(''),[weather,setWeather]=useState(null),[weatherLoading,setWeatherLoading]=useState(true),[weatherError,setWeatherError]=useState('')
 useEffect(()=>{if(!db){setCity(citySlug==='laguna'?FALLBACK:{...FALLBACK,slug:citySlug,name:citySlug});setCategories(FALLBACK_CATS.map(([name,icon],i)=>({id:i,name,icon,slug:slugify(name)})));setLoading(false);return}let alive=true;db.from('cities').select('id,name,state,country,slug,active').eq('active',true).order('name').then(({data})=>{if(!alive)return;const rows=data||[];setCities(rows);setCity(rows.find(x=>x.slug===citySlug)||rows[0]||null)});return()=>{alive=false}},[citySlug])
 useEffect(()=>{if(!city?.name)return;let alive=true;let timer=null;const loadWeather=async()=>{setWeatherLoading(true);setWeatherError('');try{const result=await fetchCityWeather(city);if(!alive)return;setWeather(result)}catch(error){if(!alive)return;setWeather(null);setWeatherError(error?.message||'Clima indisponível')}finally{if(alive)setWeatherLoading(false)}};loadWeather();timer=setInterval(loadWeather,10*60*1000);return()=>{alive=false;if(timer)clearInterval(timer)}},[city?.id,city?.name,city?.state,city?.country])
 useEffect(()=>{if(!db||!city?.id)return;let alive=true;setLoading(true);setPromoError('');const load=async()=>{
  const [c,b,p,e,a]=await Promise.all([
   db.from('categories').select('id,name,slug,icon').eq('active',true).order('sort_order').order('name'),
   db.from('businesses').select('id,name,slug,short_description,cover_url,address,featured,categories(name)').eq('city_id',city.id).eq('status','active').order('featured',{ascending:false}).order('created_at',{ascending:false}).limit(8),
   getActiveCityPromotions(db,city.id,{limit:100}),
   db.from('events').select('id,title,description,image_url,event_date,start_time,location,featured').eq('city_id',city.id).eq('active',true).gte('event_date',projectTodayISO()).order('featured',{ascending:false}).order('event_date').order('start_time').limit(4),
   db.from('advertisements').select('id,title,description,image_url,target_url,priority,starts_at,ends_at').eq('city_id',city.id).eq('placement','home_banner').eq('active',true).order('priority',{ascending:false}).order('created_at',{ascending:false}).limit(20)
  ])
  if(!alive)return
  setCategories(c.data?.length?c.data:FALLBACK_CATS.map(([name,icon],i)=>({id:i,name,icon,slug:slugify(name)})))
  setBusinesses(b.data||[])
  if(p.error){setPromoError(p.error.message||'Não foi possível carregar as promoções.');setPromotions([])}else setPromotions(p.data||[])
  setEvents(e.data||[])
  const now=Date.now();const eligible=(a.data||[]).filter(x=>(!x.starts_at||new Date(x.starts_at).getTime()<=now)&&(!x.ends_at||new Date(x.ends_at).getTime()>=now));setBanners(eligible);setBannerIndex(0);setLoading(false)
 }
 load().catch(error=>{if(!alive)return;setPromoError(error?.message||'Não foi possível carregar as promoções.');setLoading(false)})
 return()=>{alive=false}},[city?.id])
 useEffect(()=>{if(banners.length<2)return;const timer=setInterval(()=>setBannerIndex(i=>(i+1)%banners.length),6000);return()=>clearInterval(timer)},[banners.length])
 useEffect(()=>{if(bannerIndex>=banners.length&&banners.length)setBannerIndex(0)},[banners.length,bannerIndex])
 const filtered=businesses.filter(b=>{const x=q.trim().toLowerCase();return !x||[b.name,b.short_description,b.description,b.address,b.categories?.name].filter(Boolean).join(' ').toLowerCase().includes(x)})
 const featuredBusinesses=filtered.filter(b=>b.featured===true)
 const businessCount=Math.min(featuredBusinesses.length,4)
 const promoCount=Math.min(promotions.length,3)
 const eventCount=Math.min(events.length,3)
 const banner=banners[bannerIndex]||null
 const base=`/${city?.slug||citySlug}`
 const go=path=>location.href=path
 const categoryHref=c=>`${base}/empresas?categoria=${encodeURIComponent(c.slug)}`
 return <div className="home-v2 vl-public-app">
  <section className="home-hero hero">
   <div className="home-hero-inner"><div className="hero-copy"><span className="hero-kicker">✦ A cidade na palma da mão</span><h1>Descubra o que <span>{city?.name||'sua cidade'}</span> tem de melhor.</h1><p>Encontre empresas, serviços, promoções e eventos perto de você — tudo em um só lugar.</p><div className="hero-search searchbox"><span className="hero-search-icon">⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="O que você procura hoje?" aria-label="O que você procura hoje"/><button onClick={()=>go(`${base}/empresas${q.trim()?`?q=${encodeURIComponent(q.trim())}`:''}`)}>Buscar</button></div><div className="hero-buttons"><a href={`${base}/empresas`}>Explorar empresas →</a><a href="/conta?new=business">Cadastre sua empresa <span>→</span></a></div><div className="hero-note">● Catálogo local de {city?.name||'sua cidade'} · atualizado por negócios locais.</div></div>
   <aside className="hero-panel" aria-label={`Resumo de ${city?.name||'sua cidade'}`}><div className="hero-panel-top"><span>• O QUE ESTÁ ROLANDO</span><span>{city?.name||'—'}</span></div><div className="hero-weather" aria-label={`Clima atual em ${city?.name||'sua cidade'}`}>{weatherLoading?<><div className="hero-weather-icon hero-weather-loading">◌</div><div className="hero-weather-copy"><strong>Carregando clima…</strong><small>Atualizando agora</small></div></>:weather?<><div className="hero-weather-icon">{weather.icon}</div><div className="hero-weather-copy"><strong>{Math.round(weather.temperature)}°C</strong><small>{weather.description}{weather.apparentTemperature!=null?` · sensação ${Math.round(weather.apparentTemperature)}°`:''}</small></div><span className="hero-weather-live">AO VIVO</span></>:<><div className="hero-weather-icon">🌡️</div><div className="hero-weather-copy"><strong>Clima indisponível</strong><small>{weatherError||'Tente novamente em instantes.'}</small></div></>}</div><div className="hero-stat"><div className="hero-stat-icon">📣</div><div><strong>{promotions.length} promoções</strong><small>Ofertas publicadas por empresas locais</small></div></div><div className="hero-stat"><div className="hero-stat-icon">📅</div><div><strong>{events.length} eventos próximos</strong><small>Veja o que acontece na cidade</small></div></div><a className="hero-panel-action" href={`${base}/eventos`}>Ver agenda →</a></aside></div>
  </section>
  <div className="home-wrap">
   <nav className="category-dock vl-category-slot" aria-label="Categorias"><div className="category-grid">{categories.map(c=><a className="category-card" key={c.id} href={categoryHref(c)}><span className="category-icon">{c.icon||'✦'}</span><strong>{c.name}</strong></a>)}</div></nav>
   <section className="home-section">{banner?<div className="ad-card"><a className="ad-media" href={banner.target_url||'#'} target={banner.target_url?'_blank':undefined} rel="noreferrer"><img src={banner.image_url||'/laguna-hero.svg'} alt={banner.title||'Banner patrocinado'}/></a><div className="ad-content"><span className="eyebrow">ESPAÇO PUBLICITÁRIO · PREMIUM</span><h2>{banner.title}</h2><p>{banner.description||'Sua marca em destaque na VitrineLocal.'}</p><a href={banner.target_url||'#'} target={banner.target_url?'_blank':undefined} rel="noreferrer">Conhecer anúncio →</a>{banners.length>1&&<div className="ad-controls"><button type="button" onClick={()=>setBannerIndex(i=>(i-1+banners.length)%banners.length)} aria-label="Banner anterior">‹</button><div className="ad-dots">{banners.map((item,i)=><button key={item.id} type="button" className={`ad-dot ${i===bannerIndex?'active':''}`} onClick={()=>setBannerIndex(i)} aria-label={`Ver banner ${i+1}`}/>)}</div><button type="button" onClick={()=>setBannerIndex(i=>(i+1)%banners.length)} aria-label="Próximo banner">›</button></div>}</div></div>:<div className="empty-v2"><h3>Espaço publicitário premium</h3><p>Este espaço é reservado para empresas que desejam colocar sua marca em destaque na página inicial.</p></div>}</section>
   {featuredBusinesses.length>0&&<section className="home-section"><div className="section-heading"><div><span className="eyebrow">NEGÓCIOS LOCAIS</span><h2>Empresas em destaque</h2><p>Conheça negócios selecionados que fazem parte da VitrineLocal.</p></div><a href={`${base}/empresas`}>Ver todas →</a></div><div className={`business-grid business-grid-${businessCount}`}>{featuredBusinesses.slice(0,4).map(b=><a className="business-card-v2" key={b.id} href={`${base}/empresa/${encodeURIComponent(b.slug)}`}><div className="business-image">{b.cover_url?<img src={b.cover_url} alt="" loading="lazy"/>:<div className="cover-placeholder">V</div>}</div><div className="business-info"><div className="business-meta"><span className="verified">✓ Verificada</span><span className="category">{b.categories?.name||'Empresa local'}</span></div><h3>{b.name}</h3><p>{b.short_description||'Conheça este negócio local.'}</p>{b.address&&<small>📍 {b.address}</small>}</div></a>)}</div></section>}
  </div>
  {promotions.length>0&&<section className="soft-section promo-section"><div className="home-wrap"><div className="section-heading"><div><span className="eyebrow">OFERTAS</span><h2>Promoções em {city?.name||'sua cidade'}</h2><p>Descubra oportunidades e ofertas de empresas locais.</p></div><a href={`${base}/promocoes`}>Ver todas →</a></div>{promoError&&<div className="empty-v2"><h3>Não foi possível carregar todas as promoções.</h3><p>{promoError}</p></div>}<div className={`promotion-grid promotion-grid-${promoCount}`}>{promotions.slice(0,3).map(p=><a className="content-card-v2" key={p.id} href={`${base}/empresa/${encodeURIComponent(p.businesses?.slug||'')}`}><div className="content-card-media"><img src={p.image_url||DEFAULT_PROMOTION_IMAGE} alt={p.title} loading="lazy"/></div><div className="content-card-body"><span className="tag">PROMOÇÃO</span><h3>{p.title}</h3><p>{p.description||'Confira esta oferta.'}</p><p><strong>{p.businesses?.name}</strong></p><div className="price-row">{p.original_price!=null&&<del>{money(p.original_price)}</del>}{p.price!=null&&<strong>{money(p.price)}</strong>}</div></div></a>)}</div></div></section>}
  {promotions.length===0&&promoError&&<section className="soft-section promo-section"><div className="home-wrap"><div className="empty-v2"><h3>Não foi possível carregar as promoções.</h3><p>{promoError}</p><a href={`${base}/promocoes`}>Abrir área de promoções →</a></div></div></section>}
  <div className="home-wrap"><section className="home-section"><div className="section-heading"><div><span className="eyebrow">AGENDA</span><h2>Próximos eventos</h2><p>O que está acontecendo e o que vem por aí na cidade.</p></div><a href={`${base}/eventos`}>Ver agenda →</a></div>{loading?<div className="empty-v2"><h3>Carregando eventos…</h3></div>:events.length?<div className={`event-grid event-grid-${eventCount}`}>{events.slice(0,3).map(e=><a className="content-card-v2" key={e.id} href={`${base}/eventos`}>{e.image_url&&<img src={e.image_url} alt="" loading="lazy"/>}<div className="content-card-body"><span className="tag">{new Date(`${e.event_date}T00:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</span><h3>{e.title}</h3><p>{e.location||'Local a confirmar'}{e.start_time?` · ${String(e.start_time).slice(0,5)}`:''}</p></div></a>)}</div>:<div className="empty-v2"><h3>Nenhum evento próximo.</h3><p>Quando novos eventos forem cadastrados, eles aparecerão aqui.</p></div>}</section><section className="home-section"><div className="commercial"><div className="commercial-copy"><span className="eyebrow">PARA EMPRESAS</span><h2>Coloque sua empresa na vitrine da cidade.</h2><p>Crie seu perfil, publique promoções, acompanhe o desempenho e apareça para quem está procurando negócios locais.</p></div><div className="commercial-actions"><a href="/conta?new=business">Cadastrar empresa</a><a href="/planos">Conhecer planos</a></div></div></section></div>
 </div>
}