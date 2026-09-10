import React,{useEffect,useMemo,useState} from 'react'
import {createClient} from '@supabase/supabase-js'

const U=import.meta.env.VITE_SUPABASE_URL
const K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db=U&&K?createClient(U,K):null
const fallbackCats=[['Restaurantes','🍽️'],['Lojas','🛍️'],['Serviços','🧰'],['Saúde','❤️'],['Beleza','✨'],['Turismo','📍'],['Automóveis','🚗'],['Imóveis','🏠'],['Pets','🐾'],['Outros','✦']]
const phoneDigits=v=>String(v||'').replace(/\D/g,'')

function Header({city,q,setQ}){
 const submit=e=>{e.preventDefault();const url=new URL(location.href);if(q.trim())url.searchParams.set('q',q.trim());else url.searchParams.delete('q');location.href=url.pathname+(url.search?'?'+url.searchParams.toString():'')}
 return <header className="mbl-topbar"><div className="mbl-nav">
  <a className="mbl-brand" href={`/${city.slug}`}><span className="mbl-brand-mark">V</span><span>Vitrine<span>Local</span></span></a>
  <form className="mbl-search" onSubmit={submit}><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Busque por empresas, serviços, categorias…" aria-label="Buscar empresas"/></form>
  <nav className="mbl-links"><a href={`/${city.slug}`}>Início</a><a className="active" href={`/${city.slug}/empresas`}>Empresas</a><a href={`/${city.slug}/promocoes`}>Promoções</a><a href={`/${city.slug}/eventos`}>Eventos</a></nav>
  <a className="mbl-city" href={`/${city.slug}`}>⌖ {city.name} - {city.state||'SC'}⌄</a><a className="mbl-user" href="/conta" aria-label="Minha conta">◉</a>
 </div></header>
}

export default function ModernBusinessesPage({citySlug='laguna'}){
 const[city,setCity]=useState(null),[businesses,setBusinesses]=useState([]),[categories,setCategories]=useState([]),[cat,setCat]=useState(''),[q,setQ]=useState(''),[loading,setLoading]=useState(true)
 useEffect(()=>{let live=true;(async()=>{
  const params=new URLSearchParams(location.search)
  const initialCat=params.get('categoria')||params.get('category')||''
  const initialQ=params.get('q')||''
  setQ(initialQ)
  if(!db){setCity({id:'fallback',name:'Laguna',state:'SC',slug:citySlug});setCategories(fallbackCats.map(([name,icon],i)=>({id:i,name,icon,slug:name.toLowerCase()})));setCat(initialCat);setLoading(false);return}
  const{data:c}=await db.from('cities').select('id,name,state,slug,active').eq('slug',citySlug).eq('active',true).maybeSingle();if(!live)return;setCity(c||null);if(!c){setLoading(false);return}
  const[b,cs]=await Promise.all([
   db.from('businesses').select('id,name,slug,short_description,description,cover_url,logo_url,address,neighborhood,phone,whatsapp,featured,verified,categories(name,slug,icon)').eq('city_id',c.id).eq('status','active').order('featured',{ascending:false}).order('created_at',{ascending:false}).limit(100),
   db.from('categories').select('id,name,slug,icon').eq('active',true).order('sort_order').order('name')
  ])
  const loaded=cs.data?.length?cs.data:fallbackCats.map(([name,icon],i)=>({id:i,name,icon,slug:name.toLowerCase()}))
  setBusinesses(b.data||[]);setCategories(loaded);setCat(initialCat&&loaded.some(x=>x.slug===initialCat)?initialCat:'');setLoading(false)
 })();return()=>{live=false}},[citySlug])
 const items=useMemo(()=>{const term=q.trim().toLowerCase();return businesses.filter(b=>{const matchesText=!term||[b.name,b.short_description,b.description,b.address,b.neighborhood,b.categories?.name].filter(Boolean).join(' ').toLowerCase().includes(term);const matchesCat=!cat||b.categories?.slug===cat;return matchesText&&matchesCat})},[businesses,q,cat])
 const setCategory=next=>{setCat(next);const url=new URL(location.href);if(next)url.searchParams.set('categoria',next);else url.searchParams.delete('categoria');history.replaceState(null,'',url.pathname+(url.search?'?'+url.searchParams.toString():''))}
 const clearFilters=()=>{setQ('');setCat('');history.replaceState(null,'',`/${city.slug}/empresas`)}
 if(loading)return <main className="mbl-shell"><div className="mbl-loading">Carregando empresas…</div></main>
 if(!city)return <main className="mbl-shell"><div className="mbl-error"><h1>Cidade não encontrada.</h1><a href="/laguna">Voltar</a></div></main>
 return <div className="mbl-shell"><Header city={city} q={q} setQ={setQ}/><main className="mbl-page">
  <div className="mbl-breadcrumb"><a href={`/${city.slug}`}>← Voltar para {city.name}</a><span>⌖ {city.name}</span><span>›</span><strong>Empresas</strong></div>
  <section className="mbl-hero"><div><span className="mbl-kicker">CATÁLOGO LOCAL</span><h1>Empresas em {city.name}</h1><p>Encontre negócios, serviços e lugares da cidade com uma experiência mais rápida e visual.</p></div><div className="mbl-result-count"><strong>{items.length}</strong><span>resultado{items.length===1?'':'s'}</span></div></section>
  <section className="mbl-toolbar">
   <div className="mbl-toolbar-row"><div className="mbl-search-large"><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){const url=new URL(location.href);if(q.trim())url.searchParams.set('q',q.trim());else url.searchParams.delete('q');location.href=url.pathname+(url.search?'?'+url.searchParams.toString():'')}}} placeholder="Buscar empresa, serviço ou bairro" aria-label="Buscar no catálogo"/></div><button className="mbl-clear" type="button" onClick={clearFilters}>Limpar filtros</button></div>
   <div className="mbl-chips" role="list"><button className={cat===''?'active':''} onClick={()=>setCategory('')}>Todos</button>{categories.map(c=><button key={c.id} className={cat===c.slug?'active':''} onClick={()=>setCategory(c.slug)}><span>{c.icon||'✦'}</span>{c.name}</button>)}</div>
  </section>
  {items.length?<section className="mbl-grid">{items.map(b=><a className="mbl-card" href={`/${city.slug}/empresa/${encodeURIComponent(b.slug)}`} key={b.id}>
    <div className="mbl-cover">{b.cover_url?<img src={b.cover_url} alt={`${b.name} capa`} loading="lazy"/>:<div className="mbl-cover-placeholder">VitrineLocal</div>}{b.featured&&<span className="mbl-featured">Destaque</span>}{b.verified&&<span className="mbl-verified">✓ Verificada</span>}{b.logo_url&&<span className="mbl-logo"><img src={b.logo_url} alt={`${b.name} logo`} loading="lazy"/></span>}</div>
    <div className="mbl-body"><div className="mbl-category"><span>{b.categories?.name||'Empresa'}</span>{b.whatsapp&&<small>WhatsApp</small>}</div><h2>{b.name}</h2><p>{b.short_description||b.description||'Conheça este negócio local.'}</p><div className="mbl-footer"><span>⌖ {b.neighborhood||b.address||city.name+' - '+(city.state||'SC')}</span><strong>★ Sem avaliações</strong></div></div>
  </a>)}</section>:<section className="mbl-empty"><div className="mbl-empty-icon">⌕</div><h2>Nenhuma empresa encontrada</h2><p>Não encontramos resultados para os filtros atuais.</p><button onClick={clearFilters}>Ver todas as empresas</button></section>}
 </main></div>
}
