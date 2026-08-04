import { useCallback, useEffect, useState } from 'react'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { formatCurrency } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { CustomerStats } from '../types/database'

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerStats[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [{ data: customerData, error: customerError }, { data: salesData, error: salesError }] =
      await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase
          .from('sales')
          .select('id, customer_id, sale_items(quantity, total)'),
      ])

    if (customerError || salesError) {
      setError(customerError?.message ?? salesError?.message ?? 'Erro ao carregar')
      setLoading(false)
      return
    }

    const stats = new Map<
      string,
      { total_spent: number; total_quantity: number; sales_count: number }
    >()

    for (const sale of salesData ?? []) {
      const current = stats.get(sale.customer_id) ?? {
        total_spent: 0,
        total_quantity: 0,
        sales_count: 0,
      }
      const items = (sale.sale_items as { quantity: number; total: number }[] | null) ?? []
      current.total_spent += items.reduce((sum, item) => sum + Number(item.total), 0)
      current.total_quantity += items.reduce((sum, item) => sum + item.quantity, 0)
      current.sales_count += 1
      stats.set(sale.customer_id, current)
    }

    const rows: CustomerStats[] = (customerData ?? []).map((c) => {
      const s = stats.get(c.id)
      return {
        id: c.id,
        name: c.name,
        created_at: c.created_at,
        total_spent: s?.total_spent ?? 0,
        total_quantity: s?.total_quantity ?? 0,
        sales_count: s?.sales_count ?? 0,
      }
    })

    rows.sort((a, b) => b.total_spent - a.total_spent)
    setCustomers(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold text-cocoa-900">Clientes</h2>
        <p className="mt-1 text-sm text-cocoa-700/70">
          Cadastrados automaticamente nas vendas — veja quanto cada um comprou
        </p>
      </div>

      <Card>
        <Input
          label="Buscar"
          placeholder="Nome do cliente"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? <p className="text-cocoa-700/70">Carregando…</p> : null}

      {!loading && filtered.length === 0 ? (
        <Card>
          <p className="text-cocoa-700/70">Nenhum cliente ainda. Registre uma venda!</p>
        </Card>
      ) : null}

      <div className="space-y-3">
        {filtered.map((customer) => (
          <Card
            key={customer.id}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p className="font-semibold text-cocoa-900">{customer.name}</p>
              <p className="text-sm text-cocoa-700/70">
                {customer.sales_count} venda(s) · {customer.total_quantity} cookie(s)
              </p>
            </div>
            <p className="font-display text-xl font-bold text-cocoa-900">
              {formatCurrency(customer.total_spent)}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}
