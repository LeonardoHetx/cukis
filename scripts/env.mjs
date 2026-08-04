import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Carrega .env local sem depender de dotenv (não sobrescreve env já definida). */
export function loadEnvFile(filename = '.env') {
  const path = resolve(process.cwd(), filename)
  if (!existsSync(path)) return

  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const secret =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('Defina SUPABASE_URL (ou VITE_SUPABASE_URL)')
  }
  if (!secret) {
    throw new Error(
      'Defina SUPABASE_SECRET_KEY (secret / service_role — nunca use no front)',
    )
  }

  return { url, secret }
}
