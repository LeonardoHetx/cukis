#!/usr/bin/env node
/**
 * Exporta os dados do Cukis para backups/
 * Uso: npm run backup
 * Requer: SUPABASE_URL + SUPABASE_SECRET_KEY (ou VITE_SUPABASE_URL + secret no .env)
 */
import { mkdirSync, writeFileSync, cpSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig, loadEnvFile } from './env.mjs'

const TABLES = ['cookies', 'customers', 'sales', 'sale_items']
const PAGE_SIZE = 1000
const KEEP_DAILY = 30

loadEnvFile()

async function fetchAll(client, table) {
  const rows = []
  let from = 0

  for (;;) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(from, to)

    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break

    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

function stamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function pruneOldBackups(backupsRoot) {
  const dirs = readdirSync(backupsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}_/.test(d.name))
    .map((d) => d.name)
    .sort()

  const toRemove = dirs.slice(0, Math.max(0, dirs.length - KEEP_DAILY))
  for (const name of toRemove) {
    rmSync(join(backupsRoot, name), { recursive: true, force: true })
    console.log(`Removido backup antigo: ${name}`)
  }
}

async function main() {
  const { url, secret } = getSupabaseConfig()
  const client = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const payload = {
    exported_at: new Date().toISOString(),
    source: url,
    tables: {},
  }

  for (const table of TABLES) {
    const rows = await fetchAll(client, table)
    payload.tables[table] = rows
    console.log(`${table}: ${rows.length} registro(s)`)
  }

  const backupsRoot = join(process.cwd(), 'backups')
  const datedDir = join(backupsRoot, stamp())
  const latestDir = join(backupsRoot, 'latest')

  mkdirSync(datedDir, { recursive: true })
  writeFileSync(join(datedDir, 'data.json'), `${JSON.stringify(payload, null, 2)}\n`)
  writeFileSync(
    join(datedDir, 'manifest.json'),
    `${JSON.stringify(
      {
        exported_at: payload.exported_at,
        counts: Object.fromEntries(
          Object.entries(payload.tables).map(([k, v]) => [k, v.length]),
        ),
      },
      null,
      2,
    )}\n`,
  )

  if (existsSync(latestDir)) rmSync(latestDir, { recursive: true, force: true })
  cpSync(datedDir, latestDir, { recursive: true })

  pruneOldBackups(backupsRoot)

  console.log(`Backup salvo em: ${datedDir}`)
  console.log(`Cópia latest: ${latestDir}`)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
