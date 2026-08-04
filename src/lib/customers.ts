import { supabase } from './supabase'
import { normalizeName } from './format'
import type { Customer } from '../types/database'

/** Busca cliente pelo nome (case-insensitive) ou cria um novo. */
export async function findOrCreateCustomer(name: string): Promise<Customer> {
  const trimmed = normalizeName(name)
  if (!trimmed) {
    throw new Error('Informe o nome do cliente')
  }

  const { data: existing, error: searchError } = await supabase
    .from('customers')
    .select('*')
    .ilike('name', trimmed)
    .limit(1)
    .maybeSingle()

  if (searchError) throw searchError
  if (existing) return existing as Customer

  const { data: created, error: createError } = await supabase
    .from('customers')
    .insert({ name: trimmed })
    .select()
    .single()

  if (createError) {
    // Corrida: outro insert com o mesmo nome
    if (createError.code === '23505') {
      const { data: retry, error: retryError } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', trimmed)
        .limit(1)
        .single()
      if (retryError) throw retryError
      return retry as Customer
    }
    throw createError
  }

  return created as Customer
}
