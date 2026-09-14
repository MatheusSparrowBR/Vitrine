import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = URL && KEY ? createClient(URL, KEY) : null
export const db = supabase

export default supabase
