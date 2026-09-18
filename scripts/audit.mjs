import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs'
import {join,relative} from 'node:path'

const root=process.cwd()
const fail=[]
const warn=[]
const ok=[]
const read=p=>readFileSync(join(root,p),'utf8')

const required=[
 'index.html','public/.htaccess','public/robots.txt','public/site.webmanifest',
 'src/app-entry.jsx','src/LaunchHomePreview.jsx','src/PrelaunchGate.jsx',
 'scripts/generate-sitemap.mjs','.github/workflows/ci.yml'
]
for(const p of required){
 if(existsSync(join(root,p)))ok.push(p)
 else fail.push('Missing '+p)
}

const app=read('src/app-entry.jsx')
if(/route\.kind==='home'&&route\.citySlug==='laguna'/.test(app)&&/LaunchHomePreview/.test(app))ok.push('Laguna launch homepage is wired in the main router')
else fail.push('Laguna launch homepage is not wired as the production home route')

const index=read('index.html')
for(const token of ['meta name="description"','meta name="robots"','property="og:title"','name="twitter:card"','link rel="manifest"']){
 if(index.includes(token))ok.push('SEO marker present: '+token)
 else fail.push('Missing SEO marker: '+token)
}

const ht=read('public/.htaccess')
if(/RewriteRule \^ index\.html \[L\]/.test(ht))ok.push('Hostinger/Apache SPA fallback present')
else fail.push('Missing Hostinger/Apache SPA fallback')

const workflow=read('.github/workflows/ci.yml')
for(const token of ['npm run audit:static','npm run test','npm run build','npm run test:e2e']){
 if(workflow.includes(token))ok.push('CI includes '+token)
 else fail.push('CI missing '+token)
}
if(workflow.includes('npm audit --omit=dev --audit-level=high'))ok.push('CI includes dependency security audit')
else fail.push('CI missing dependency security audit')

const forbidden=/(^|[\\/'"\\s])(vercel\\.json|vercel\\.app|\\.vercel\\/|Vercel)([\\/'"\\s]|$)/i
const scanRoots=['src','public','index.html','package.json','vite.config.js','.github/workflows/ci.yml']
const skip=new Set(['node_modules','.git','dist'])

function scanFile(p){
 const rel=relative(root,p)
 if(rel==='scripts/audit.mjs'||rel.startsWith('tests/')||rel.startsWith('docs/'))return
 const content=readFileSync(p,'utf8')
 if(forbidden.test(content))fail.push('Forbidden Vercel reference in '+rel)
 if(/SUPABASE_SERVICE_ROLE_KEY\\s*=\\s*['"][^'"]+['"]|service_role\\s*[:=]\\s*['"][^'"]{10,}/i.test(content))
  warn.push('Review possible secret-like service-role reference in '+rel)
}
function walk(dir){
 for(const name of readdirSync(dir)){
  if(skip.has(name))continue
  const p=join(dir,name)
  const s=statSync(p)
  if(s.isDirectory())walk(p)
  else if(s.size<2_000_000)scanFile(p)
 }
}
for(const target of scanRoots){
 const p=join(root,target)
 if(!existsSync(p))continue
 const s=statSync(p)
 if(s.isDirectory())walk(p)
 else scanFile(p)
}

if(!existsSync(join(root,'package-lock.json')))warn.push('package-lock.json is absent; CI uses npm install rather than npm ci')

const pkg=JSON.parse(read('package.json'))
for(const s of ['audit:static','test','build','test:e2e']) if(!pkg.scripts?.[s]) fail.push('Missing package script: '+s)
if(process.env.VITE_PRELAUNCH_MODE!=='false') warn.push('VITE_PRELAUNCH_MODE is not false in this CI process')

console.log('AUDIT RESULTS')
console.log('PASS:',ok.length)
console.log('WARN:',warn.length)
console.log('FAIL:',fail.length)
for(const x of ok)console.log('PASS '+x)
for(const x of warn)console.log('WARN '+x)
for(const x of fail)console.log('FAIL '+x)
if(fail.length)process.exit(1)
