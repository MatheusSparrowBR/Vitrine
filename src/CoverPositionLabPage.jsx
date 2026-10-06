import React,{useEffect,useRef,useState}from'react'
import './cover-position-lab.css'

const DEFAULT={
 x:0,
 y:0,
 zoom:0.85,
 desktop:{x:0,y:0,zoom:0.85},
 mobile:{x:0,y:0,zoom:0.85}
}

const clamp=(v,min,max)=>Math.min(max,Math.max(min,v))

function loadImage(src){
 return new Promise((resolve,reject)=>{
  const img=new Image()
  img.onload=()=>resolve(img)
  img.onerror=reject
  img.src=src
 })
}

export default function CoverPositionLabPage(){
 const[fileUrl,setFileUrl]=useState('')
 const[fileName,setFileName]=useState('')
 const[mode,setMode]=useState('desktop')
 const[settings,setSettings]=useState(()=>JSON.parse(localStorage.getItem('vitrine-cover-position-lab')||'null')||DEFAULT)
 const[drag,setDrag]=useState(null)
 const inputRef=useRef(null)

 const current=settings[mode]||DEFAULT

 useEffect(()=>{
  document.title='Editor de Capa | VitrineLocal Lab'
  const meta=document.querySelector('meta[name="robots"]')
  const old=meta?.getAttribute('content')
  if(meta)meta.setAttribute('content','noindex,nofollow,noarchive')
  return()=>{document.title='VitrineLocal';if(meta&&old)meta.setAttribute('content',old)}
 },[])

 const update=(patch)=>{
  setSettings(prev=>{
   const next={...prev,[mode]:{...prev[mode],...patch}}
   return next
  })
 }

 const onFile=async e=>{
  const file=e.target.files?.[0]
  if(!file)return
  const url=URL.createObjectURL(file)
  try{await loadImage(url);setFileUrl(url);setFileName(file.name)}catch{URL.revokeObjectURL(url)}
 }

 const onPointerDown=e=>{
  if(!fileUrl)return
  e.currentTarget.setPointerCapture?.(e.pointerId)
  setDrag({x:e.clientX,y:e.clientY,startX:current.x,startY:current.y})
 }
 const onPointerMove=e=>{
  if(!drag)return
  const dx=e.clientX-drag.x
  const dy=e.clientY-drag.y
  update({
   x:clamp(drag.startX+dx,-280,280),
   y:clamp(drag.startY+dy,-180,180)
  })
 }
 const onPointerUp=()=>setDrag(null)

 const reset=()=>update({x:0,y:0,zoom:0.85})
 const save=()=>{
  localStorage.setItem('vitrine-cover-position-lab',JSON.stringify(settings))
  window.alert('Ajuste salvo apenas neste navegador (modo Lab).')
 }
 const copy=async()=>{
  const text=JSON.stringify(settings,null,2)
  await navigator.clipboard?.writeText(text)
 }

 return <div className="cover-position-lab">
  <header className="cplab-topbar">
   <div><span>PERFIL LAB</span><strong>Editor de capa</strong><small>Teste isolado · sem banco · sem alterar o perfil oficial</small></div>
   <a href="/perfil-teste">← Voltar para Perfil Lab</a>
  </header>

  <main className="cplab-page">
   <section className="cplab-intro">
    <div>
     <span className="cplab-eyebrow">AJUSTE MANUAL</span>
     <h1>Posicione a capa da empresa</h1>
     <p>Envie uma imagem, arraste para encontrar o enquadramento ideal e teste o resultado em desktop e mobile.</p>
    </div>
    <label className="cplab-upload">
     <input ref={inputRef} type="file" accept="image/*" onChange={onFile}/>
     <span>Escolher capa</span>
    </label>
   </section>

   <section className="cplab-workspace">
    <div className="cplab-main">
     <div className="cplab-toolbar">
      <div className="cplab-switch" role="tablist" aria-label="Visualização">
       <button type="button" className={mode==='desktop'?'active':''} onClick={()=>setMode('desktop')}>Desktop</button>
       <button type="button" className={mode==='mobile'?'active':''} onClick={()=>setMode('mobile')}>Mobile</button>
      </div>
      <span>{fileName||'Nenhuma imagem selecionada'}</span>
     </div>

     <div className={'cplab-stage-wrap '+mode}>
      <div className="cplab-stage"
       onPointerDown={onPointerDown}
       onPointerMove={onPointerMove}
       onPointerUp={onPointerUp}
       onPointerCancel={onPointerUp}
       role="application"
       aria-label="Área de posicionamento da capa"
      >
       {fileUrl?<img src={fileUrl} alt="Pré-visualização da capa" draggable="false" style={{transform:`translate(calc(-50% + ${current.x}px), calc(-50% + ${current.y}px)) scale(${current.zoom})`}}/>:<div className="cplab-empty"><b>Arraste sua capa para cá</b><span>ou use “Escolher capa” acima</span></div>}
       <div className="cplab-guide"><i/><span>Área segura</span></div>
      </div>
     </div>

     <div className="cplab-hint">Arraste a imagem para posicionar. Use o zoom para aproximar detalhes importantes da arte.</div>
    </div>

    <aside className="cplab-controls">
     <div className="cplab-card">
      <h2>Posição</h2>
      <label>Horizontal <strong>{Math.round(current.x)} px</strong></label>
      <input type="range" min="-280" max="280" value={current.x} onChange={e=>update({x:Number(e.target.value)})}/>
      <label>Vertical <strong>{Math.round(current.y)} px</strong></label>
      <input type="range" min="-180" max="180" value={current.y} onChange={e=>update({y:Number(e.target.value)})}/>
     </div>

     <div className="cplab-card">
      <h2>Zoom</h2>
      <div className="cplab-zoom-row"><button type="button" onClick={()=>update({zoom:clamp(current.zoom-.05,0.6,1.8)})}>−</button><strong>{current.zoom.toFixed(2)}×</strong><button type="button" onClick={()=>update({zoom:clamp(current.zoom+.05,0.6,1.8)})}>+</button></div>
      <input type="range" min="0.6" max="1.8" step="0.01" value={current.zoom} onChange={e=>update({zoom:Number(e.target.value)})}/>
     </div>

     <div className="cplab-card">
      <h2>Comandos</h2>
      <button type="button" className="cplab-secondary" onClick={reset}>↺ Restaurar posição</button>
      <button type="button" className="cplab-primary" onClick={save}>Salvar ajuste do Lab</button>
      <button type="button" className="cplab-secondary" onClick={copy}>Copiar configuração</button>
     </div>

     <div className="cplab-note">
      <strong>Desktop e mobile são independentes.</strong>
      <span>Você pode posicionar a mesma capa de forma diferente em cada formato. Nada aqui grava no Supabase.</span>
     </div>
    </aside>
   </section>
  </main>
 </div>
}
