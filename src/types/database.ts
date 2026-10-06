export type Cookie = {
  id: string
  name: string
  default_price: number
  active: boolean
  created_at: string
}

export type Customer = {
  id: string
  name: string
  created_at: string
}

export type SaleItem = {
  id: string
  sale_id: string
  cookie_id: string
  quantity: number
  unit_price: number
  total: number
  created_at: string
}

export type SaleItemWithCookie = SaleItem & {
  cookies: Pick<Cookie, 'id' | 'name'> | null
}

export type Sale = {
  id: string
  customer_id: string
  paid: boolean
  sold_at: string
  created_at: string
}

export type SaleWithRelations = Sale & {
  customers: Pick<Customer, 'id' | 'name'> | null
  sale_items: SaleItemWithCookie[]
}

export type CustomerStats = {
  id: string
  name: string
  created_at: string
  total_spent: number
  total_quantity: number
  sales_count: number
}

export type LoyaltySettings = {
  goal: number
  reward: string
  starts_at: string
}

export type LoyaltyRedemption = {
  id: string
  customer_id: string
  cookies_used: number
  reward: string
  redeemed_at: string
  created_at: string
}

export type SaleLineDraft = {
  key: string
  cookie_id: string
  quantity: string
  unit_price: string
  priceTouched: boolean
}
