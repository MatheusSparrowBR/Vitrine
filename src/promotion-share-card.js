import { promotionDiscountPercent, promotionValidUntil } from './promotion-service.js'

// Formato retrato 4:5, o que funciona bem no feed do Instagram e no WhatsApp.
export const SHARE_CARD_WIDTH = 1080
export const SHARE_CARD_HEIGHT = 1350
export const SHARE_CARD_SITE = 'vitrinelocal.net'

const money = value => {
  const number = Number(value)
  if (value == null || value === '' || !Number.isFinite(number)) return ''
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Textos do cartão, sem depender do Canvas (fácil de testar).
export function shareCardModel(promotion, { businessName = '', cityName = '' } = {}) {
  const discount = promotionDiscountPercent(promotion)
  const validUntil = promotionValidUntil(promotion)
  return {
    title: String(promotion?.title || 'Promoção').trim(),
    business: String(businessName || promotion?.businesses?.name || '').trim(),
    location: cityName ? `${cityName} · ${SHARE_CARD_SITE}` : SHARE_CARD_SITE,
    discountText: discount === null ? '' : `-${discount}%`,
    priceText: money(promotion?.price),
    originalText: money(promotion?.original_price),
    validText: validUntil ? `Válida até ${validUntil}` : ''
  }
}

// Quebra o texto em linhas que cabem na largura. `measure` recebe um trecho e devolve a largura em pixels.
// Se o texto não couber em `maxLines`, a última linha recebe reticências.
export function wrapText(text, maxWidth, measure, maxLines = 3) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (measure(candidate) <= maxWidth || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last.length > 1 && measure(`${last}…`) > maxWidth) last = last.slice(0, -1).trimEnd()
  kept[maxLines - 1] = `${last}…`
  return kept
}

function loadImage(url) {
  return new Promise(resolve => {
    if (!url) return resolve(null)
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

function drawCover(ctx, image) {
  const scale = Math.max(SHARE_CARD_WIDTH / image.width, SHARE_CARD_HEIGHT / image.height)
  const width = image.width * scale
  const height = image.height * scale
  ctx.drawImage(image, (SHARE_CARD_WIDTH - width) / 2, (SHARE_CARD_HEIGHT - height) / 2, width, height)
}

function paint(ctx, model, { image, logo }) {
  ctx.fillStyle = '#0b1424'
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT)
  if (image) drawCover(ctx, image)

  // Degradê escuro na parte de baixo para o texto ficar legível.
  const shade = ctx.createLinearGradient(0, SHARE_CARD_HEIGHT * 0.35, 0, SHARE_CARD_HEIGHT)
  shade.addColorStop(0, 'rgba(7,13,24,0)')
  shade.addColorStop(0.45, 'rgba(7,13,24,0.82)')
  shade.addColorStop(1, 'rgba(7,13,24,0.94)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT)

  if (logo) {
    ctx.save()
    ctx.fillStyle = '#fefefe'
    roundRect(ctx, 56, 56, 140, 140, 28)
    ctx.fill()
    ctx.clip()
    drawCover(ctx, logo)
    ctx.restore()
  }

  if (model.discountText) {
    ctx.fillStyle = '#e5484d'
    ctx.beginPath()
    ctx.arc(SHARE_CARD_WIDTH - 150, 150, 110, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 84px system-ui, "Segoe UI", Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(model.discountText, SHARE_CARD_WIDTH - 150, 150)
  }

  const left = 72
  const maxWidth = SHARE_CARD_WIDTH - left * 2
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffffff'

  let y = 880
  ctx.font = '800 34px system-ui, "Segoe UI", Arial, sans-serif'
  ctx.fillStyle = '#f5b841'
  ctx.fillText('PROMOÇÃO', left, y)

  y += 70
  ctx.font = '900 78px system-ui, "Segoe UI", Arial, sans-serif'
  ctx.fillStyle = '#ffffff'
  const measureTitle = text => ctx.measureText(text).width
  for (const line of wrapText(model.title, maxWidth, measureTitle, 3)) {
    ctx.fillText(line, left, y)
    y += 92
  }

  if (model.business) {
    ctx.font = '700 40px system-ui, "Segoe UI", Arial, sans-serif'
    ctx.fillStyle = '#d6e2f2'
    ctx.fillText(model.business, left, y + 8)
    y += 70
  }

  if (model.priceText || model.originalText) {
    ctx.font = '900 64px system-ui, "Segoe UI", Arial, sans-serif'
    ctx.fillStyle = '#ffffff'
    let x = left
    if (model.priceText) {
      ctx.fillText(model.priceText, x, y + 14)
      x += ctx.measureText(model.priceText).width + 28
    }
    if (model.originalText) {
      ctx.font = '600 40px system-ui, "Segoe UI", Arial, sans-serif'
      ctx.fillStyle = '#9fb0c7'
      ctx.fillText(model.originalText, x, y + 14)
      const width = ctx.measureText(model.originalText).width
      ctx.fillRect(x, y + 2, width, 4)
    }
    y += 70
  }

  if (model.validText) {
    ctx.font = '700 36px system-ui, "Segoe UI", Arial, sans-serif'
    ctx.fillStyle = '#f5b841'
    ctx.fillText(model.validText, left, y + 8)
  }

  ctx.font = '700 32px system-ui, "Segoe UI", Arial, sans-serif'
  ctx.fillStyle = '#9fb0c7'
  ctx.fillText(model.location, left, SHARE_CARD_HEIGHT - 60)
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

// Gera o cartão em PNG. Se a imagem não puder ser usada (CORS), gera sem ela em vez de falhar.
export async function renderPromotionShareCard(promotion, meta = {}, { imageUrl = '', logoUrl = '' } = {}) {
  const model = shareCardModel(promotion, meta)
  const [image, logo] = await Promise.all([loadImage(imageUrl), loadImage(logoUrl)])
  const canvas = document.createElement('canvas')
  canvas.width = SHARE_CARD_WIDTH
  canvas.height = SHARE_CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  paint(ctx, model, { image, logo })
  const toBlob = () => new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('blob'))), 'image/png'))
  try {
    return await toBlob()
  } catch {
    // Canvas "sujo" por imagem sem CORS: refaz o cartão só com a cor de fundo.
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    paint(ctx, model, { image: null, logo: null })
    return toBlob()
  }
}
