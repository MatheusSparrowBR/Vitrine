// Proporções reais das áreas onde a capa e a logo aparecem (medidas no site).
// O editor usa estas mesmas proporções, para que a área segura corresponda ao que o visitante vê.
export const COVER_FRAMES={
 profile:{desktop:{width:1000,height:400},mobile:{width:360,height:200}},
 home:{desktop:{width:1600,height:720},mobile:{width:390,height:570}},
 logo:{desktop:{width:1,height:1},mobile:{width:1,height:1}}
}
// Largura mínima recomendada da imagem original (2x no celular, para telas de alta densidade).
export const COVER_MIN_WIDTHS={
 profile:{desktop:1000,mobile:720},
 home:{desktop:1920,mobile:780},
 logo:{desktop:1000,mobile:1000}
}
export const COVER_FRAME_REFERENCE={desktop:{width:1180,height:330},mobile:{width:360,height:180}}
export const DEFAULT_COVER_POSITION={xPct:0,yPct:0,zoom:1,scaleX:1,scaleY:1,unit:'percent'}
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value))
const numberOr=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback

// "cover" preenche a área (corta as bordas) e nunca deixa espaço vazio; "contain" mostra a imagem inteira (logos).
export function coverFitOf(value={}){return value&&value.fit==='contain'?'contain':'cover'}

export function normalizeCoverPosition(value={},mode='desktop'){
 const raw=value&&typeof value==='object'?value:{}
 const fit=coverFitOf(raw)
 const minScale=fit==='cover'?1:0.6
 let xPct,yPct
 if(raw.unit==='percent'||raw.xPct!=null||raw.yPct!=null){
  xPct=numberOr(raw.xPct,0)
  yPct=numberOr(raw.yPct,0)
 }else{
  const ref=COVER_FRAME_REFERENCE[mode]||COVER_FRAME_REFERENCE.desktop
  xPct=(Number(raw.x)||0)/ref.width*100
  yPct=(Number(raw.y)||0)/ref.height*100
 }
 const zoom=clamp(numberOr(raw.zoom,1),minScale,1.8)
 const scaleX=clamp(numberOr(raw.scaleX,1),minScale,1.8)
 const scaleY=clamp(numberOr(raw.scaleY,1),minScale,1.8)
 // Na capa, o deslocamento máximo é o que ainda deixa a imagem cobrindo a área (sem buracos).
 const limitX=fit==='cover'?clamp((zoom*scaleX-1)/2*100,0,50):50
 const limitY=fit==='cover'?clamp((zoom*scaleY-1)/2*100,0,50):50
 const out={
  xPct:clamp(xPct,-limitX,limitX),
  yPct:clamp(yPct,-limitY,limitY),
  zoom,
  scaleX,
  scaleY,
  unit:'percent'
 }
 if(fit==='contain')out.fit='contain'
 return out
}

export function coverPositionCssVars(value={},mode='desktop'){
 const p=normalizeCoverPosition(value,mode)
 return mode==='mobile'
  ? {'--cover-x-mobile':p.xPct+'%','--cover-y-mobile':p.yPct+'%','--cover-zoom-mobile':String(p.zoom),'--cover-scalex-mobile':String(p.scaleX),'--cover-scaley-mobile':String(p.scaleY)}
  : {'--cover-x-desktop':p.xPct+'%','--cover-y-desktop':p.yPct+'%','--cover-zoom-desktop':String(p.zoom),'--cover-scalex-desktop':String(p.scaleX),'--cover-scaley-desktop':String(p.scaleY)}
}
