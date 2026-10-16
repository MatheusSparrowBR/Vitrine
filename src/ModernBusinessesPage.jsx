import React,{useEffect,useMemo,useState} from 'react'
import {supabase as db} from './supabase-client.js'
import {loadPublicBusinessReviewSummaries} from './public-review-summary.js'
import {getOpenStatus} from './business-hours-utils.js'
import './search-featured.css'
import Icon,{isOfficialIcon} from './ui-icons.jsx'
import {PageTrail} from './SiteChrome.jsx'
import {limparTexto} from './site-context.js'

const fallbackCats=[['Restaurantes','store'],['Lojas','bag'],['Serviços','wrench'],['Saúde','heart'],['Beleza','star'],['Turismo','pin'],['Automóveis','briefcase'],['Imóveis','grid'],['Pets','heart'],['Outros','grid']]
const iconForCategory=(name,selected)=>{if(isOfficialIcon(selected))return selected;const n=String(name||'').toLowerCase();if(n.includes('restaur')||n.includes('café')||n.includes('lanche'))return'store';if(n.includes('loja')||n.includes('mercado')||n.includes('comérc'))return'bag';if(n.includes('servi'))return'wrench';if(n.includes('saúde'))return'heart';if(n.includes('beleza'))return'star';if(n.includes('turis'))return'pin';if(n.includes('auto'))return'briefcase';if(n.includes('imóv'))return'grid';if(n.includes('pet'))return'heart';return'grid'}
const stars=avg=>Array.from({length:5},(_,i)=><Icon key={i} name="star" size={12} filled={i<Math.round(Number(avg)||0)}/>)
const normalizeSearchText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
const isOpenNow=hours=>getOpenStatus(hours).open
const searchScore=(business,term,boosted=false)=>{const q=normalizeSearchText(term);if(!q)return 0;const name=normalizeSearchText(business.name),category=normalizeSearchText(business.categories?.name),short=normalizeSearchText(business.short_description),description=normalizeSearchText(business.description),address=normalizeSearchText(business.address),neighborhood=normalizeSearchText(business.neighborhood);let score=0;if(name===q)score+=140;else if(name.startsWith(q))score+=110;else if(name.includes(q))score+=85;if(category===q)score+=80;else if(category.includes(q))score+=55;if(short.includes(q))score+=35;if(description.includes(q))score+=20;if(address.includes(q)||neighborhood.includes(q))score+=12;if(boosted)score+=90;return score}

function syncQuery(values){
 const url=new URL(location.href)
 if(values.q!==undefined){if(values.q)url.searchParams.set('q',values.q);else url.searchParams.delete('q')}
 if(values.cat!==undefined){if(values.cat)url.searchParams.set('categoria',values.cat);else url.searchParams.delete('categoria')}
 if(values.need!==undefined){if(values.need)url.searchParams.set('necessidade',values.need);else url.searchParams.delete('necessidade')}
 if(values.sort!==undefined){if(values.sort&&values.sort!=='relevancia')url.searchParams.set('ordenar',values.sort);else url.searchParams.delete('ordenar')}
 history.replaceState(null,'',url.pathname+(url.search?'?'+url.searchParams.toString():''))
}

