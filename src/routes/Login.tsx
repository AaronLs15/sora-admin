import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import '../index.css'

export default function Login() {
  const [errorMsg, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email')).trim()
    const password = String(fd.get('password'))

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenciales inválidas. Revisa tu correo y contraseña.')
      setIsLoading(false)
    } else {
      // Successful login
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="flex items-center justify-center px-4 py-10 min-h-dvh bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-lg">
        <div className="p-8 space-y-8 border shadow-2xl rounded-3xl border-slate-800 bg-slate-900/65 shadow-slate-950/40 backdrop-blur sm:p-10">
          <header className="space-y-3 text-center text-slate-100">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Panel Sora
            </p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Bienvenido de regreso</h1>
            <p className="text-sm text-slate-400">
              Inicia sesión con tus credenciales administrativas para gestionar terrenos, casas y leads.
            </p>
          </header>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-slate-200">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full px-4 py-3 text-base transition border shadow-inner outline-none rounded-xl border-slate-700 bg-slate-900/75 text-slate-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/70 placeholder:text-slate-500"
                placeholder="tucorreo@dominio.com"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="password" className="font-medium text-slate-200">
                  Contraseña
                </label>
                <span className="text-xs text-slate-500">Solo personal autorizado</span>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full px-4 py-3 text-base transition border shadow-inner outline-none rounded-xl border-slate-700 bg-slate-900/75 text-slate-100 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/70 placeholder:text-slate-500"
                placeholder="••••••••"
              />
            </div>

            {errorMsg && (
              <p className="px-4 py-3 text-sm font-medium text-red-200 border rounded-lg border-red-500/40 bg-red-950/60">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="relative inline-flex items-center justify-center w-full gap-2 px-5 py-3 overflow-hidden text-base font-semibold transition border group rounded-xl border-sky-500/70 bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-950 hover:from-sky-400 hover:to-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Ingresando…' : 'Iniciar sesión'}
              <span className="transition rounded-full size-2 bg-slate-900/40 group-hover:scale-150 group-hover:bg-slate-900/60" />
            </button>
          </form>

          <footer className="text-xs text-center text-slate-500">
            © {new Date().getFullYear()} Sora • Seguridad empresarial de grado profesional
          </footer>
        </div>
      </div>
    </div>
  )
}
