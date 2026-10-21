// Formatação e cálculos do painel de analytics (sem interface, fáceis de testar).
// Os dados vêm de admin_analytics_overview; datas em horário de São Paulo.

export const fmt = value => Number(value || 0).toLocaleString('pt-BR')
export const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Percentual de value sobre total, com uma casa decimal ("0.0" quando não há total).
export function pct(value, total) {
  return total ? ((Number(value || 0) / Number(total)) * 100).toFixed(1) : '0.0'
}

// Variação em relação ao período anterior ("+12.5%"), ou null quando não há base de comparação.
export function delta(current, previous) {
  const c = Number(current || 0)
  const p = Number(previous || 0)
  if (!p) return null
  const d = ((c - p) / p) * 100
  return (d > 0 ? '+' : '') + d.toFixed(1) + '%'
}

export function deltaClass(current, previous) {
  const c = Number(current || 0)
  const p = Number(previous || 0)
  return c > p ? 'positive' : c < p ? 'negative' : 'neutral'
}

// Soma de tipos de evento num mapa de contagens ({ tipo: n }).
export function countOf(totals, types) {
  return types.reduce((sum, type) => sum + Number(totals?.[type] || 0), 0)
}

// Tipos de evento que contam como contato com a empresa.
export const CONTACT_TYPES = ['whatsapp_click', 'instagram_click', 'website_click']

export const contactsOf = totals => countOf(totals, CONTACT_TYPES)

// Etapas do funil de descoberta, do acesso ao contato. Cada etapa traz a taxa sobre a anterior.
export function funnelSteps(current, daily) {
  const visits = countOf(current, ['page_view'])
  const clicks = countOf(current, ['business_click'])
  const views = countOf(current, ['profile_view'])
  const contacts = contactsOf(current)
  const steps = [
    { label: 'Visualizações de página', value: visits },
    { label: 'Cliques em empresas', value: clicks },
    { label: 'Visitas ao perfil', value: views },
    { label: 'Contatos', value: contacts },
  ]
  return steps.map((step, i) => ({
    ...step,
    rate: i === 0 ? null : pct(step.value, steps[i - 1].value),
    share: pct(step.value, steps[0].value),
  }))
}

// Dia de maior movimento de visitas ao perfil, ou null quando não houve visitas.
export function peakDay(daily) {
  let best = null
  for (const d of daily || []) {
    if (!best || d.profile_views > best.profile_views) best = d
  }
  return best && best.profile_views > 0 ? best : null
}

// Data 'YYYY-MM-DD' no formato completo "21/10/2026".
export function dateLong(day) {
  if (!day) return ''
  const [y, m, d] = String(day).split('-')
  return `${d}/${m}/${y}`
}

// Data 'YYYY-MM-DD' no formato curto "21/10".
export function dayLabel(day) {
  if (!day) return ''
  const [y, m, d] = String(day).split('-')
  return `${d}/${m}`
}

// Pontos de uma linha do gráfico (SVG com viewBox largura × altura), ex.: "0,100 10,80 …".
export function linePoints(daily, key, width, height, max) {
  const list = daily || []
  if (!list.length) return ''
  const step = list.length > 1 ? width / (list.length - 1) : 0
  return list
    .map((d, i) => {
      const x = (i * step).toFixed(1)
      const y = (height - (Number(d[key] || 0) / Math.max(1, max)) * height).toFixed(1)
      return `${x},${y}`
    })
    .join(' ')
}

// Maior valor entre as séries mostradas no gráfico (para escalar o eixo).
export function chartMax(daily, keys) {
  let max = 1
  for (const d of daily || []) for (const k of keys) max = Math.max(max, Number(d[k] || 0))
  return max
}
