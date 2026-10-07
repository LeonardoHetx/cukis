import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './Button'
import { Input } from './Input'

const MIN_LENGTH = 6

type Props = {
  onClose: () => void
}

function errorMessage(code: string | null, message: string | null): string {
  switch (code) {
    case 'same_password':
      return 'A nova senha é igual à atual.'
    case 'weak_password':
      return 'Senha fraca demais. Use uma mais longa ou com números.'
    case 'reauthentication_needed':
      return 'Por segurança, saia e entre de novo antes de trocar a senha.'
    default:
      return message ?? 'Não foi possível trocar a senha.'
  }
}

export function ChangePasswordDialog({ onClose }: Props) {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`)
      return
    }
    if (password !== confirm) {
      setError('As senhas não conferem.')
      return
    }
    setSubmitting(true)
    const result = await updatePassword(password)
    setSubmitting(false)
    if (result.error) {
      setError(errorMessage(result.code, result.error))
      return
    }
    setDone(true)
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-cocoa-950/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Trocar senha"
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-biscuit-200 bg-biscuit-50 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl font-bold text-cocoa-900">Trocar senha</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>

        {done ? (
          <>
            <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">
              Senha trocada! Use a nova senha no próximo login.
            </p>
            <Button onClick={onClose}>Ok</Button>
          </>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Nova senha"
              type="password"
              name="new-password"
              autoComplete="new-password"
              hint={`Pelo menos ${MIN_LENGTH} caracteres.`}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Repita a nova senha"
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
