
const PRIVATE_PREFIXES=['/admin','/conta','/login','/atualizar-senha','/usuario']
const RESERVED_CITY_PARTS=['login','planos','conta','admin','privacidade','termos','atualizar-senha','usuario','preview-lancamento']
const CITY_NAMES={laguna:'Laguna'}
const CANONICAL_ORIGIN='https://vitrinelocal.net'

const humanize=value=>String(value||'')
  .split('-')
  .filter(Boolean)
  .map(part=>part.charAt(0).toUpperCase()+part.slice(1))
  .join(' ')
const normalizeText=value=>String(value||'').replace(/\\s+/g,' ').trim()
const truncate=(value,max=165)=>{
  const text=normalizeText(value)
  if(text.length<=max)return text
  return text.slice(0,max-1).trimEnd()+'…'
}
const absoluteUrl=value=>{
  const raw=String(value||'').trim()
  if(!raw)return ''
  try{return new URL(raw,location.origin).href}catch{return ''}
}
const firstMeta=(attr,value,content)=>{
  let el=document.head.querySelector('meta['+attr+'="'+value+'"]')
  if(!el){
    el=document.createElement('meta')
    el.setAttribute(attr,value)
    document.head.appendChild(el)
  }
  el.setAttribute('content',content)
}
const linkRel=(rel,href)=>{
  let el=document.head.querySelector('link[rel="'+rel+'"]')
  if(!el){
    el=document.createElement('link')
    el.rel=rel
    document.head.appendChild(el)
  }
  el.href=href
}
const setJsonLd=(id,payload)=>{
  let el=document.getElementById(id)
  if(!el){
    el=document.createElement('script')
    el.id=id
    el.type='application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent=JSON.stringify(payload)
}

const path=location.pathname.replace(/\/+$/,'')||'/'
const parts=path.split('/').filter(Boolean).map(value=>{
  try{return decodeURIComponent(value)}catch{return value}
})
const citySlug=parts[0]&&!RESERVED_CITY_PARTS.includes(parts[0].toLowerCase())?parts[0].toLowerCase():''
const fallbackCityName=CITY_NAMES[citySlug]||humanize(citySlug)||'sua cidade'
const searchParams=new URLSearchParams(location.search)
const catalogQueryKeys=[...searchParams.keys()]
const requestedCategorySlug=searchParams.get('categoria')||''
const isCatalogRoute=Boolean(citySlug&&parts[1]==='empresas')
const isCleanCategoryRoute=Boolean(isCatalogRoute&&requestedCategorySlug&&catalogQueryKeys.length===1&&catalogQueryKeys[0]==='categoria')
let canonicalUrl=CANONICAL_ORIGIN+path

const siteTitle='VitrineLocal | Empresas, promoções e eventos locais'
const siteDescription='Encontre empresas, serviços, promoções e eventos perto de você no VitrineLocal.'
let title=siteTitle
let description=siteDescription
let robots='index,follow,max-image-preview:large'

if(path==='/'){
  title='VitrineLocal | Descubra o melhor da sua cidade'
  description='A vitrine digital da cidade: empresas, serviços, promoções e eventos em um só lugar.'
}else if(parts.length===1&&citySlug){
  title='VitrineLocal '+fallbackCityName+' | Empresas, promoções e eventos'
  description='Descubra empresas, serviços, promoções e eventos em '+fallbackCityName+'. Encontre tudo o que a cidade tem de melhor.'
}else if(citySlug&&parts[1]==='empresas'){
  title='Empresas em '+fallbackCityName+' | VitrineLocal'
  description='Encontre empresas, serviços, categorias e negócios locais em '+fallbackCityName+'.'
}else if(citySlug&&parts[1]==='promocoes'){
  title='Promoções em '+fallbackCityName+' | VitrineLocal'
  description='Confira ofertas e promoções publicadas por empresas de '+fallbackCityName+'.'
}else if(citySlug&&parts[1]==='eventos'){
  title='Eventos em '+fallbackCityName+' | VitrineLocal'
  description='Veja os próximos eventos e o que está acontecendo em '+fallbackCityName+'.'
}else if(citySlug&&parts[1]==='empresa'){
  title='Empresa em '+fallbackCityName+' | VitrineLocal'
  description='Conheça esta empresa local, seus serviços, contatos, horários, promoções e mídias no VitrineLocal.'
}else if(path==='/planos'){
  title='Planos para empresas | VitrineLocal'
  description='Escolha o plano VitrineLocal que melhor ajuda sua empresa a ganhar presença e destaque.'
}

if(PRIVATE_PREFIXES.some(prefix=>path===prefix||path.startsWith(prefix+'/'))){
  robots='noindex,nofollow,noarchive'
  title=path.startsWith('/admin')?'Administração | VitrineLocal':
    path==='/login'?'Entrar | VitrineLocal':
    path.startsWith('/usuario')?'Conta do usuário | VitrineLocal':'Minha conta | VitrineLocal'
}else if(isCatalogRoute&&catalogQueryKeys.length&&!isCleanCategoryRoute){
  robots='noindex,follow,max-image-preview:large'
}

const applyHead=()=>{
  document.title=title
  firstMeta('name','description',description)
  firstMeta('name','robots',robots)
  firstMeta('name','theme-color','#1677ff')
  firstMeta('property','og:title',title)
  firstMeta('property','og:description',description)
  firstMeta('property','og:type','website')
  firstMeta('property','og:url',canonicalUrl)
  firstMeta('property','og:image',absoluteUrl('/laguna-hero.svg'))
  firstMeta('property','og:site_name','VitrineLocal')
  firstMeta('name','twitter:card','summary_large_image')
  firstMeta('name','twitter:title',title)
  firstMeta('name','twitter:description',description)
  firstMeta('name','twitter:image',absoluteUrl('/laguna-hero.svg'))
  linkRel('canonical',canonicalUrl)
}

const baseWebsite={
  '@type':'WebSite',
  '@id':CANONICAL_ORIGIN+'/#website',
  name:'VitrineLocal',
  url:CANONICAL_ORIGIN,
  inLanguage:'pt-BR',
  potentialAction:{
    '@type':'SearchAction',
    target:CANONICAL_ORIGIN+'/'+(citySlug||'laguna')+'/empresas?q={search_term_string}',
    'query-input':'required name=search_term_string'
  }
}

const createBreadcrumbs=(cityName,categoryName='')=>{
  const items=[{'@type':'ListItem',position:1,name:'Início',item:CANONICAL_ORIGIN}]
  if(citySlug){
    items.push({'@type':'ListItem',position:2,name:cityName,item:CANONICAL_ORIGIN+'/'+encodeURIComponent(citySlug)})
    if(parts[1]){
      const label=parts[1]==='empresa'?'Empresas':
        parts[1]==='empresas'?'Empresas':
        parts[1]==='promocoes'?'Promoções':
        parts[1]==='eventos'?'Eventos':humanize(parts[1])
      items.push({'@type':'ListItem',position:3,name:label,item:CANONICAL_ORIGIN+'/'+encodeURIComponent(citySlug)+'/'+encodeURIComponent(parts[1])})
      if(parts[1]==='empresas'&&categoryName){
        items.push({'@type':'ListItem',position:4,name:categoryName,item:canonicalUrl})
      }else if(parts[1]==='empresa'&&parts[2]){
        items.push({'@type':'ListItem',position:4,name:decodeURIComponent(parts[2]),item:CANONICAL_ORIGIN+path})
      }
    }
  }
  return {'@type':'BreadcrumbList','@id':canonicalUrl+'#breadcrumb',itemListElement:items}
}

setJsonLd('vl-seo-schema',{'@context':'https://schema.org','@graph':[baseWebsite]})
applyHead()

const supabaseUrl=String(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')
const publishableKey=String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'')
const canReadPublicApi=Boolean(supabaseUrl&&publishableKey)

async function supabasePublic(resource,params={}){
  if(!canReadPublicApi)return null
  const url=new URL(supabaseUrl+'/rest/v1/'+resource)
  Object.entries(params).forEach(([key,value])=>url.searchParams.set(key,String(value)))
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),2500)
  try{
    const response=await fetch(url.href,{headers:{apikey:publishableKey,Authorization:'Bearer '+publishableKey},signal:controller.signal})
    if(!response.ok)return null
    return await response.json()
  }catch{
    return null
  }finally{
    clearTimeout(timer)
  }
}

