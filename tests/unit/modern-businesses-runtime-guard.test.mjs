import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const page=fs.readFileSync('src/ModernBusinessesPage.jsx','utf8')
test('pagina de empresas protege carregamento e mantém avaliações em lote',()=>{
 assert.ok(page.includes('loadPublicBusinessReviewSummaries'))
 assert.ok(page.includes("const[loading,setLoading]=useState(true)"))
 assert.ok(page.includes("const[loadError,setLoadError]=useState('')"))
 assert.ok(page.includes("catch(err)"))
 assert.ok(page.includes('Não foi possível carregar as empresas.'))
})