import { withSupabase } from 'npm:@supabase/server'

const headers={'Content-Type':'application/json'}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers})
const normalizeStatus=(value:string)=>value==='banned'||value==='suspended'||value==='active'?value:null

export default {
  fetch: withSupabase({auth:'user'}, async (req,ctx)=>{
    const actorId=ctx.userClaims?.sub
    if(!actorId)return json({error:'Não autenticado.'},401)
    const {data:actor}=await ctx.supabaseAdmin.from('profiles').select('role').eq('id',actorId).maybeSingle()
    if(actor?.role!=='admin')return json({error:'Acesso restrito a administradores.'},403)

    let body:{action?:string;search?:string;status?:string;user_id?:string;reason?:string;duration_days?:number}={}
    try{body=await req.json()}catch{}

    if(body.action==='list'){
      const page=1
      const perPage=1000
      const {data,error}=await ctx.supabaseAdmin.auth.admin.listUsers({page,perPage})
      if(error)return json({error:error.message},400)
      const ids=(data?.users||[]).map(u=>u.id)
      const {data:profiles}=ids.length?await ctx.supabaseAdmin.from('profiles').select('id,full_name,role,created_at').in('id',ids):{data:[]}
      const profileMap=new Map((profiles||[]).map(p=>[p.id,p]))
      const term=String(body.search||'').trim().toLowerCase()
      const wanted=body.status&&body.status!=='all'?body.status:'all'
      const users=(data?.users||[]).filter(u=>profileMap.get(u.id)?.role!=='admin').map(u=>{
        const p=profileMap.get(u.id)||{}
        const bannedUntil=u.banned_until?new Date(u.banned_until):null
        const isBanned=Boolean(bannedUntil && bannedUntil.getTime()>Date.now())
        const status=isBanned?(String(u.banned_until).includes('9999')?'banned':'suspended'):'active'
        return {id:u.id,email:u.email||'',full_name:p.full_name||u.user_metadata?.full_name||'',role:p.role||'user',created_at:p.created_at||u.created_at,confirmed:Boolean(u.email_confirmed_at),status,banned_until:u.banned_until||null}
      }).filter(u=>(wanted==='all'||u.status===wanted)&&(!term||u.email.toLowerCase().includes(term)||u.full_name.toLowerCase().includes(term)))
      return json({users})
    }

    if(body.action==='set_status'){
      const userId=String(body.user_id||'')
      const status=normalizeStatus(String(body.status||''))
      if(!userId||!status)return json({error:'Usuário ou status inválido.'},400)
      if(userId===actorId)return json({error:'O administrador não pode alterar o próprio status.'},400)
      const {data:target}=await ctx.supabaseAdmin.from('profiles').select('role').eq('id',userId).maybeSingle()
      if(!target)return json({error:'Usuário não encontrado.'},404)
      if(target.role==='admin')return json({error:'Não é permitido suspender ou banir outro administrador.'},400)

      let banDuration='none'
      if(status==='suspended'){
        const days=Math.max(1,Math.min(365,Number(body.duration_days)||30))
        banDuration=`${days*24}h`
      }
      if(status==='banned')banDuration='876000h'

      const {error}=await ctx.supabaseAdmin.auth.admin.updateUserById(userId,{ban_duration:banDuration})
      if(error)return json({error:error.message},400)

      return json({ok:true,status,ban_duration:banDuration})
    }

    return json({error:'Ação inválida.'},400)
  })
}
