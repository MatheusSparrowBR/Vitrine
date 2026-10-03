
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const origin = (process.env.SITE_URL || 'https://vitrinelocal.net').replace(/\/$/, '')
const supabaseUrl = String(process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

const esc = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const encodePath = value => encodeURIComponent(String(value || ''))
const validDate = value => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : ''
}
const rowsToUrls = rows => rows
  .filter(Boolean)
  .map(({ path, changefreq = 'weekly', priority = '0.7', lastmod = '' }) => ({ path, changefreq, priority, lastmod }))

async function supabasePublic(path) {
  if (!supabaseUrl || !publishableKey) return []
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
  })
  if (!response.ok) throw new Error(`Supabase sitemap request failed: ${response.status}`)
  return response.json()
}

async function buildUrls() {
  const urls = new Map()
  const add = (path, changefreq = 'weekly', priority = '0.7', lastmod = '') => {
    urls.set(path, { path, changefreq, priority, lastmod })
  }

  add('/', 'weekly', '0.8')
  add('/planos', 'monthly', '0.7')

  if (!supabaseUrl || !publishableKey) {
    console.warn('[sitemap] Supabase public configuration is unavailable; generating the safe public fallback for Laguna.')
    add('/laguna', 'daily', '1.0')
    add('/laguna/empresas', 'daily', '0.9')
    add('/laguna/promocoes', 'daily', '0.8')
    add('/laguna/eventos', 'daily', '0.8')
    return rowsToUrls([...urls.values()])
  }

  try {
    const cities = await supabasePublic('cities?select=id,slug,name,updated_at&active=eq.true&order=name.asc&limit=5000')
    const cityById = Object.fromEntries(cities.map(city => [city.id, city.slug]))

    for (const city of cities) {
      const slug = encodePath(city.slug)
      const lastmod = validDate(city.updated_at)
      add(`/${slug}`, 'daily', '1.0', lastmod)
      add(`/${slug}/empresas`, 'daily', '0.9', lastmod)
      add(`/${slug}/promocoes`, 'daily', '0.8', lastmod)
      add(`/${slug}/eventos`, 'daily', '0.8', lastmod)
    }

    const [businesses,categories] = await Promise.all([
      supabasePublic('public_business_directory?select=slug,city_id,updated_at,category_slug&limit=5000'),
      supabasePublic('categories?select=slug&active=eq.true&limit=5000'),
    ])
    const activeCategorySlugs = new Set((categories||[]).map(category => String(category.slug||'').trim()).filter(Boolean))
    const categoryLastmod = new Map()

    for (const business of businesses) {
      const citySlug = cityById[business.city_id]
      if (citySlug && business.slug) {
        add(
          `/${encodePath(citySlug)}/empresa/${encodePath(business.slug)}`,
          'weekly',
          '0.8',
          validDate(business.updated_at),
        )
      }
      const categorySlug = String(business.category_slug||'').trim()
      const lastmod = validDate(business.updated_at)
      if (citySlug && activeCategorySlugs.has(categorySlug) && categorySlug) {
        const key = `${citySlug}::${categorySlug}`
        const previous = categoryLastmod.get(key)||''
        if (lastmod && (!previous || new Date(lastmod).getTime()>new Date(previous).getTime())) categoryLastmod.set(key,lastmod)
        else if (!previous) categoryLastmod.set(key,'')
      }
    }

    for (const [key,lastmod] of categoryLastmod) {
      const [citySlug,categorySlug] = key.split('::')
      add(`/${encodePath(citySlug)}/empresas/categoria/${encodePath(categorySlug)}`,'daily','0.85',lastmod)
    }
  } catch (error) {
    console.warn(`[sitemap] ${error instanceof Error ? error.message : String(error)}`)
    // Keep the build resilient even if Supabase is temporarily unavailable.
    add('/laguna', 'daily', '1.0')
    add('/laguna/empresas', 'daily', '0.9')
    add('/laguna/promocoes', 'daily', '0.8')
    add('/laguna/eventos', 'daily', '0.8')
  }

  return rowsToUrls([...urls.values()])
}

const urls = await buildUrls()
const body = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(item => {
    const lastmod = item.lastmod ? `<lastmod>${esc(item.lastmod)}</lastmod>` : ''
    return `<url><loc>${esc(origin + (item.path.startsWith('/') ? item.path : `/${item.path}`))}</loc><changefreq>${item.changefreq}</changefreq><priority>${item.priority}</priority>${lastmod}</url>`
  }),
  '</urlset>',
  '',
].join('\n')

await mkdir('public', { recursive: true })
await writeFile(join('public', 'sitemap.xml'), body, 'utf8')
console.log(`[sitemap] generated ${urls.length} URLs at public/sitemap.xml`)
