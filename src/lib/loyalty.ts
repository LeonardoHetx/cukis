import { supabase } from './supabase'
import { toDateInputValue } from './format'
import type { Customer, LoyaltyRedemption, LoyaltySettings } from '../types/database'

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  goal: 10,
  reward: '1 cookie grátis',
  starts_at: toDateInputValue(),
}

export type LoyaltyPurchase = {
  sold_at: string
  quantity: number
}

export type LoyaltyProgress = {
  customer: Pick<Customer, 'id' | 'name'>
  /** Cookies comprados desde o início do programa */
  earned: number
  /** Cookies já trocados por prêmios */
  used: number
  /** Saldo atual (earned - used) */
  balance: number
  /** Carimbos no cartão atual (no máximo a meta) */
  stamps: number
  /** Quantos prêmios o saldo já cobre */
  rewardsAvailable: number
  /** Quanto falta para o próximo prêmio (0 se já liberado) */
  remaining: number
  /** Compras desde o último resgate (ou início), mais recentes primeiro */
  purchases: LoyaltyPurchase[]
  lastRedemptionAt: string | null
}

/** Início do programa (data local, meia-noite) em ISO, para filtrar vendas. */
export function loyaltyStartIso(settings: LoyaltySettings): string {
  return new Date(`${settings.starts_at}T00:00:00`).toISOString()
}

export function computeProgress(
  customer: Pick<Customer, 'id' | 'name'>,
  settings: LoyaltySettings,
  purchases: LoyaltyPurchase[],
  redemptions: Pick<LoyaltyRedemption, 'cookies_used' | 'redeemed_at'>[],
): LoyaltyProgress {
  const earned = purchases.reduce((sum, p) => sum + p.quantity, 0)
  const used = redemptions.reduce((sum, r) => sum + r.cookies_used, 0)
  const balance = Math.max(0, earned - used)
  const goal = settings.goal

  const lastRedemptionAt =
    redemptions.map((r) => r.redeemed_at).sort().at(-1) ?? null

  const cycle = purchases
    .filter((p) => !lastRedemptionAt || p.sold_at > lastRedemptionAt)
    .sort((a, b) => b.sold_at.localeCompare(a.sold_at))

  return {
    customer,
    earned,
    used,
    balance,
    stamps: Math.min(balance, goal),
    rewardsAvailable: Math.floor(balance / goal),
    remaining: Math.max(0, goal - balance),
    purchases: cycle,
    lastRedemptionAt,
  }
}

export async function loadLoyaltySettings(): Promise<LoyaltySettings> {
  const { data, error } = await supabase
    .from('loyalty_settings')
    .select('goal, reward, starts_at')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error
  return (data as LoyaltySettings | null) ?? DEFAULT_LOYALTY_SETTINGS
}

export async function saveLoyaltySettings(settings: LoyaltySettings): Promise<void> {
  const { error } = await supabase
    .from('loyalty_settings')
    .upsert({ id: 1, ...settings })
  if (error) throw error
}

export async function loadLoyaltyProgress(
  settings: LoyaltySettings,
): Promise<LoyaltyProgress[]> {
  const startIso = loyaltyStartIso(settings)

  const [customersRes, salesRes, redemptionsRes] = await Promise.all([
    supabase.from('customers').select('id, name').order('name'),
    supabase
      .from('sales')
      .select('customer_id, sold_at, sale_items(quantity)')
      .gte('sold_at', startIso),
    supabase
      .from('loyalty_redemptions')
      .select('customer_id, cookies_used, redeemed_at')
      .gte('redeemed_at', startIso),
  ])

  const error = customersRes.error ?? salesRes.error ?? redemptionsRes.error
  if (error) throw error

  const purchasesByCustomer = new Map<string, LoyaltyPurchase[]>()
  for (const sale of salesRes.data ?? []) {
    const items = (sale.sale_items as { quantity: number }[] | null) ?? []
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0)
    if (quantity === 0) continue
    const list = purchasesByCustomer.get(sale.customer_id) ?? []
    list.push({ sold_at: sale.sold_at, quantity })
    purchasesByCustomer.set(sale.customer_id, list)
  }

  const redemptionsByCustomer = new Map<
    string,
    Pick<LoyaltyRedemption, 'cookies_used' | 'redeemed_at'>[]
  >()
  for (const r of redemptionsRes.data ?? []) {
    const list = redemptionsByCustomer.get(r.customer_id) ?? []
    list.push(r)
    redemptionsByCustomer.set(r.customer_id, list)
  }

  return (customersRes.data ?? []).map((customer) =>
    computeProgress(
      customer,
      settings,
      purchasesByCustomer.get(customer.id) ?? [],
      redemptionsByCustomer.get(customer.id) ?? [],
    ),
  )
}

export async function redeemReward(
  customerId: string,
  settings: LoyaltySettings,
): Promise<void> {
  const { error } = await supabase.from('loyalty_redemptions').insert({
    customer_id: customerId,
    cookies_used: settings.goal,
    reward: settings.reward,
  })
  if (error) throw error
}
