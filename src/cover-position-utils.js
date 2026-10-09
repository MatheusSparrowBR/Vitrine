// Proporções reais das áreas onde a capa aparece (medidas no site).
// O editor usa estas mesmas proporções, para que a área segura corresponda ao que o visitante vê.
export const COVER_FRAMES={
 profile:{desktop:{width:1000,height:400},mobile:{width:360,height:200}},
 home:{desktop:{width:1440,height:700},mobile:{width:390,height:570}}
}
// Largura mínima recomendada da imagem original (2x no celular, para telas de alta densidade).
export const COVER_MIN_WIDTHS={
 profile:{desktop:1000,mobile:720},
 home:{desktop:1440,mobile:780}
}
export const COVER_FRAME_REFERENCE={desktop:{width:1180,height:330},mobile:{width:360,height:180}}
export const DEFAULT_COVER_POSITION={xPct:0,yPct:0,zoom:1,scaleX:1,scaleY:1,unit:'percent'}
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value))
const numberOr=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback

// "cover" preenche a área (corta as bordas); "contain" mostra a imagem inteira (logos).
export function coverFitOf(value={}){return value&&value.fit==='contain'?'contain':'cover'}

export function normalizeCoverPosition(value={},mode='desktop'){
 const raw=value&&typeof value==='object'?value:{}
 const fit=raw.fit==='contain'?{fit:'contain'}:{}
 if(raw.unit==='percent'||raw.xPct!=null||raw.yPct!=null){
  return {
   xPct:clamp(numberOr(raw.xPct,0),-50,50),
   yPct:clamp(numberOr(raw.yPct,0),-50,50),
   zoom:clamp(numberOr(raw.zoom,1),0.6,1.8),
   scaleX:clamp(numberOr(raw.scaleX,1),0.6,1.8),
   scaleY:clamp(numberOr(raw.scaleY,1),0.6,1.8),
   unit:'percent',
   ...fit
  }
 }
 const ref=COVER_FRAME_REFERENCE[mode]||COVER_FRAME_REFERENCE.desktop
 return {
  xPct:clamp((Number(raw.x)||0)/ref.width*100,-50,50),
  yPct:clamp((Number(raw.y)||0)/ref.height*100,-50,50),
  zoom:clamp(numberOr(raw.zoom,1),0.6,1.8),
  scaleX:clamp(numberOr(raw.scaleX,1),0.6,1.8),
  scaleY:clamp(numberOr(raw.scaleY,1),0.6,1.8),
  unit:'percent',
  ...fit
 }
}

export function coverPositionCssVars(value={},mode='desktop'){
 const p=normalizeCoverPosition(value,mode)
 return mode==='mobile'
  ? {'--cover-x-mobile':p.xPct+'%','--cover-y-mobile':p.yPct+'%','--cover-zoom-mobile':String(p.zoom),'--cover-scalex-mobile':String(p.scaleX),'--cover-scaley-mobile':String(p.scaleY)}
  : {'--cover-x-desktop':p.xPct+'%','--cover-y-desktop':p.yPct+'%','--cover-zoom-desktop':String(p.zoom),'--cover-scalex-desktop':String(p.scaleX),'--cover-scaley-desktop':String(p.scaleY)}
}
