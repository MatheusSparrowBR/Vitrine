import React,{useEffect,useMemo,useState} from 'react'
import {supabase as db} from './supabase-client.js'
import './search-featured.css'
import {loadPublicBusinessReviewSummaries} from './public-review-summary.js'
import Icon,{isOfficialIcon} from './ui-icons.jsx'

const fallbackCats=[['Restaurantes','store'],['Lojas','bag'],['Serviços','wrench'],['Saúde','heart'],['Beleza','star'],['Turismo','pin'],['Automóveis','briefcase'],['Imóveis','grid'],['Pets','heart'],['Outros','grid']]
const iconForCategory=(name,selected)=>{if(isOfficialIcon(selected))return selected;const n=String(name||'').toLowerCase();if(n.includes('restaur')||n.includes('café')||n.includes('lanche'))return'store';if(n.includes('loja')||n.includes('mercado')||n.includes('comérc'))return'bag';if(n.includes('servi'))return'wrench';if(n.includes('saúde'))return'heart';if(n.includes('beleza'))return'star';if(n.includes('turis'))return'pin';if(n.includes('auto'))return'briefcase';if(n.includes('imóv'))return'grid';if(n.includes('pet'))return'heart';return'grid'}
const stars=avg=>Array.from({length:5},(_,i)=><Icon key={i} name="star" size={12} filled={i<Math.round(Number(avg)||0)}/>)

const normalizeSearchText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
const searchScore=(business,term,boosted=false)=>{const q=normalizeSearchText(term),words=q.split(/\s+/).filter(Boolean);if(!q)return 0;const name=normalizeSearchText(business.name),category=normalizeSearchText(business.categories?.name),short=normalizeSearchText(business.short_description),description=normalizeSearchText(business.description),address=normalizeSearchText(business.address),neighborhood=normalizeSearchText(business.neighborhood);let score=0;if(name===q)score+=140;else if(name.startsWith(q))score+=110;else if(name.includes(q))score+=85;if(category===q)score+=80;else if(category.includes(q))score+=55;if(short.includes(q))score+=35;if(description.includes(q))score+=20;if(address.includes(q)||neighborhood.includes(q))score+=12;const combined=[name,category,short,description,address,neighborhood].join(' ');if(words.length>1&&words.every(word=>combined.includes(word)))score+=30;if(boosted)score+=90;return score}

function syncQuery(values){
 const url=new URL(location.href)
 if(values.q!==undefined){if(values.q)url.searchParams.set('q',values.q);else url.searchParams.delete('q')}
 if(values.cat!==undefined){if(values.cat)url.searchParams.set('categoria',values.cat);else url.searchParams.delete('categoria')}
 if(values.sort!==undefined){if(values.sort&&values.sort!=='relevancia')url.searchParams.set('ordenar',values.sort);else url.searchParams.delete('ordenar')}
 history.replaceState(null,'',url.pathname+(url.search?'?'+url.searchParams.toString():''))
}

