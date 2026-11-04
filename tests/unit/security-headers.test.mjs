import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Lê com quebras de linha normalizadas (o checkout do Windows usa CRLF).
const htaccess=fs.readFileSync('public/.htaccess','utf8').replace(/\r\n/g,'\n')

test('cabeçalhos de segurança ficam dentro de IfModule (sem erro 500 se mod_headers faltar)',()=>{
 const block=htaccess.match(/<IfModule mod_headers\.c>([\s\S]*?)<\/IfModule>/)
 assert.ok(block,'bloco IfModule mod_headers.c ausente')
 for(const h of ['X-Content-Type-Options "nosniff"','X-Frame-Options "SAMEORIGIN"','Referrer-Policy','Permissions-Policy'])assert.ok(block[1].includes(h),h)
})

test('CSP começa em report-only e não bloqueia nada ainda',()=>{
 assert.match(htaccess,/Header always set Content-Security-Policy-Report-Only "/)
 assert.doesNotMatch(htaccess,/Header always set Content-Security-Policy "/)
})

test('CSP libera só as origens que o código usa',()=>{
 const csp=htaccess.match(/Content-Security-Policy-Report-Only "([^"]+)"/)[1]
 assert.match(csp,/default-src 'self'/)
 assert.match(csp,/script-src 'self'(;|$)/)
 assert.match(csp,/connect-src [^;]*https:\/\/\*\.supabase\.co/)
 assert.match(csp,/connect-src [^;]*api\.open-meteo\.com/)
 assert.match(csp,/frame-src [^;]*www\.google\.com/)
 assert.match(csp,/frame-src [^;]*youtube-nocookie\.com/)
 assert.match(csp,/object-src 'none'/)
 assert.doesNotMatch(csp,/script-src[^;]*unsafe-(inline|eval)/)
})