const parseOpeningHours=openingHours=>{
  if(!openingHours||typeof openingHours!=='object')return []
  const labels={monday:'Monday',tuesday:'Tuesday',wednesday:'Wednesday',thursday:'Thursday',friday:'Friday',saturday:'Saturday',sunday:'Sunday'}
  return Object.entries(labels).flatMap(([key,dayOfWeek])=>{
    const day=openingHours[key]
    if(!day||day.closed||!day.open||!day.close)return []
    return [{
      '@type':'OpeningHoursSpecification',
      dayOfWeek:'https://schema.org/'+dayOfWeek,
      opens:String(day.open),
      closes:String(day.close)
    }]
  })
}

async function enrichCityMetadata(){
  if(!citySlug||!canReadPublicApi)return
  const rows=await supabasePublic('cities',{
    select:'id,name,slug,state',
    slug:'eq.'+citySlug,
    active:'eq.true',
    limit:'1'
  })
  const city=Array.isArray(rows)?rows[0]:null
  if(!city?.name)return
  const cityName=city.name

  if(parts[1]==='empresas'&&requestedCategorySlug){
    const categoryRows=await supabasePublic('categories',{
      select:'id,name,slug,icon',
      slug:'eq.'+requestedCategorySlug,
      active:'eq.true',
      limit:'1'
    })
    const category=Array.isArray(categoryRows)?categoryRows[0]:null
    if(!category){
      robots='noindex,follow,max-image-preview:large'
      canonicalUrl=CANONICAL_ORIGIN+path
      title='Categoria não encontrada | VitrineLocal'
      description='A categoria solicitada não foi encontrada no VitrineLocal.'
      applyHead()
      setJsonLd('vl-seo-schema',{'@context':'https://schema.org','@graph':[baseWebsite]})
      return
    }

    canonicalUrl=CANONICAL_ORIGIN+path+'?categoria='+encodeURIComponent(category.slug)
    title=category.name+' em '+cityName+' | VitrineLocal'
    description='Encontre '+category.name.toLowerCase()+' em '+cityName+'. Veja empresas locais, contatos, serviços e informações atualizadas no VitrineLocal.'

    const businessRows=await supabasePublic('public_business_directory',{
      select:'id,name,slug,short_description,description,cover_url,logo_url,address,neighborhood,category_name,category_slug',
      city_id:'eq.'+city.id,
      category_slug:'eq.'+category.slug,
      limit:'100'
    })
    const businesses=Array.isArray(businessRows)?businessRows:[]
    const itemList=businesses.filter(item=>item?.name&&item?.slug).map((business,index)=>{
      const businessUrl=CANONICAL_ORIGIN+'/'+encodeURIComponent(citySlug)+'/empresa/'+encodeURIComponent(business.slug)
      const image=absoluteUrl(business.cover_url||business.logo_url)
      const item={
        '@type':'LocalBusiness',
        '@id':businessUrl+'#business',
        name:business.name,
        url:businessUrl,
        description:truncate(business.short_description||business.description||('Conheça '+business.name+' em '+cityName+'.'),200)
      }
      if(image)item.image=[image]
      return {'@type':'ListItem',position:index+1,item:item}
    })

    applyHead()
    if(itemList[0]?.item?.image?.[0]){
      firstMeta('property','og:image',itemList[0].item.image[0])
      firstMeta('name','twitter:image',itemList[0].item.image[0])
    }
    setJsonLd('vl-seo-schema',{'@context':'https://schema.org','@graph':[
      {...baseWebsite},
      {'@type':'CollectionPage','@id':canonicalUrl+'#webpage',url:canonicalUrl,name:title,description:description,inLanguage:'pt-BR',about:{'@type':'DefinedTerm',name:category.name,termCode:category.slug},mainEntity:{'@id':canonicalUrl+'#businesses'}},
      {'@type':'ItemList','@id':canonicalUrl+'#businesses',name:title,itemListElement:itemList},
      createBreadcrumbs(cityName,category.name)
    ]})
    return
  }

  if(parts.length===1){
    title='VitrineLocal '+cityName+' | Empresas, promoções e eventos'
    description='Descubra empresas, serviços, promoções e eventos em '+cityName+'. Encontre tudo o que a cidade tem de melhor.'
  }else if(parts[1]==='empresas'){
    title='Empresas em '+cityName+' | VitrineLocal'
    description='Encontre empresas, serviços, categorias e negócios locais em '+cityName+'.'
  }else if(parts[1]==='promocoes'){
    title='Promoções em '+cityName+' | VitrineLocal'
    description='Confira ofertas e promoções publicadas por empresas de '+cityName+'.'
  }else if(parts[1]==='eventos'){
    title='Eventos em '+cityName+' | VitrineLocal'
    description='Veja os próximos eventos e o que está acontecendo em '+cityName+'.'
  }else if(parts[1]==='empresa'){
    title='Empresa em '+cityName+' | VitrineLocal'
    description='Conheça esta empresa local, seus serviços, contatos, horários, promoções e mídias no VitrineLocal.'
  }
  canonicalUrl=CANONICAL_ORIGIN+path
  applyHead()
  setJsonLd('vl-seo-schema',{'@context':'https://schema.org','@graph':[
    {...baseWebsite},
    {'@type':'WebPage','@id':canonicalUrl+'#webpage',url:canonicalUrl,name:title,description:description,inLanguage:'pt-BR'},
    createBreadcrumbs(cityName)
  ]})
}

