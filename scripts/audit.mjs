import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs'
import {join,relative} from 'node:path'

const root=process.cwd()
const fail=[]
const warn=[]
const ok=[]
const read=p=>readFileSync(join(root,p),'utf8')

const required=[
 'index.html','public/.htaccess','public/robots.txt','public/site.webmanifest',
 'src/app-entry.jsx','src/CityHomePage.jsx','src/PrelaunchGate.jsx','src/PrelaunchPage.jsx',
 'scripts/generate-sitemap.mjs','.github/workflows/ci.yml'
]
for(const p of required){
 if(existsSync(join(root,p)))ok.push(p)
 else fail.push('Missing '+p)
}

const app=read('src/app-entry.jsx')
if(app.includes("if(route.kind==='home')return <CityHomePage citySlug={route.citySlug}/>"))ok.push('City homepage is wired in the main router')
else fail.push('City homepage is not wired as the production home route')
if(app.includes('PrelaunchGate')&&app.includes("path==='/em-breve/planos'"))ok.push('Pre-launch mode remains available until official launch')
else fail.push('Pre-launch mode is not wired in the main router')

const index=read('index.html')
for(const token of ['meta name="description"','meta name="robots"','property="og:title"','name="twitter:card"','link rel="manifest"']){
 if(index.includes(token))ok.push('SEO marker present: '+token)
 else fail.push('Missing SEO marker: '+token)
}

const ht=read('public/.htaccess')
if(/RewriteRule \^ index\.html \[L\]/.test(ht))ok.push('Hostinger/Apache SPA fallback present')
else fail.push('Missing Hostinger/Apache SPA fallback')

const workflow=read('.github/workflows/ci.yml')
for(const script of ['audit:static','test','build','test:e2e']){
 if(new RegExp(`(?:npm|pnpm) run ${script.replace(':','\\:')}`).test(workflow))ok.push('CI includes '+script)
 else fail.push('CI missing '+script)
}
if(/(?:npm audit --omit=dev|pnpm audit --prod) --audit-level high/.test(workflow))ok.push('CI includes dependency security audit')
else fail.push('CI missing dependency security audit')

const forbidden=['vercel.json','vercel.app','.vercel/','Vercel']
const scanRoots=['src','public','index.html','package.json','vite.config.js','.github/workflows/ci.yml']
const skip=new Set(['node_modules','.git','dist'])

function scanFile(p){
 const rel=relative(root,p)
 if(rel==='scripts/audit.mjs'||rel.startsWith('tests/')||rel.startsWith('docs/'))return
 const content=readFileSync(p,'utf8')
 if(forbidden.some(token=>content.includes(token)))fail.push('Forbidden Vercel reference in '+rel)
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

if(!existsSync(join(root,'package-lock.json'))&&!existsSync(join(root,'pnpm-lock.yaml')))warn.push('No dependency lockfile is present')

const pkg=JSON.parse(read('package.json'))
for(const s of ['audit:static','test','build','test:e2e']) if(!pkg.scripts?.[s]) fail.push('Missing package script: '+s)

console.log('AUDIT RESULTS')
console.log('PASS:',ok.length)
console.log('WARN:',warn.length)
console.log('FAIL:',fail.length)
for(const x of ok)console.log('PASS '+x)
for(const x of warn)console.log('WARN '+x)
for(const x of fail)console.log('FAIL '+x)
if(fail.length)process.exit(1)

