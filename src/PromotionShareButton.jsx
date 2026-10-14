import ShareCardButton from './ShareCardButton.jsx'
import { renderPromotionShareCard, shareCardModel, SHARE_CARD_SITE } from './promotion-share-card.js'

// Cartão da promoção (imagem 1080×1350) para compartilhar no WhatsApp ou Instagram.
export default function PromotionShareButton({ promotion, businessName, cityName, logoUrl, imageUrl }) {
  const model = shareCardModel(promotion, { businessName, cityName })
  const text = `${model.title}${model.business ? ` · ${model.business}` : ''}${model.priceText ? ` por ${model.priceText}` : ''}`
  return (
    <ShareCardButton
      buildBlob={() => renderPromotionShareCard(promotion, { businessName, cityName }, { imageUrl: imageUrl || promotion?.image_url, logoUrl })}
      fileName={promotion?.title || 'promocao'}
      shareTitle={model.title}
      shareText={text}
      shareUrl={`https://${SHARE_CARD_SITE}`}
      ariaLabel={`Criar cartão para compartilhar: ${promotion?.title || 'promoção'}`}
    />
  )
}
