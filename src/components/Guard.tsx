import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Guard({ children }: { children: React.ReactNode }){
  const [ok,setOk]=useState<boolean|null>(null)
  useEffect(()=>{ (async()=>{
    const { data: { user } } = await supabase.auth.getUser()
    if(!user){ location.href='/login'; return }
    const { data: prof } = await supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle()
    if(!prof){ await supabase.auth.signOut(); location.href='/login'; return }
    setOk(true)
  })() },[])
  if(ok===null) return <p>Cargando...</p>
  return <>{children}</>
}