const TONES=[['#e8f1ff','#216df3'],['#e9f8ef','#16a34a'],['#fff4e5','#d97706'],['#fdecef','#e11d48'],['#f1ebff','#7c3aed'],['#e6f7f9','#0891b2'],['#fef9e3','#ca8a04'],['#eef2f7','#475569']]
const toneFor=name=>{let h=0;for(const ch of String(name||''))h=(h*31+ch.charCodeAt(0))>>>0;const[bg,fg]=TONES[h%TONES.length];return{'--cat-bg':bg,'--cat-fg':fg}}
export default function ModernBusinessesPage({citySlug='laguna',categorySlug=''}){
 const[city,setCity]=useState(null)
 const[businesses,setBusinesses]=useState([])
 const[categories,setCategories]=useState([])
 const[needs,setNeeds]=useState([])
 const[needCategorySlugs,setNeedCategorySlugs]=useState({})
 const[ratings,setRatings]=useState({})
 const[cat,setCat]=useState('')
 const[need,setNeed]=useState('')
 const[q,setQ]=useState('')
 const[sort,setSort]=useState('relevancia')
 const[quickFilters,setQuickFilters]=useState({open:false,delivery:false,pickup:false,dine:false,verified:false,searchFeatured:false})
 const[showMoreFilters,setShowMoreFilters]=useState(false)
 const[loading,setLoading]=useState(true)

 useEffect(()=>{let live=true;(async()=>{
  const params=new URLSearchParams(location.search)
  const initialCat=categorySlug||params.get('categoria')||params.get('category')||''
  const initialNeed=params.get('necessidade')||params.get('need')||''
  const initialQ=params.get('q')||''
  const initialSort=['relevancia','recentes','avaliacao'].includes(params.get('ordenar'))?params.get('ordenar'):'relevancia'
  const initialFilters={open:params.get('aberto')==='1',delivery:params.get('delivery')==='1',pickup:params.get('retirada')==='1',dine:params.get('consumo')==='1',verified:params.get('verificada')==='1',searchFeatured:params.get('busca_destaque')==='1'}
  setQ(initialQ);setSort(initialSort);setCat(initialCat);setNeed(initialNeed);setQuickFilters(initialFilters)
  try{sessionStorage.setItem('vl_catalog_return_url',location.pathname+location.search)}catch{}
  if(!db){setCity({id:'fallback',name:'Laguna',state:'SC',slug:citySlug});setCategories(fallbackCats.map(([name,icon],i)=>({id:i,name,icon,slug:name.toLowerCase()})));setCat(initialCat);setLoading(false);return}
  const{data:c}=await db.from('cities').select('id,name,state,slug,active').eq('slug',citySlug).eq('active',true).maybeSingle()
  if(!live)return
  setCity(c||null)
  if(!c){setLoading(false);return}
  const[b,cs,ns,ncs]=await Promise.all([
   db.from('public_business_directory').select('id,name,slug,short_description,description,cover_url,logo_url,address,neighborhood,phone,whatsapp,featured,verified,category_name,category_slug,created_at,search_featured,opening_hours,has_delivery,has_pickup,has_dine_in').eq('city_id',c.id).order('featured',{ascending:false}).order('created_at',{ascending:false}).limit(100),
   db.from('categories').select('id,name,slug,icon').eq('active',true).order('sort_order').order('name'),
   db.from('business_needs').select('id,name,slug,icon,description,sort_order').eq('active',true).order('sort_order').order('name'),
   db.from('category_needs').select('category_id,need_id')
  ])
  const loaded=cs.data?.length?cs.data:fallbackCats.map(([name,icon],i)=>({id:i,name,icon,slug:name.toLowerCase()}))
  const loadedNeeds=ns.data||[]
  const needMap={}
  ;(ncs.data||[]).forEach(link=>{const category=loaded.find(row=>row.id===link.category_id);const need=loadedNeeds.find(row=>row.id===link.need_id);if(category?.slug&&need?.slug){(needMap[need.slug]??=[]).push(category.slug)}})
  const publicBusinesses=(b.data||[]).map(row=>({...row,categories:row.category_name?{name:row.category_name,slug:row.category_slug}:null}))
  const reviewMap=await loadPublicBusinessReviewSummaries(db,publicBusinesses.map(row=>row.id))
  if(!live)return
  setBusinesses(publicBusinesses);setRatings(reviewMap);setCategories(loaded);setNeeds(loadedNeeds);setNeedCategorySlugs(needMap);setCat(initialCat&&loaded.some(x=>x.slug===initialCat)?initialCat:'');setNeed(initialNeed&&loadedNeeds.some(x=>x.slug===initialNeed)?initialNeed:'');setLoading(false)
 })();return()=>{live=false}},[citySlug])

 useEffect(()=>{try{sessionStorage.setItem('vl_catalog_return_url',location.pathname+location.search)}catch{}},[cat,q,sort])

 const items=useMemo(()=>{
  const term=q.trim().toLowerCase()
  const filtered=businesses.filter(b=>{
   const matchesText=!term||[b.name,b.short_description,b.description,b.address,b.neighborhood,b.categories?.name].filter(Boolean).join(' ').toLowerCase().includes(term)
   const matchesCat=!cat||b.categories?.slug===cat
   const matchesNeed=!need||(needCategorySlugs[need]||[]).includes(b.categories?.slug)
   const matchesOpen=!quickFilters.open||isOpenNow(b.opening_hours)
   const matchesDelivery=!quickFilters.delivery||b.has_delivery
   const matchesPickup=!quickFilters.pickup||b.has_pickup
   const matchesDine=!quickFilters.dine||b.has_dine_in
   const matchesVerified=!quickFilters.verified||b.verified
   const matchesSearchFeatured=!quickFilters.searchFeatured||b.search_featured
   return matchesText&&matchesCat&&matchesNeed&&matchesOpen&&matchesDelivery&&matchesPickup&&matchesDine&&matchesVerified&&matchesSearchFeatured
  })
  return [...filtered].sort((a,b)=>{
   if(term){const scoreA=searchScore(a,term,Boolean(a.search_featured)),scoreB=searchScore(b,term,Boolean(b.search_featured));if(scoreB!==scoreA)return scoreB-scoreA}
   if(sort==='recentes')return new Date(b.created_at||0)-new Date(a.created_at||0)
   if(sort==='avaliacao')return (ratings[b.id]?.avg||0)-(ratings[a.id]?.avg||0)
   const featuredScore=(b.featured?1:0)-(a.featured?1:0)
   if(featuredScore)return featuredScore
   return (ratings[b.id]?.avg||0)-(ratings[a.id]?.avg||0)
  })
 },[businesses,q,cat,need,needCategorySlugs,sort,ratings,quickFilters])

 const setCategory=next=>{
  setCat(next)
  if(next){
    const target=`/${citySlug}/empresas/categoria/${encodeURIComponent(next)}`
    const currentQuery=new URLSearchParams(location.search)
    const preserved=[]
    ;['q','necessidade','ordenar','aberto','delivery','retirada','consumo','verificada','busca_destaque'].forEach(key=>{const value=currentQuery.get(key);if(value)preserved.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)})
    location.href=target+(preserved.length?'?'+preserved.join('&'):'')
    return
  }
  location.href=`/${citySlug}/empresas`
}
 const setNeedFilter=next=>{setNeed(next);syncQuery({need:next})}
 const setSearch=value=>{setQ(value);syncQuery({q:value})}
 useEffect(()=>{if(new URLSearchParams(location.search).get('buscar')!=='1')return;const t=setTimeout(()=>{const el=document.getElementById('vl-busca-empresas');if(el){el.focus({preventScroll:true});el.scrollIntoView({block:'center',behavior:'smooth'})}},350);return()=>clearTimeout(t)},[])
 const setSortValue=value=>{setSort(value);syncQuery({sort:value})}
 const updateQuickFilter=(key)=>{const next={...quickFilters,[key]:!quickFilters[key]};setQuickFilters(next);const params={};Object.entries(next).forEach(([k,v])=>{if(v)params[{open:'aberto',delivery:'delivery',pickup:'retirada',dine:'consumo',verified:'verificada',searchFeatured:'busca_destaque'}[k]]='1'});const url=new URL(location.href);Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));['aberto','delivery','retirada','consumo','verificada','busca_destaque'].filter(k=>!Object.values(params).includes('1')).forEach(k=>url.searchParams.delete(k));history.replaceState(null,'',url.pathname+(url.search?'?'+url.searchParams.toString():''))}
 const clearFilters=()=>{setQ('');setCat('');setNeed('');setSort('relevancia');const reset={open:false,delivery:false,pickup:false,dine:false,verified:false,searchFeatured:false};setQuickFilters(reset);location.href=`/${city.slug}/empresas`}
 const returnUrl=()=>{try{const stored=sessionStorage.getItem('vl_catalog_return_url');return stored&&stored.startsWith(`/${city.slug}/empresas`)?stored:`/${city.slug}/empresas`}catch{return`/${city.slug}/empresas`}}

 if(loading)return <div className="mbl-shell"><main className="mbl-page" aria-busy="true"><span className="sr-only" role="status">Carregando empresas…</span><div className="vl-skel vl-skel-title"/><div className="vl-skel vl-skel-bar"/><section className="mbl-grid vl-bgrid" aria-hidden="true">{[0,1,2,3,4,5].map(i=><div className="vl-bcard vl-skel-card" key={i}><div className="vl-skel vl-skel-media"/><div className="vl-skel-lines"><i className="vl-skel"/><i className="vl-skel"/><i className="vl-skel"/></div></div>)}</section></main></div>
 if(!city)return <main className="mbl-shell"><div className="mbl-error"><h1>Cidade não encontrada.</h1><a href="/laguna">Voltar</a></div></main>

 const selectedCategory=categories.find(item=>item.slug===cat)||null
 const catalogHeading=selectedCategory?`${selectedCategory.name} em ${city.name}`:`Empresas em ${city.name}`
 const catalogDescription=selectedCategory?`Encontre ${selectedCategory.name.toLowerCase()} em ${city.name}. Veja empresas locais, contatos, serviços e informações atualizadas.`:'Encontre negócios e serviços da cidade.'

 return <div className="mbl-shell"><main className="mbl-page">
  <PageTrail items={[{label:city.name,href:`/${city.slug}`},selectedCategory?{label:'Empresas',href:`/${city.slug}/empresas`}:{label:'Empresas',current:true},selectedCategory&&{label:selectedCategory.name,current:true}]}/>
  <section className="mbl-hero"><div><h1>{catalogHeading}</h1><p>{catalogDescription}</p></div><div className="mbl-result-count"><strong>{items.length}</strong><span>{items.length===1?'resultado':'resultados'}</span></div></section>
  <section className="mbl-toolbar" aria-label="Filtros do catálogo">
   <div className="mbl-toolbar-sticky">
    <div className="mbl-toolbar-row">
     <div className="mbl-search-large"><Icon name="search" size={18}/><input id="vl-busca-empresas" type="search" enterKeyHint="search" value={q} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empresa, serviço ou bairro" aria-label="Buscar no catálogo"/></div>
     {(q||cat||need||Object.values(quickFilters).some(Boolean)||sort!=='relevancia')&&<button className="mbl-clear" type="button" onClick={clearFilters}>Limpar</button>}
     <button className="mbl-filters-toggle" type="button" onClick={()=>setShowMoreFilters(v=>!v)} aria-expanded={showMoreFilters} aria-controls="mbl-filter-panel"><Icon name="grid" size={15}/><span>{showMoreFilters?'Fechar filtros':'Filtros'}</span>{(q||cat||need||Object.values(quickFilters).some(Boolean)||sort!=='relevancia')&&<b>{(q?1:0)+(cat?1:0)+(need?1:0)+Object.values(quickFilters).filter(Boolean).length+(sort!=='relevancia'?1:0)}</b>}</button>
    </div>
    <div className="mbl-filter-title mbl-sticky-label"><strong>Explore por categoria</strong><span>{categories.length} opções</span></div>
    <div className="mbl-chips mbl-sticky-categories" role="list"><button className={cat===''?'active':''} onClick={()=>setCategory('')}>Todos</button>{categories.map(c=><button key={c.id} className={cat===c.slug?'active':''} onClick={()=>setCategory(c.slug)}><Icon name={iconForCategory(c.name,c.icon)} size={13}/>{c.name}</button>)}</div>
    {(q||cat||need)&&<div className="mbl-active-filters" aria-label="Filtros ativos">{q&&<span className="mbl-filter-chip">Busca: {q}<button type="button" aria-label="Remover busca" onClick={()=>setSearch('')}>×</button></span>}{cat&&<span className="mbl-filter-chip">Categoria: {categories.find(c=>c.slug===cat)?.name||cat}<button type="button" aria-label="Remover categoria" onClick={()=>setCategory('')}>×</button></span>}{need&&<span className="mbl-filter-chip">Necessidade: {needs.find(x=>x.slug===need)?.name||need}<button type="button" aria-label="Remover necessidade" onClick={()=>setNeedFilter('')}>×</button></span>}</div>}
   </div>
   {showMoreFilters&&<div className="mbl-filter-panel" id="mbl-filter-panel">
    {needs.length>0&&<><div className="mbl-filter-title"><strong>Explore por necessidade</strong><span>{needs.length} opções</span></div><div className="mbl-chips mbl-need-chips" role="list"><button type="button" className={need===''?'active':''} onClick={()=>setNeedFilter('')}>Todas</button>{needs.map(item=><button type="button" key={item.id} className={need===item.slug?'active':''} onClick={()=>setNeedFilter(item.slug)}><Icon name={item.icon||'grid'} size={13}/>{item.name}</button>)}</div></>}
    <div className="mbl-sort-row"><span className="mbl-sort-label">Ordenar por</span><select className="mbl-sort-select" value={sort} onChange={e=>setSortValue(e.target.value)} aria-label="Ordenar resultados"><option value="relevancia">Relevância</option><option value="avaliacao">Melhor avaliadas</option><option value="recentes">Mais recentes</option></select></div>
    <div className="mbl-quick-filter-head"><strong>Filtros rápidos</strong><span>{Object.values(quickFilters).filter(Boolean).length?Object.values(quickFilters).filter(Boolean).length+' ativos':'Selecione opções adicionais'}</span></div>
    <div className="mbl-quick-filters">{[['open','Aberto agora'],['delivery','Delivery'],['pickup','Retirada'],['dine','Consumo no local'],['verified','Verificada'],['searchFeatured','Busca em destaque']].map(([key,label])=><button key={key} type="button" className={quickFilters[key]?'active':''} onClick={()=>updateQuickFilter(key)}>{quickFilters[key]?'✓ ':''}{label}</button>)}</div>
   </div>}
  </section>
  {items.length?<section className="mbl-grid vl-bgrid" aria-label="Empresas encontradas">{items.map(b=>{const stat=ratings[b.id]||{avg:0,count:0};const avg=Number(stat.avg)||0;const aberto=isOpenNow(b.opening_hours);const tone=toneFor(b.categories?.name||b.name);const servicos=[b.has_delivery&&'Delivery',b.has_pickup&&'Retirada',b.has_dine_in&&'No local'].filter(Boolean);return <article className="mbl-card vl-bcard" key={b.id}>
    <a className="mbl-card-main vl-bcard-main" href={`/${city.slug}/empresa/${encodeURIComponent(b.slug)}`}>
     <div className={`vl-bcard-media${!b.cover_url&&b.logo_url?' is-logo':''}`} style={tone}>{b.cover_url?<img src={b.cover_url} alt="" loading="lazy"/>:b.logo_url?<img src={b.logo_url} alt="" loading="lazy"/>:<span className="vl-bcard-initial" aria-hidden="true">{String(b.name||'V').trim().charAt(0).toUpperCase()}</span>}{b.cover_url&&b.logo_url&&<span className="vl-bcard-logo"><img src={b.logo_url} alt="" loading="lazy"/></span>}</div>
     <div className="vl-bcard-body">
      <div className="vl-bcard-top"><span className="vl-bcard-cat">{b.categories?.name||'Empresa'}</span>{b.featured&&<span className="vl-bcard-featured"><Icon name="star" size={12} filled/> Destaque</span>}{b.search_featured&&q.trim()&&<span className="vl-bcard-featured">Em destaque na busca</span>}</div>
      <h2>{b.name}{b.verified&&<span className="vl-bcard-verified" title="Empresa verificada" aria-label="Verificada"><Icon name="check" size={12}/></span>}</h2>
      <p>{limparTexto(b.short_description||b.description)||'Conheça este negócio local.'}</p>
      <div className="vl-bcard-meta">
       {b.opening_hours&&<span className={aberto?'is-open':'is-closed'}>{aberto?'Aberto agora':'Fechado agora'}</span>}
       <span><Icon name="pin" size={13}/>{b.neighborhood||b.address||city.name}</span>
       {stat.count>0&&<span className="vl-bcard-rating"><Icon name="star" size={13} filled/>{avg.toFixed(1)} <small>({stat.count})</small></span>}
       {servicos.length>0&&<span className="vl-bcard-services">{servicos.join(' · ')}</span>}
      </div>
     </div>
    </a>
    {b.whatsapp&&<a className="vl-bcard-wa" href={`https://wa.me/${String(b.whatsapp).replace(/\D/g,'')}?text=${encodeURIComponent('Olá! Encontrei '+b.name+' na VitrineLocal.')}`} target="_blank" rel="noreferrer" aria-label={`Falar com ${b.name} no WhatsApp`}><Icon name="whatsapp" size={20}/><span>WhatsApp</span></a>}
   </article>})}</section>:<section className="mbl-empty"><div className="mbl-empty-icon"><Icon name={selectedCategory?'store':'search'} size={24}/></div><h2>{selectedCategory?<>Ainda não há {selectedCategory.name.toLowerCase()} cadastrados em {city.name}</>:'Nenhum resultado para sua busca'}</h2><p>{selectedCategory?<>Esta categoria já existe no VitrineLocal, mas ainda não possui empresas públicas cadastradas em {city.name}. Explore outras categorias para encontrar negócios locais.</>:'Tente remover um filtro ou pesquisar por outro termo para encontrar empresas locais.'}</p><div className="mbl-empty-actions"><button onClick={clearFilters}>Ver todas as empresas</button></div></section>}
 </main></div>
}
