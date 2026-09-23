import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const page=fs.readFileSync(new URL('../../src/AdminAnalyticsPage.jsx',import.meta.url),'utf8')
const migration=fs.readFileSync(new URL('../../supabase/migrations/20260923150000_enable_analytics_realtime.sql',import.meta.url),'utf8')

test('admin analytics subscribes to new analytics events',()=>{
 assert.match(page,/db\.channel\('admin-analytics-events'\)/)
 assert.match(page,/postgres_changes/)
 assert.match(page,/table:'analytics_events'/)
 assert.match(page,/setRefreshTick\(v=>v\+1\)/)
 assert.match(page,/db\.removeChannel\(channel\)/)
})

test('analytics realtime migration enables analytics_events safely',()=>{
 assert.match(migration,/pg_publication_tables/)
 assert.match(migration,/supabase_realtime/)
 assert.match(migration,/alter publication supabase_realtime add table public\.analytics_events/)
})
