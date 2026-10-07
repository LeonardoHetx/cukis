import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { resolveLoginEmail } from '../lib/loginUsers'
import { isSupabaseConfigured } from '../lib/supabase'

export function LoginPage() {
  const { session, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await signIn(resolveLoginEmail(login), password)
    setSubmitting(false)
    if (result.error) {
      setError('Usuário ou senha inválidos. Tente novamente.')
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-honey-600">
            bem-vinda
          </p>
          <h1 className="mt-2 font-display text-5xl font-bold text-cocoa-900">Cukis</h1>
          <p className="mt-2 text-cocoa-700/70">Entre para anotar suas vendas</p>
        </div>

        <Card>
          {!isSupabaseConfigured ? (
            <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Faltam as variáveis <code className="font-semibold">VITE_SUPABASE_URL</code> e{' '}
              <code className="font-semibold">VITE_SUPABASE_ANON_KEY</code> no deploy (Vercel →
              Settings → Environment Variables). Depois, faça um Redeploy.
            </p>
          ) : null}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Usuário"
              type="text"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
            <Input
              label="Senha"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
