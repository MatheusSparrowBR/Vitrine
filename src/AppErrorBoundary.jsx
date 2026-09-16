import React from 'react'

export default class AppErrorBoundary extends React.Component{
 state={error:null}
 static getDerivedStateFromError(error){return {error}}
 componentDidCatch(error,info){console.error('[VitrineLocal] erro de renderização:',error,info)}
 handleReload=()=>window.location.reload()
 render(){
  if(!this.state.error)return this.props.children
  return <main className="vl-app-error" role="alert">
   <div className="vl-app-error-card">
    <div className="vl-app-error-mark">V</div>
    <span className="vl-app-error-eyebrow">VitrineLocal</span>
    <h1>Não foi possível carregar esta página.</h1>
    <p>Ocorreu um erro inesperado. Recarregue a página para tentar novamente.</p>
    <div className="vl-app-error-actions">
     <button type="button" onClick={this.handleReload}>Recarregar página</button>
     <a href="/laguna">Voltar para a Home</a>
    </div>
   </div>
  </main>
 }
}
