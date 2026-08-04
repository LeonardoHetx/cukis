import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input, Select } from '../components/Input'
import { formatCurrency, formatDate, toDateInputValue } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Cookie, SaleWithRelations } from '../types/database'

export function SalesPage() {
  const [sales, setSales] = useState<SaleWithRelations[]>([])
  const [cookies, setCookies] = useState<Cookie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [customerFilter, setCustomerFilter] = useState('')
  const [cookieFilter, setCookieFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [editing, setEditing] = useState<SaleWithRelations | null>(null)
  const [editQty, setEditQty] = useState(1)
  const [editPrice, setEditPrice] = useState('')
  const [editDate, setEditDate] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('sales')
      .select('*, customers(id, name), cookies(id, name)')
      .order('sold_at', { ascending: false })

    if (cookieFilter) query = query.eq('cookie_id', cookieFilter)
    if (fromDate) query = query.gte('sold_at', `${fromDate}T00:00:00`)
    if (toDate) query = query.lte('sold_at', `${toDate}T23:59:59`)

    const [{ data, error: salesError }, { data: cookieData }] = await Promise.all([
      query,
      supabase.from('cookies').select('*').order('name'),
    ])

    if (salesError) {
      setError(salesError.message)
      setLoading(false)
      return
    }

    let rows = (data as SaleWithRelations[]) ?? []
    if (customerFilter.trim()) {
      const q = customerFilter.trim().toLowerCase()
      rows = rows.filter((s) => s.customers?.name.toLowerCase().includes(q))
    }

    setSales(rows)
    setCookies((cookieData as Cookie[]) ?? [])
    setLoading(false)
  }, [customerFilter, cookieFilter, fromDate, toDate])

  useEffect(() => {
    load()
  }, [load])

  function startEdit(sale: SaleWithRelations) {
    setEditing(sale)
    setEditQty(sale.quantity)
    setEditPrice(String(sale.unit_price))
    setEditDate(toDateInputValue(sale.sold_at))
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    const unit = Number.parseFloat(editPrice) || 0
    const total = editQty * unit
    const { error: updateError } = await supabase
      .from('sales')
      .update({
        quantity: editQty,
        unit_price: unit,
        total,
        sold_at: new Date(`${editDate}T12:00:00`).toISOString(),
      })
      .eq('id', editing.id)

    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setEditing(null)
    await load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta venda?')) return
    const { error: deleteError } = await supabase.from('sales').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    await load()
  }

  const filteredTotal = sales.reduce((sum, s) => sum + Number(s.total), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-cocoa-900">Vendas</h2>
          <p className="mt-1 text-sm text-cocoa-700/70">
            {loading ? 'Carregando…' : `${sales.length} venda(s) · ${formatCurrency(filteredTotal)}`}
          </p>
        </div>
        <Link to="/vendas/nova">
          <Button variant="secondary">Nova venda</Button>
        </Link>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Cliente"
            placeholder="Buscar cliente"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
          />
          <Select
            label="Sabor"
            value={cookieFilter}
            onChange={(e) => setCookieFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {cookies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
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
        </div>
      </Card>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {editing ? (
        <Card>
          <form className="space-y-4" onSubmit={handleSaveEdit}>
            <h3 className="font-display text-xl font-bold">Editar venda</h3>
            <p className="text-sm text-cocoa-700/70">
              {editing.customers?.name} · {editing.cookies?.name}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Input
                label="Quantidade"
                type="number"
                min={1}
                value={editQty}
                onChange={(e) => setEditQty(Number.parseInt(e.target.value, 10) || 1)}
              />
              <Input
                label="Valor unitário"
                type="number"
                min={0}
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
              <Input
                label="Data"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <p className="text-sm font-semibold">
              Total: {formatCurrency(editQty * (Number.parseFloat(editPrice) || 0))}
            </p>
            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="space-y-3">
        {!loading && sales.length === 0 ? (
          <Card>
            <p className="text-cocoa-700/70">Nenhuma venda encontrada.</p>
          </Card>
        ) : null}

        {sales.map((sale) => (
          <Card key={sale.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-cocoa-900">{sale.customers?.name ?? '—'}</p>
              <p className="text-sm text-cocoa-700/70">
                {sale.cookies?.name ?? '—'} · {sale.quantity} un. · {formatDate(sale.sold_at)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-display text-xl font-bold text-cocoa-900">
                {formatCurrency(Number(sale.total))}
              </p>
              <Button variant="ghost" size="sm" onClick={() => startEdit(sale)}>
                Editar
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(sale.id)}>
                Excluir
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
