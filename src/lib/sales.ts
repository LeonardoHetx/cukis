import type { SaleWithRelations } from '../types/database'

export function saleTotal(sale: Pick<SaleWithRelations, 'sale_items'>): number {
  return (sale.sale_items ?? []).reduce((sum, item) => sum + Number(item.total), 0)
}

export function saleQuantity(sale: Pick<SaleWithRelations, 'sale_items'>): number {
  return (sale.sale_items ?? []).reduce((sum, item) => sum + item.quantity, 0)
}

export function saleItemsLabel(sale: Pick<SaleWithRelations, 'sale_items'>): string {
  const items = sale.sale_items ?? []
  if (items.length === 0) return 'Sem itens'
  return items
    .map((item) => `${item.cookies?.name ?? '—'} (${item.quantity})`)
    .join(' · ')
}

export const SALE_SELECT =
  '*, customers(id, name), sale_items(*, cookies(id, name))'
