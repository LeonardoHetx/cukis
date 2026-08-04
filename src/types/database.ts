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

export type Sale = {
  id: string
  customer_id: string
  cookie_id: string
  quantity: number
  unit_price: number
  total: number
  sold_at: string
  created_at: string
}

export type SaleWithRelations = Sale & {
  customers: Pick<Customer, 'id' | 'name'> | null
  cookies: Pick<Cookie, 'id' | 'name'> | null
}

export type CustomerStats = {
  id: string
  name: string
  created_at: string
  total_spent: number
  total_quantity: number
  sales_count: number
}
