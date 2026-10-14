// Textos dos planos para as telas de apresentação. Os dados vêm da tabela plans, o mesmo que o admin edita.

const LIMIT_LABELS = {
  photos: n => `Até ${n} fotos/mídias`,
  items: n => `Até ${n} produtos/serviços`,
  promotions: n => (n === 1 ? 'Até 1 promoção' : `Até ${n} promoções`),
}

const FEATURE_LABELS = {
  analytics: 'Analytics comercial',
  featured: 'Destaque nas buscas',
  verified: 'Selo de verificação',
  advanced_analytics: 'Estatísticas avançadas',
  city_instagram: 'Presença no Instagram da cidade',
  review_management: 'Reputação + respostas às avaliações',
  job_postings: 'Vagas de emprego no perfil',
  event_publishing: 'Publicação de eventos na agenda',
}

// Ordem em que os recursos aparecem. Mesma ordem usada na página de planos.
const DISPLAY_ORDER = ['photos', 'items', 'promotions', 'analytics', 'featured', 'verified', 'advanced_analytics', 'city_instagram', 'review_management', 'job_postings', 'event_publishing']

export const PLAN_CATEGORY_LABELS = { free: 'COMECE AQUI', pro: 'RECOMENDADO', premium: 'MAIS COMPLETO' }

// Lista de recursos de um plano, só com o que está ativo ou com limite maior que zero.
export function planFeatureLines(features = {}) {
  return DISPLAY_ORDER.map(key => {
    if (LIMIT_LABELS[key]) {
      const limit = Number(features[`${key}_limit`] ?? features[key])
      return limit > 0 ? LIMIT_LABELS[key](limit) : null
    }
    return features[key] === true ? FEATURE_LABELS[key] : null
  }).filter(Boolean)
}

export function formatPlanPrice(value) {
  const number = Number(value)
  if (value == null || value === '' || !Number.isFinite(number)) return ''
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Planos de reserva, usados só quando o banco não responde ou não tem planos ativos.
export const FALLBACK_PLANS = [
  {
    code: 'free',
    label: PLAN_CATEGORY_LABELS.free,
    name: 'Grátis',
    description: 'Presença básica e recursos essenciais para começar no VitrineLocal.',
    price: 'R$ 0,00',
    features: ['Até 5 fotos/mídias', 'Até 10 produtos/serviços', 'Até 1 promoção'],
  },
  {
    code: 'pro',
    label: PLAN_CATEGORY_LABELS.pro,
    name: 'Pro',
    description: 'Mais destaque e recursos para crescer com sua empresa.',
    price: 'R$ 29,90',
    features: ['Até 30 fotos/mídias', 'Até 50 produtos/serviços', 'Até 5 promoções', 'Analytics comercial', 'Destaque nas buscas', 'Selo de verificação'],
  },
  {
    code: 'premium',
    label: PLAN_CATEGORY_LABELS.premium,
    name: 'Premium',
    description: 'Máxima presença, reputação avançada e recursos exclusivos, incluindo resposta às avaliações e estatísticas avançadas.',
    price: 'R$ 59,90',
    features: ['Até 100 fotos/mídias', 'Até 200 produtos/serviços', 'Até 20 promoções', 'Analytics comercial', 'Destaque nas buscas', 'Selo de verificação', 'Estatísticas avançadas', 'Reputação + respostas às avaliações'],
  },
];

// Planos ativos, na ordem de exibição. Usa os planos de reserva quando a leitura falha ou está vazia.
export async function loadPublicPlans(db) {
  if (!db) return FALLBACK_PLANS
  const { data, error } = await db.from('plans')
    .select('id,code,name,description,price_monthly,features,sort_order')
    .eq('active', true)
    .order('sort_order')
    .order('price_monthly')
  if (error || !data || data.length === 0) return FALLBACK_PLANS
  return data.map(plan => ({
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description || '',
    price: formatPlanPrice(plan.price_monthly),
    features: planFeatureLines(plan.features || {}),
    label: PLAN_CATEGORY_LABELS[plan.code] || 'PLANOS',
  }))
}
