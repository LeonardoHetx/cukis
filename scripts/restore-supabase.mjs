#!/usr/bin/env node
/**
 * Restaura um backup JSON no Supabase.
 * Uso: npm run restore
 *      npm run restore -- backups/latest/data.json
 *
 * ATENÇÃO: apaga e recria os dados das tabelas do app (não mexe em Auth).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig, loadEnvFile } from './env.mjs'

loadEnvFile()

const ORDER = [
  'cookies',
  'customers',
  'sales',
  'sale_items',
  'loyalty_settings',
  'loyalty_redemptions',
]

async function clearTable(client, table) {
  // Filtro em created_at (toda tabela tem) — funciona com id uuid ou numérico
  const { error } = await client.from(table).delete().not('created_at', 'is', null)
  if (error) throw new Error(`Limpar ${table}: ${error.message}`)
}

async function insertAll(client, table, rows) {
  if (!rows.length) return
  const chunk = 500
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk)
    const { error } = await client.from(table).insert(slice)
    if (error) throw new Error(`Inserir ${table}: ${error.message}`)
  }
}

async function main() {
  const file = resolve(process.cwd(), process.argv[2] || 'backups/latest/data.json')
  const raw = JSON.parse(readFileSync(file, 'utf8'))
  const tables = raw.tables
  if (!tables) throw new Error('Arquivo de backup inválido (falta tables)')

  const { url, secret } = getSupabaseConfig()
  const client = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`Restaurando de ${file}`)
  console.log(`Exportado em: ${raw.exported_at ?? 'desconhecido'}`)

  // Apaga filhos antes dos pais
  for (const table of [...ORDER].reverse()) {
    await clearTable(client, table)
    console.log(`Limpou ${table}`)
  }

  for (const table of ORDER) {
    const rows = tables[table] ?? []
    await insertAll(client, table, rows)
    console.log(`Restaurou ${table}: ${rows.length}`)
  }

  console.log('Restore concluído.')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