async function enrichEventsMetadata(){
  if(!citySlug||parts[1]!=='eventos'||!canReadPublicApi)return
  const cityRows=await supabasePublic('cities',{
    select:'id,name,state,slug',
    slug:'eq.'+citySlug,
    active:'eq.true',
    limit:'1'
  })
  const city=Array.isArray(cityRows)?cityRows[0]:null
  if(!city?.id||!city?.name)return

  const today=new Date().toISOString().slice(0,10)
  const eventRows=await supabasePublic('events',{
    select:'id,title,description,image_url,event_date,event_end_date,start_time,end_time,location,address,category,price,external_url',
    city_id:'eq.'+city.id,
    active:'eq.true',
    event_end_date:'gte.'+today,
    order:'event_date.asc',
    limit:'50'
  })
  const events=Array.isArray(eventRows)?eventRows:[]

  const toDateTime=(date,time,fallback)=>{
    if(!date)return ''
    const value=String(time||fallback||'').trim()
    if(!value)return String(date)
    const normalized=value.length===5?value+':00':value
    return String(date)+'T'+normalized+'-03:00'
  }

  const eventSchemas=events.filter(event=>event?.title&&event?.event_date).map(event=>{
    const startDate=toDateTime(event.event_date,event.start_time)
    const endDate=toDateTime(event.event_end_date||event.event_date,event.end_time||'23:59:59')
    const image=absoluteUrl(event.image_url)
    const locationName=event.location||city.name
    const addressValue=event.address||''
    const place={
      '@type':'Place',
      name:locationName,
      address:{
        '@type':'PostalAddress',
        ...(addressValue?{streetAddress:addressValue}:{}),
        addressLocality:city.name,
        addressRegion:city.state||'SC',
        addressCountry:'BR'
      }
    }
    const schema={
      '@type':'Event',
      '@id':CANONICAL_ORIGIN+'/'+encodeURIComponent(citySlug)+'/eventos#event-'+encodeURIComponent(String(event.id)),
      name:event.title,
      description:truncate(event.description||event.title,300),
      startDate:startDate,
      endDate:endDate,
      eventStatus:'https://schema.org/EventScheduled',
      eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',
      location:place
    }
    if(image)schema.image=[image]
    if(event.category)schema.about={'@type':'Thing',name:event.category}
    if(event.external_url){
      const external=absoluteUrl(event.external_url)
      if(external)schema.sameAs=[external]
    }
    if(event.price!=null){
      const numericPrice=Number(event.price)
      if(Number.isFinite(numericPrice)){
        schema.offers={
          '@type':'Offer',
          price:numericPrice,
          priceCurrency:'BRL',
          availability:'https://schema.org/InStock',
          url:CANONICAL_ORIGIN+path
        }
      }
    }
    return schema
  })

  title='Eventos em '+city.name+' | VitrineLocal'
  description='Veja os próximos eventos e o que está acontecendo em '+city.name+'.'
  applyHead()
  const eventList={
    '@type':'ItemList',
    '@id':CANONICAL_ORIGIN+path+'#events',
    itemListElement:eventSchemas.map((event,index)=>({
      '@type':'ListItem',
      position:index+1,
      item:event
    }))
  }
  setJsonLd('vl-seo-schema',{'@context':'https://schema.org','@graph':[
    {...baseWebsite},
    {'@type':'WebPage','@id':CANONICAL_ORIGIN+path+'#webpage',url:CANONICAL_ORIGIN+path,name:title,description:description,inLanguage:'pt-BR',mainEntity:{'@id':CANONICAL_ORIGIN+path+'#events'}},
    eventList,
    createBreadcrumbs(city.name)
  ]})
}

