import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input, Select } from '../components/Input'
import { PaymentBadge } from '../components/PaymentBadge'
import { formatCurrency, formatDate, toDateInputValue } from '../lib/format'
import { SALE_SELECT, saleItemsLabel, saleQuantity, saleTotal } from '../lib/sales'
import { supabase } from '../lib/supabase'
import type { Cookie, SaleLineDraft, SaleWithRelations } from '../types/database'

type PaidFilter = 'all' | 'paid' | 'unpaid'

function newLine(cookieId = '', defaultPrice = ''): SaleLineDraft {
  return {
    key: crypto.randomUUID(),
    cookie_id: cookieId,
    quantity: 1,
    unit_price: defaultPrice,
    priceTouched: true,
  }
}

export function SalesPage() {
  const [sales, setSales] = useState<SaleWithRelations[]>([])
  const [cookies, setCookies] = useState<Cookie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [customerFilter, setCustomerFilter] = useState('')
  const [cookieFilter, setCookieFilter] = useState('')
  const [paidFilter, setPaidFilter] = useState<PaidFilter>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [editing, setEditing] = useState<SaleWithRelations | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editPaid, setEditPaid] = useState(false)
  const [editLines, setEditLines] = useState<SaleLineDraft[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('sales')
      .select(SALE_SELECT)
      .order('sold_at', { ascending: false })

    if (paidFilter === 'paid') query = query.eq('paid', true)
    if (paidFilter === 'unpaid') query = query.eq('paid', false)
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
    if (cookieFilter) {
      rows = rows.filter((s) =>
        (s.sale_items ?? []).some((item) => item.cookie_id === cookieFilter),
      )
    }

    setSales(rows)
    setCookies((cookieData as Cookie[]) ?? [])
    setLoading(false)
  }, [customerFilter, cookieFilter, paidFilter, fromDate, toDate])

  useEffect(() => {
    load()
  }, [load])

  function startEdit(sale: SaleWithRelations) {
    setEditing(sale)
    setEditDate(toDateInputValue(sale.sold_at))
    setEditPaid(Boolean(sale.paid))
    setEditLines(
      (sale.sale_items ?? []).map((item) => ({
        key: item.id,
        cookie_id: item.cookie_id,
        quantity: item.quantity,
        unit_price: String(item.unit_price),
        priceTouched: true,
      })),
    )
  }

  function updateEditLine(key: string, patch: Partial<SaleLineDraft>) {
    setEditLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    )
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return

    const items = editLines.map((line) => {
      const unit = Number.parseFloat(line.unit_price) || 0
      return {
        cookie_id: line.cookie_id,
        quantity: line.quantity,
        unit_price: unit,
        total: line.quantity * unit,
      }
    })

    if (items.length === 0 || items.some((item) => !item.cookie_id || item.quantity < 1)) {
      setError('A venda precisa de pelo menos um item válido')
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase
      .from('sales')
      .update({
        paid: editPaid,
        sold_at: new Date(`${editDate}T12:00:00`).toISOString(),
      })
      .eq('id', editing.id)

    if (updateError) {
      setSaving(false)
      setError(updateError.message)
      return
    }

    const { error: deleteError } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', editing.id)

    if (deleteError) {
      setSaving(false)
      setError(deleteError.message)
      return
    }

    const { error: insertError } = await supabase.from('sale_items').insert(
      items.map((item) => ({
        sale_id: editing.id,
        ...item,
      })),
    )

    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setEditing(null)
    await load()
  }

  async function togglePaid(sale: SaleWithRelations) {
    const { error: updateError } = await supabase
      .from('sales')
      .update({ paid: !sale.paid })
      .eq('id', sale.id)

    if (updateError) {
      setError(updateError.message)
      return
    }
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

  const filteredTotal = sales.reduce((sum, s) => sum + saleTotal(s), 0)
  const unpaidTotal = sales
    .filter((s) => !s.paid)
    .reduce((sum, s) => sum + saleTotal(s), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-cocoa-900">Vendas</h2>
          <p className="mt-1 text-sm text-cocoa-700/70">
            {loading
              ? 'Carregando…'
              : `${sales.length} venda(s) · ${formatCurrency(filteredTotal)}${
                  unpaidTotal > 0 ? ` · ${formatCurrency(unpaidTotal)} pendente` : ''
                }`}
          </p>
        </div>
        <Link to="/vendas/nova">
          <Button variant="secondary">Nova venda</Button>
        </Link>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
          <Select
            label="Pagamento"
            value={paidFilter}
            onChange={(e) => setPaidFilter(e.target.value as PaidFilter)}
          >
            <option value="all">Todos</option>
            <option value="paid">Pagos</option>
            <option value="unpaid">Pendentes</option>
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
            <p className="text-sm text-cocoa-700/70">{editing.customers?.name}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Data"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
              <label className="flex items-end gap-3 pb-2 text-sm font-semibold text-cocoa-800">
                <input
                  type="checkbox"
                  checked={editPaid}
                  onChange={(e) => setEditPaid(e.target.checked)}
                  className="size-4 rounded border-biscuit-200 accent-honey-500"
                />
                Já pagou
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-cocoa-800">Itens</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const first = cookies[0]
                    setEditLines((prev) => [
                      ...prev,
                      newLine(first?.id ?? '', first ? String(first.default_price) : ''),
                    ])
                  }}
                >
                  + Sabor
                </Button>
              </div>

              {editLines.map((line, index) => (
                <div
                  key={line.key}
                  className="space-y-3 rounded-xl border border-biscuit-200 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-cocoa-700/55">
                      Item {index + 1}
                    </p>
                    {editLines.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setEditLines((prev) => prev.filter((l) => l.key !== line.key))
                        }
                      >
                        Remover
                      </Button>
                    ) : null}
                  </div>
                  <Select
                    label="Sabor"
                    value={line.cookie_id}
                    onChange={(e) => updateEditLine(line.key, { cookie_id: e.target.value })}
                  >
                    {cookies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Qtd"
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateEditLine(line.key, {
                          quantity: Number.parseInt(e.target.value, 10) || 1,
                        })
                      }
                    />
                    <Input
                      label="Valor un."
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) =>
                        updateEditLine(line.key, { unit_price: e.target.value })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm font-semibold">
              Total:{' '}
              {formatCurrency(
                editLines.reduce((sum, line) => {
                  const unit = Number.parseFloat(line.unit_price) || 0
                  return sum + line.quantity * unit
                }, 0),
              )}
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
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-cocoa-900">{sale.customers?.name ?? '—'}</p>
                <PaymentBadge paid={Boolean(sale.paid)} />
              </div>
              <p className="text-sm text-cocoa-700/70">
                {saleItemsLabel(sale)} · {saleQuantity(sale)} un. · {formatDate(sale.sold_at)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-xl font-bold text-cocoa-900">
                {formatCurrency(saleTotal(sale))}
              </p>
              <Button variant="ghost" size="sm" onClick={() => togglePaid(sale)}>
                {sale.paid ? 'Marcar pendente' : 'Marcar pago'}
              </Button>
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
