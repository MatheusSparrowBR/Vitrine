export const COVER_FRAME_REFERENCE={desktop:{width:1180,height:330},mobile:{width:360,height:180}}
export const DEFAULT_COVER_POSITION={xPct:0,yPct:0,zoom:1,scaleX:1,scaleY:1,unit:'percent'}

export function normalizeCoverPosition(value={},mode='desktop'){
 const raw=value&&typeof value==='object'?value:{}
 if(raw.unit==='percent'||raw.xPct!=null||raw.yPct!=null){
  return {
   xPct:Number.isFinite(Number(raw.xPct))?Number(raw.xPct):0,
   yPct:Number.isFinite(Number(raw.yPct))?Number(raw.yPct):0,
   zoom:Number.isFinite(Number(raw.zoom))?Number(raw.zoom):1,
   scaleX:Number.isFinite(Number(raw.scaleX))?Number(raw.scaleX):1,
   scaleY:Number.isFinite(Number(raw.scaleY))?Number(raw.scaleY):1,
   unit:'percent'
  }
 }
 const ref=COVER_FRAME_REFERENCE[mode]||COVER_FRAME_REFERENCE.desktop
 return {
  xPct:(Number(raw.x)||0)/ref.width*100,
  yPct:(Number(raw.y)||0)/ref.height*100,
  zoom:Number.isFinite(Number(raw.zoom))?Number(raw.zoom):1,
  scaleX:Number.isFinite(Number(raw.scaleX))?Number(raw.scaleX):1,
  scaleY:Number.isFinite(Number(raw.scaleY))?Number(raw.scaleY):1,
  unit:'percent'
 }
}

export function coverPositionCssVars(value={},mode='desktop'){
 const p=normalizeCoverPosition(value,mode)
 return mode==='mobile'
  ? {'--cover-x-mobile':p.xPct+'%','--cover-y-mobile':p.yPct+'%','--cover-zoom-mobile':String(p.zoom),'--cover-scalex-mobile':String(p.scaleX),'--cover-scaley-mobile':String(p.scaleY)}
  : {'--cover-x-desktop':p.xPct+'%','--cover-y-desktop':p.yPct+'%','--cover-zoom-desktop':String(p.zoom),'--cover-scalex-desktop':String(p.scaleX),'--cover-scaley-desktop':String(p.scaleY)}
}
