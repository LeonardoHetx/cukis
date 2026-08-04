import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card, StatCard } from '../components/Card'
import { Input } from '../components/Input'
import { formatCurrency } from '../lib/format'
import { SALE_SELECT, saleQuantity, saleTotal } from '../lib/sales'
import { supabase } from '../lib/supabase'
import type { SaleWithRelations } from '../types/database'

type RankItem = { name: string; quantity: number; total: number }

export function DashboardPage() {
  const [sales, setSales] = useState<SaleWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('sales')
      .select(SALE_SELECT)
      .order('sold_at', { ascending: false })

    if (fromDate) query = query.gte('sold_at', `${fromDate}T00:00:00`)
    if (toDate) query = query.lte('sold_at', `${toDate}T23:59:59`)

    const { data, error: err } = await query
    if (err) setError(err.message)
    else setSales((data as SaleWithRelations[]) ?? [])
    setLoading(false)
  }, [fromDate, toDate])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((s, sale) => s + saleTotal(sale), 0)
    const paidTotal = sales
      .filter((sale) => sale.paid)
      .reduce((s, sale) => s + saleTotal(sale), 0)
    const unpaidTotal = sales
      .filter((sale) => !sale.paid)
      .reduce((s, sale) => s + saleTotal(sale), 0)
    const unpaidCount = sales.filter((sale) => !sale.paid).length
    const totalQty = sales.reduce((s, sale) => s + saleQuantity(sale), 0)
    const customerIds = new Set(sales.map((s) => s.customer_id))

    const byFlavor = new Map<string, RankItem>()
    const byCustomer = new Map<string, RankItem>()

    for (const sale of sales) {
      for (const item of sale.sale_items ?? []) {
        const flavorName = item.cookies?.name ?? 'Desconhecido'
        const flavor = byFlavor.get(flavorName) ?? { name: flavorName, quantity: 0, total: 0 }
        flavor.quantity += item.quantity
        flavor.total += Number(item.total)
        byFlavor.set(flavorName, flavor)
      }

      const customerName = sale.customers?.name ?? 'Desconhecido'
      const customer = byCustomer.get(customerName) ?? {
        name: customerName,
        quantity: 0,
        total: 0,
      }
      customer.quantity += saleQuantity(sale)
      customer.total += saleTotal(sale)
      byCustomer.set(customerName, customer)
    }

    const topFlavors = [...byFlavor.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    const topCustomers = [...byCustomer.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    return {
      totalRevenue,
      paidTotal,
      unpaidTotal,
      unpaidCount,
      totalQty,
      customerCount: customerIds.size,
      salesCount: sales.length,
      topFlavors,
      topCustomers,
    }
  }, [sales])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-cocoa-900">Início</h2>
          <p className="mt-1 text-sm text-cocoa-700/70">
            Resumo das vendas{loading ? '…' : ''}
          </p>
        </div>
        <Link to="/vendas/nova">
          <Button variant="secondary">Nova venda</Button>
        </Link>
      </div>

      <Card className="grid gap-3 sm:grid-cols-2">
        <Input
          label="De"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <Input
          label="Até"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </Card>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total vendido" value={formatCurrency(stats.totalRevenue)} />
        <StatCard
          label="Recebido"
          value={formatCurrency(stats.paidTotal)}
          hint="Vendas marcadas como pagas"
        />
        <StatCard
          label="A receber"
          value={formatCurrency(stats.unpaidTotal)}
          hint={
            stats.unpaidCount
              ? `${stats.unpaidCount} venda(s) pendente(s)`
              : 'Nenhuma pendência'
          }
        />
        <StatCard
          label="Cookies vendidos"
          value={String(stats.totalQty)}
          hint={`${stats.salesCount} venda(s)`}
        />
        <StatCard label="Clientes" value={String(stats.customerCount)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-display text-xl font-bold text-cocoa-900">
            Sabores mais vendidos
          </h3>
          <p className="mt-1 text-sm text-cocoa-700/60">Por quantidade de cookies</p>
          <ul className="mt-4 space-y-3">
            {stats.topFlavors.length === 0 ? (
              <li className="text-sm text-cocoa-700/70">Sem vendas no período.</li>
            ) : (
              stats.topFlavors.map((item, i) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between gap-3 border-b border-biscuit-100 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-honey-500/20 text-xs font-bold text-honey-600">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-cocoa-900">{item.name}</p>
                      <p className="text-xs text-cocoa-700/60">{item.quantity} un.</p>
                    </div>
                  </div>
                  <p className="font-semibold text-cocoa-900">
                    {formatCurrency(item.total)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card>
          <h3 className="font-display text-xl font-bold text-cocoa-900">Top clientes</h3>
          <p className="mt-1 text-sm text-cocoa-700/60">Por valor gasto</p>
          <ul className="mt-4 space-y-3">
            {stats.topCustomers.length === 0 ? (
              <li className="text-sm text-cocoa-700/70">Sem vendas no período.</li>
            ) : (
              stats.topCustomers.map((item, i) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between gap-3 border-b border-biscuit-100 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-cocoa-900/10 text-xs font-bold text-cocoa-800">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-cocoa-900">{item.name}</p>
                      <p className="text-xs text-cocoa-700/60">{item.quantity} cookie(s)</p>
                    </div>
                  </div>
                  <p className="font-semibold text-cocoa-900">
                    {formatCurrency(item.total)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  )
}
