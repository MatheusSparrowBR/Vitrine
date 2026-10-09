import { useState } from 'react'
import { renderPromotionShareCard, shareCardModel, SHARE_CARD_SITE } from './promotion-share-card.js'
import './promotion-share.css'

// Gera o cartão da promoção (imagem 1080×1350) e compartilha pelo sistema, ou baixa o PNG.
// O WhatsApp recebe o texto e o link; a imagem vai pelo compartilhamento nativo quando o aparelho permite.
export default function PromotionShareButton({ promotion, businessName, cityName, logoUrl, imageUrl }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function share(event) {
    event.preventDefault()
    event.stopPropagation()
    if (busy) return
    setBusy(true)
    setNote('')
    try {
      const blob = await renderPromotionShareCard(promotion, { businessName, cityName }, { imageUrl: imageUrl || promotion?.image_url, logoUrl })
      const slug = String(promotion?.title || 'promocao').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'promocao'
      const file = new File([blob], `${slug}.png`, { type: 'image/png' })
      const model = shareCardModel(promotion, { businessName, cityName })
      const text = `${model.title}${model.business ? ` · ${model.business}` : ''}${model.priceText ? ` por ${model.priceText}` : ''}`
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: model.title, text, url: `https://${SHARE_CARD_SITE}` })
        setNote('Cartão compartilhado.')
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = file.name
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        setNote('Cartão baixado. Envie a imagem pelo WhatsApp ou Instagram.')
      }
    } catch (error) {
      // Cancelar o compartilhamento do sistema não é erro.
      if (error?.name !== 'AbortError') setNote('Não foi possível gerar o cartão agora.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="promo-share">
      <button type="button" className="promo-share-btn" onClick={share} disabled={busy} aria-label={`Criar cartão para compartilhar: ${promotion?.title || 'promoção'}`}>
        {busy ? 'Gerando cartão…' : '↗ Compartilhar cartão'}
      </button>
      {note && <small className="promo-share-note" role="status">{note}</small>}
    </div>
  )
}