async function enrichBusinessMetadata(){
  if(!citySlug||parts[1]!=='empresa'||!parts[2]||!canReadPublicApi)return
  const cityRows=await supabasePublic('cities',{
    select:'id,name,state,slug',
    slug:'eq.'+citySlug,
    active:'eq.true',
    limit:'1'
  })
  const city=Array.isArray(cityRows)?cityRows[0]:null
  if(!city?.id)return
  const businessRows=await supabasePublic('public_business_directory',{
    select:'id,name,slug,short_description,description,logo_url,cover_url,phone,whatsapp,website_url,instagram_url,address,neighborhood,latitude,longitude,verified,category_name,category_slug,opening_hours,city_name,city_state,updated_at',
    city_id:'eq.'+city.id,
    slug:'eq.'+decodeURIComponent(parts[2]),
    limit:'1'
  })
  const business=Array.isArray(businessRows)?businessRows[0]:null
  if(!business)return

  const cityName=business.city_name||city.name
  const category=business.category_name||'Empresa local'
  const businessDescription=truncate(business.short_description||business.description||'Conheça '+business.name+' em '+cityName+'. Consulte serviços, contatos, localização, horários e novidades.')
  const image=absoluteUrl(business.cover_url||business.logo_url||'/laguna-hero.svg')
  const businessUrl=CANONICAL_ORIGIN+'/'+encodeURIComponent(citySlug)+'/empresa/'+encodeURIComponent(business.slug)

  title=business.name+' em '+cityName+' | VitrineLocal'
  description=businessDescription
  applyHead()
  firstMeta('property','og:image',image)
  firstMeta('name','twitter:image',image)

  const localBusiness={
    '@type':'LocalBusiness',
    '@id':businessUrl+'#business',
    name:business.name,
    url:businessUrl,
    description:businessDescription,
    image:[image],
    areaServed:{'@type':'City',name:cityName},
    address:business.address||business.neighborhood?{
      '@type':'PostalAddress',
      ...(business.address?{streetAddress:business.address}:{}),
      addressLocality:cityName,
      addressRegion:business.city_state||city.state||'SC',
      addressCountry:'BR'
    }:undefined,
    telephone:business.phone||undefined,
    sameAs:[business.website_url,business.instagram_url].map(absoluteUrl).filter(Boolean),
    category:category,
    openingHoursSpecification:parseOpeningHours(business.opening_hours)
  }
  if(Number.isFinite(Number(business.latitude))&&Number.isFinite(Number(business.longitude))){
    localBusiness.geo={
      '@type':'GeoCoordinates',
      latitude:Number(business.latitude),
      longitude:Number(business.longitude)
    }
  }

  setJsonLd('vl-seo-schema',{'@context':'https://schema.org','@graph':[
    {...baseWebsite},
    {'@type':'WebPage','@id':businessUrl+'#webpage',url:businessUrl,name:title,description:description,inLanguage:'pt-BR',mainEntity:{'@id':businessUrl+'#business'}},
    localBusiness,
    createBreadcrumbs(cityName)
  ]})
}

const enrich=async()=>{
  if(robots.startsWith('noindex'))return
  if(parts[1]==='empresa'){
    await enrichBusinessMetadata()
    return
  }
  if(parts[1]==='eventos'){
    await enrichEventsMetadata()
    return
  }
  await enrichCityMetadata()
}
void enrich()
