const esc=value=>String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')
const absolute=(origin,path)=>`${origin}${path.startsWith('/')?path:`/${path}`}`
const originFromRequest=req=>{const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();return host?`${proto}://${host}`:null}
const fetchPublic=async path=>{const base=String(process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');const key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY||'';if(!base||!key)return null;const response=await fetch(`${base}/rest/v1/${path}`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});if(!response.ok)throw new Error(`Supabase sitemap request failed: ${response.status}`);return response.json()}
export default async function handler(req,res){if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end('Method Not Allowed')}
 const origin=originFromRequest(req);if(!origin){res.statusCode=400;return res.end('Missing host')}
 try{
  const cities=await fetchPublic('cities?select=slug&active=eq.true&order=name.asc')||[{slug:'laguna'}]
  const urls=new Map();const add=(path,changefreq='weekly',priority='0.7')=>urls.set(path,{path,changefreq,priority})
  add('/','weekly','0.8');add('/planos','monthly','0.7')
  for(const city of cities){const slug=encodeURIComponent(city.slug);add(`/${slug}`,'daily','1.0');add(`/${slug}/empresas`,'daily','0.9');add(`/${slug}/promocoes`,'daily','0.8');add(`/${slug}/eventos`,'daily','0.8')}
  const businesses=await fetchPublic('public_business_directory?select=slug,city_id&limit=5000')||[]
  const cityById={};for(const city of cities)cityById[city.id]=city.slug
  try{const rows=await fetchPublic('cities?select=id,slug&active=eq.true&limit=5000')||[];for(const row of rows)cityById[row.id]=row.slug}catch{}
  for(const business of businesses){const citySlug=cityById[business.city_id];if(citySlug&&business.slug)add(`/${encodeURIComponent(citySlug)}/empresa/${encodeURIComponent(business.slug)}`,'weekly','0.8')}
  const body=[`<?xml version="1.0" encoding="UTF-8"?>`,`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,...Array.from(urls.values()).map(item=>`<url><loc>${esc(absolute(origin,item.path))}</loc><changefreq>${item.changefreq}</changefreq><priority>${item.priority}</priority></url>`),'</urlset>'].join('')
  res.statusCode=200;res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');return res.end(body)
 }catch{const body=[`<?xml version="1.0" encoding="UTF-8"?>`,`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,`<url><loc>${esc(absolute(origin,'/'))}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`,`<url><loc>${esc(absolute(origin,'/laguna'))}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,'</urlset>'].join('');res.statusCode=200;res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=60');return res.end(body)}}
