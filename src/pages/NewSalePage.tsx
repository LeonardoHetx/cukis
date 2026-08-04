import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { CustomerAutocomplete } from '../components/CustomerAutocomplete'
import { Input, Select } from '../components/Input'
import { findOrCreateCustomer } from '../lib/customers'
import { formatCurrency, toDateInputValue } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Cookie, SaleLineDraft } from '../types/database'

function newLine(cookieId = '', defaultPrice = ''): SaleLineDraft {
  return {
    key: crypto.randomUUID(),
    cookie_id: cookieId,
    quantity: '1',
    unit_price: defaultPrice,
    priceTouched: false,
  }
}

export function NewSalePage() {
  const navigate = useNavigate()
  const [cookies, setCookies] = useState<Cookie[]>([])
  const [customerName, setCustomerName] = useState('')
  const [soldAt, setSoldAt] = useState(toDateInputValue())
  const [paid, setPaid] = useState(false)
  const [lines, setLines] = useState<SaleLineDraft[]>([newLine()])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase
      .from('cookies')
      .select('*')
      .eq('active', true)
      .order('name')
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
          return
        }
        const list = (data as Cookie[]) ?? []
        setCookies(list)
        if (list.length > 0) {
          setLines([newLine(list[0].id, String(list[0].default_price))])
        }
      })
  }, [])

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const qty = Number.parseInt(line.quantity, 10) || 0
        const unit = Number.parseFloat(line.unit_price) || 0
        return sum + qty * unit
      }, 0),
    [lines],
  )

  function updateLine(key: string, patch: Partial<SaleLineDraft>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  function setCookieOnLine(key: string, cookieId: string) {
    const cookie = cookies.find((c) => c.id === cookieId)
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line
        return {
          ...line,
          cookie_id: cookieId,
          unit_price: line.priceTouched
            ? line.unit_price
            : String(cookie?.default_price ?? line.unit_price),
        }
      }),
    )
  }

  function addLine() {
    const first = cookies[0]
    setLines((prev) => [
      ...prev,
      newLine(first?.id ?? '', first ? String(first.default_price) : ''),
    ])
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.key !== key)))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!customerName.trim()) {
      setError('Informe o nome do cliente')
      return
    }
    if (cookies.length === 0) {
      setError('Cadastre um sabor antes de registrar vendas')
      return
    }

    const items = lines.map((line) => {
      const quantity = Number.parseInt(line.quantity, 10) || 0
      const unit = Number.parseFloat(line.unit_price) || 0
      return {
        cookie_id: line.cookie_id,
        quantity,
        unit_price: unit,
        total: quantity * unit,
      }
    })

    if (items.some((item) => !item.cookie_id || item.quantity < 1)) {
      setError('Preencha sabor e quantidade em todos os itens')
      return
    }

    setSubmitting(true)
    try {
      const customer = await findOrCreateCustomer(customerName)
      const soldAtIso = new Date(`${soldAt}T12:00:00`).toISOString()

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: customer.id,
          paid,
          sold_at: soldAtIso,
        })
        .select('id')
        .single()

      if (saleError) throw saleError

      const { error: itemsError } = await supabase.from('sale_items').insert(
        items.map((item) => ({
          sale_id: sale.id,
          ...item,
        })),
      )

      if (itemsError) {
        await supabase.from('sales').delete().eq('id', sale.id)
        throw itemsError
      }

      navigate('/vendas')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar venda')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold text-cocoa-900">Nova venda</h2>
        <p className="mt-1 text-sm text-cocoa-700/70">
          Adicione quantos sabores quiser na mesma venda
        </p>
      </div>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <CustomerAutocomplete
            value={customerName}
            onChange={setCustomerName}
            required
          />

          <Input
            label="Data da venda"
            type="date"
            name="sold_at"
            required
            value={soldAt}
            onChange={(e) => setSoldAt(e.target.value)}
          />

          <label className="flex items-center gap-3 rounded-xl border border-biscuit-200 bg-white/60 px-4 py-3 text-sm font-semibold text-cocoa-800">
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
              className="size-4 rounded border-biscuit-200 accent-honey-500"
            />
            Já pagou
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-cocoa-800">Itens</h3>
              <Button type="button" variant="ghost" size="sm" onClick={addLine} disabled={cookies.length === 0}>
                + Adicionar sabor
              </Button>
            </div>

            {lines.map((line, index) => (
              <div
                key={line.key}
                className="space-y-3 rounded-xl border border-biscuit-200 bg-white/50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cocoa-700/55">
                    Item {index + 1}
                  </p>
                  {lines.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(line.key)}
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>

                <Select
                  label="Sabor"
                  value={line.cookie_id}
                  onChange={(e) => setCookieOnLine(line.key, e.target.value)}
                  required
                >
                  {cookies.length === 0 ? (
                    <option value="">Nenhum sabor ativo</option>
                  ) : (
                    cookies.map((cookie) => (
                      <option key={cookie.id} value={cookie.id}>
                        {cookie.name} — {formatCurrency(Number(cookie.default_price))}
                      </option>
                    ))
                  )}
                </Select>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Quantidade"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.key, {
                        quantity: e.target.value.replace(/\D/g, ''),
                      })
                    }
                  />
                  <Input
                    label="Valor unitário (R$)"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={line.unit_price}
                    onChange={(e) =>
                      updateLine(line.key, {
                        unit_price: e.target.value,
                        priceTouched: true,
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-biscuit-100/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-cocoa-700/55">
              Total
            </p>
            <p className="font-display text-2xl font-bold text-cocoa-900">
              {formatCurrency(total)}
            </p>
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          {cookies.length === 0 ? (
            <p className="text-sm text-cocoa-700/70">
              Nenhum sabor cadastrado.{' '}
              <Link className="font-semibold text-honey-600 underline" to="/sabores">
                Cadastre sabores
              </Link>{' '}
              primeiro.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={submitting || cookies.length === 0}>
              {submitting ? 'Salvando…' : 'Registrar venda'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/vendas')}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