export default function ModernBusinessesPage({citySlug='laguna'}){
 const[city,setCity]=useState(null)
 const[businesses,setBusinesses]=useState([])
 const[categories,setCategories]=useState([])
 const[ratings,setRatings]=useState({})
 const[cat,setCat]=useState('')
 const[q,setQ]=useState('')
 const[sort,setSort]=useState('relevancia')
 const[loading,setLoading]=useState(true)

 useEffect(()=>{let live=true;(async()=>{
  const params=new URLSearchParams(location.search)
  const initialCat=params.get('categoria')||params.get('category')||''
  const initialQ=params.get('q')||''
  const initialSort=['relevancia','recentes','avaliacao'].includes(params.get('ordenar'))?params.get('ordenar'):'relevancia'
  setQ(initialQ);setSort(initialSort);setCat(initialCat)
  try{sessionStorage.setItem('vl_catalog_return_url',location.pathname+location.search)}catch{}
  if(!db){setCity({id:'fallback',name:'Laguna',state:'SC',slug:citySlug});setCategories(fallbackCats.map(([name,icon],i)=>({id:i,name,icon,slug:name.toLowerCase()})));setCat(initialCat);setLoading(false);return}
  const{data:c}=await db.from('cities').select('id,name,state,slug,active').eq('slug',citySlug).eq('active',true).maybeSingle()
  if(!live)return
  setCity(c||null)
  if(!c){setLoading(false);return}
  const[b,cs]=await Promise.all([
   db.from('public_business_directory').select('id,name,slug,short_description,description,cover_url,logo_url,address,neighborhood,phone,whatsapp,featured,verified,category_name,category_slug,created_at,search_featured').eq('city_id',c.id).order('featured',{ascending:false}).order('created_at',{ascending:false}).limit(100),
   db.from('categories').select('id,name,slug,icon').eq('active',true).order('sort_order').order('name')
  ])
  const loaded=cs.data?.length?cs.data:fallbackCats.map(([name,icon],i)=>({id:i,name,icon,slug:name.toLowerCase()}))
  const publicBusinesses=(b.data||[]).map(row=>({...row,categories:row.category_name?{name:row.category_name,slug:row.category_slug}:null}))
  const reviewMap=await loadPublicBusinessReviewSummaries(db,publicBusinesses.map(row=>row.id))
  if(!live)return
  setBusinesses(publicBusinesses);setRatings(reviewMap);setCategories(loaded);setCat(initialCat&&loaded.some(x=>x.slug===initialCat)?initialCat:'');setLoading(false)
 })();return()=>{live=false}},[citySlug])

 useEffect(()=>{try{sessionStorage.setItem('vl_catalog_return_url',location.pathname+location.search)}catch{}},[cat,q,sort])

 const items=useMemo(()=>{\n  const term=q.trim().toLowerCase()\n  const filtered=businesses.filter(b=>{\n   const matchesText=!term||[b.name,b.short_description,b.description,b.address,b.neighborhood,b.categories?.name].filter(Boolean).join(' ').toLowerCase().includes(term)\n   const matchesCat=!cat||b.categories?.slug===cat\n   return matchesText&&matchesCat\n  })\n  return [...filtered].sort((a,b)=>{\n   if(term){\n    const scoreA=searchScore(a,term,Boolean(a.search_featured))\n    const scoreB=searchScore(b,term,Boolean(b.search_featured))\n    if(scoreB!==scoreA)return scoreB-scoreA\n   }\n   if(sort==='recentes')return new Date(b.created_at||0)-new Date(a.created_at||0)\n   if(sort==='avaliacao')return (ratings[b.id]?.avg||0)-(ratings[a.id]?.avg||0)\n   const featuredScore=(b.featured?1:0)-(a.featured?1:0)\n   if(featuredScore)return featuredScore\n   return (ratings[b.id]?.avg||0)-(ratings[a.id]?.avg||0)\n  })\n },[businesses,q,cat,sort,ratings])\n const setCategory=next=>{setCat(next);syncQuery({cat:next})}
 const setSearch=value=>{setQ(value);syncQuery({q:value})}
 const setSortValue=value=>{setSort(value);syncQuery({sort:value})}
 const clearFilters=()=>{setQ('');setCat('');setSort('relevancia');history.replaceState(null,'',`/${city.slug}/empresas`)}
 const returnUrl=()=>{try{const stored=sessionStorage.getItem('vl_catalog_return_url');return stored&&stored.startsWith(`/${city.slug}/empresas`)?stored:`/${city.slug}/empresas`}catch{return`/${city.slug}/empresas`}}

 if(loading)return <main className="mbl-shell"><div className="mbl-loading">Carregando empresas…</div></main>
 if(!city)return <main className="mbl-shell"><div className="mbl-error"><h1>Cidade não encontrada.</h1><a href="/laguna">Voltar</a></div></main>

 return <div className="mbl-shell"><main className="mbl-page">
  <div className="mbl-breadcrumb"><a href={`/${city.slug}`}>Voltar para {city.name}</a><span>{city.name}</span><span>›</span><strong>Empresas</strong></div>
  <section className="mbl-hero"><div><span className="mbl-kicker">CATÁLOGO LOCAL</span><h1>Empresas em {city.name}</h1><p>Encontre negócios e serviços da cidade. Filtre por categoria, pesquise pelo que precisa e compare opções.</p></div><div className="mbl-result-count"><strong>{items.length}</strong><span>{items.length===1?'resultado':'resultados'}</span></div></section>
  <section className="mbl-toolbar" aria-label="Filtros do catálogo">
   <div className="mbl-toolbar-row"><div className="mbl-search-large"><Icon name="search" size={18}/><input value={q} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empresa, serviço ou bairro" aria-label="Buscar no catálogo"/></div><button className="mbl-clear" type="button" onClick={clearFilters}>Limpar filtros</button></div>
   <div className="mbl-chips" role="list"><button className={cat===''?'active':''} onClick={()=>setCategory('')}>Todos</button>{categories.map(c=><button key={c.id} className={cat===c.slug?'active':''} onClick={()=>setCategory(c.slug)}><Icon name={iconForCategory(c.name,c.icon)} size={13}/>{c.name}</button>)}</div>
   <div className="mbl-sort-row"><span className="mbl-sort-label">Ordenar por</span><select className="mbl-sort-select" value={sort} onChange={e=>setSortValue(e.target.value)} aria-label="Ordenar resultados"><option value="relevancia">Relevância</option><option value="avaliacao">Melhor avaliadas</option><option value="recentes">Mais recentes</option></select></div>
   {(q||cat)&&<div className="mbl-active-filters" aria-label="Filtros ativos">{q&&<span className="mbl-filter-chip">Busca: {q}<button type="button" aria-label="Remover busca" onClick={()=>setSearch('')}>×</button></span>}{cat&&<span className="mbl-filter-chip">Categoria: {categories.find(c=>c.slug===cat)?.name||cat}<button type="button" aria-label="Remover categoria" onClick={()=>setCategory('')}>×</button></span>}</div>}
  </section>
  {items.length?<section className="mbl-grid" aria-label="Empresas encontradas">{items.map(b=>{const stat=ratings[b.id]||{avg:0,count:0};const avg=stat.avg;return <article className="mbl-card" key={b.id}>
    <a className="mbl-card-main" href={`/${city.slug}/empresa/${encodeURIComponent(b.slug)}`}>
     <div className="mbl-cover">{b.cover_url?<img src={b.cover_url} alt={`${b.name} capa`} loading="lazy"/>:<div className="mbl-cover-placeholder"><Icon name="store" size={30}/></div>}{b.search_featured&&q.trim()&&<span className="mbl-search-featured">Busca em destaque</span>}{b.featured&&<span className="mbl-featured">Destaque</span>}{b.verified&&<span className="mbl-verified"><Icon name="check" size={11}/> Verificada</span>}{b.logo_url&&<span className="mbl-logo"><img src={b.logo_url} alt={`${b.name} logo`} loading="lazy"/></span>}</div>
     <div className="mbl-body"><div className="mbl-category"><span>{b.categories?.name||'Empresa'}</span><span className="mbl-rating-inline">{stat.count?`${avg.toFixed(1)} · ${stat.count} avaliações`:'Ainda sem avaliações'}</span></div><h2>{b.name}</h2><p>{b.short_description||b.description||'Conheça este negócio local.'}</p><div className="mbl-footer"><span><Icon name="pin" size={11}/>{b.neighborhood||b.address||city.name+' - '+(city.state||'SC')}</span><strong className={stat.count?'has-reviews':''} aria-label={stat.count?`${avg.toFixed(1)} de 5, ${stat.count} avaliações`:'Sem avaliações'}><span className="mbl-stars" aria-hidden="true">{stars(avg)}</span></strong></div></div>
    </a>
    {b.whatsapp&&<div className="mbl-card-actions"><a className="mbl-quick-contact" href={`https://wa.me/${String(b.whatsapp).replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><Icon name="phone" size={13}/>WhatsApp</a></div>}
   </article>})}</section>:<section className="mbl-empty"><div className="mbl-empty-icon"><Icon name="search" size={24}/></div><h2>Nenhum resultado para sua busca</h2><p>Tente remover um filtro ou pesquisar por outro termo para encontrar empresas locais.</p><div className="mbl-empty-actions"><button onClick={clearFilters}>Ver todas as empresas</button></div></section>}
 </main></div>
}
