import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(path,'utf8')

test('account workspace renders media usage without an undefined mediaUsage reference',()=>{
 const account=read('src/AccountWorkspacePage.jsx')
 assert.match(account,/mediaUsage=\{mediaUsage\}/)
 assert.match(account,/function MediaSection\(\{[^}]*mediaUsage[^}]*\}\)/)
 assert.match(account,/AccountResourceUsage businessId=\{businessId\} resource="photos"/)
 assert.match(account,/className=\{`account-primary-btn small file-button \$\{mediaReached\?'is-disabled':''\}`\}/)
 assert.match(account,/db\.from\('business_photos'\)\.insert/)
})

test('performance navigation lives inside the merchant account workspace',()=>{
 const account=read('src/AccountWorkspacePage.jsx')
 const header=read('src/SiteHeader.jsx')
 assert.match(account,/label="Desempenho"/)
 assert.match(account,/location\.href='\/conta\/analytics'/)
 assert.doesNotMatch(header,/\['analytics','Desempenho','\/conta\/analytics'\]/)
})
