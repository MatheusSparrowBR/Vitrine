import React,{useEffect,useMemo,useState}from'react'
import AdminShell from './AdminShell.jsx'
import './admin-advertising.css'

const U=import.meta.env.VITE_SUPABASE_URL,K=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,db=U&&K?createClient(U,K):null
function createClient(url,key){return requireSupabase(url,key)}
function requireSupabase(url,key){return window.__vitrineSupabaseClient||(()=>{try{return import('@supabase/supabase-js').then(()=>null)}catch{return null}})()}
