// Usuário "admin" no login → email da conta no Supabase (definido no deploy,
// em VITE_ADMIN_EMAIL). Quem digitar um email continua entrando normalmente.
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim()

export function resolveLoginEmail(login: string): string {
  const key = login.trim().toLowerCase()
  if (key === 'admin' && ADMIN_EMAIL) return ADMIN_EMAIL
  return key
}
