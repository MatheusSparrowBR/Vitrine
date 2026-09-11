const PRIVATE_PREFIXES=['/admin','/conta','/login','/atualizar-senha']
const CITY_NAMES={laguna:'Laguna'}
const humanize=v=>String(v||'').split('-').filter(Boolean).map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ')
const firstMeta=(attr,value,content)=>{let el=document.head.querySelector(`meta[${attr}="${value}"]`);if(!el){el=document.createElement('meta');el.setAttribute(attr,value);document.head.appendChild(el)}el.setAttribute('content',content)}
const linkRel=(rel,href)=>{let el=document.head.querySelector(`link[rel="${rel}"]`);if(!el){el=document.createElement('link');el.rel=rel;document.head.appendChild(el)}el.href=href}
const path=location.pathname.replace(/\/+$/,'')||'/'
const parts=path.split('/').filter(Boolean).map(v=>decodeURIComponent(v))
const citySlug=parts[0]&&!['login','planos','conta','admin','privacidade','termos','atualizar-senha'].includes(parts[0].toLowerCase())?parts[0].toLowerCase():''
const cityName=CITY_NAMES[citySlug]||humanize(citySlug)||'sua cidade'
let title='VitrineLocal | Empresas, promoções e eventos locais'
let description='Encontre empresas, serviços, promoções e eventos perto de você no VitrineLocal.'
let robots='index,follow,max-image-preview:large'
if(path==='/'){title='VitrineLocal | Descubra o melhor da sua cidade';description='A vitrine digital da cidade: empresas, serviços, promoções e eventos em um só lugar.'}
else if(parts.length===1&&citySlug){title=`VitrineLocal ${cityName} | Empresas, promoções e eventos`;description=`Descubra empresas, serviços, promoções e eventos em ${cityName}. Encontre tudo o que a cidade tem de melhor.`}
else if(citySlug&&parts[1]==='empresas'){title=`Empresas em ${cityName} | VitrineLocal`;description=`Encontre empresas, serviços, categorias e negócios locais em ${cityName}.`}
else if(citySlug&&parts[1]==='promocoes'){title=`Promoções em ${cityName} | VitrineLocal`;description=`Confira ofertas e promoções publicadas por empresas de ${cityName}.`}
else if(citySlug&&parts[1]==='eventos'){title=`Eventos em ${cityName} | VitrineLocal`;description=`Veja os próximos eventos e o que está acontecendo em ${cityName}.`}
else if(citySlug&&parts[1]==='empresa'){title=`Empresa em ${cityName} | VitrineLocal`;description=`Conheça esta empresa local, seus serviços, contatos, horários, promoções e mídias no VitrineLocal.`}
else if(path==='/planos'){title='Planos para empresas | VitrineLocal';description='Escolha o plano VitrineLocal que melhor ajuda sua empresa a ganhar presença e destaque.'}
if(PRIVATE_PREFIXES.some(prefix=>path===prefix||path.startsWith(prefix+'/'))){robots='noindex,nofollow,noarchive';title=path.startsWith('/admin')?'Administração | VitrineLocal':path==='/login'?'Entrar | VitrineLocal':'Minha conta | VitrineLocal'}
document.title=title
firstMeta('name','description',description)
firstMeta('name','robots',robots)
firstMeta('name','theme-color','#1677ff')
firstMeta('property','og:title',title)
firstMeta('property','og:description',description)
firstMeta('property','og:type','website')
firstMeta('property','og:url',location.origin+path)
firstMeta('property','og:image',location.origin+'/laguna-hero.svg')
firstMeta('property','og:site_name','VitrineLocal')
firstMeta('name','twitter:card','summary_large_image')
firstMeta('name','twitter:title',title)
firstMeta('name','twitter:description',description)
firstMeta('name','twitter:image',location.origin+'/laguna-hero.svg')
linkRel('canonical',location.origin+path)
const schemaId='vl-seo-schema'
let schema=document.getElementById(schemaId)
if(!schema){schema=document.createElement('script');schema.id=schemaId;schema.type='application/ld+json';document.head.appendChild(schema)}
schema.textContent=JSON.stringify({
 '@context':'https://schema.org',
 '@type':'WebSite',
 name:'VitrineLocal',
 url:location.origin,
 inLanguage:'pt-BR',
 potentialAction:{'@type':'SearchAction',target:`${location.origin}/${citySlug||'laguna'}/empresas?q={search_term_string}`, 'query-input':'required name=search_term_string'}
})
