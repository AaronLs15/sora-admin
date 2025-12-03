import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Guard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    let authListener: { subscription: { unsubscribe: () => void } } | null = null

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!mounted) return

        if (!session) {
          navigate('/login', { replace: true })
          return
        }

        // Optional: Check profile role if needed
        // const { data: prof } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).maybeSingle()
        // if (!prof) throw new Error('No profile')

        setLoading(false)

        // Subscribe to changes ONLY after we have verified the initial session
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!session) {
            navigate('/login', { replace: true })
          }
        })
        authListener = data

      } catch (error) {
        console.error("Auth error:", error)
        if (mounted) {
          await supabase.auth.signOut()
          navigate('/login', { replace: true })
        }
      }
    }

    checkUser()

    return () => {
      mounted = false
      authListener?.subscription.unsubscribe()
    }
  }, [navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 rounded-full border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
