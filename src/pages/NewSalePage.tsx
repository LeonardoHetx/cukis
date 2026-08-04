import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { CustomerAutocomplete } from '../components/CustomerAutocomplete'
import { Input, Select } from '../components/Input'
import { findOrCreateCustomer } from '../lib/customers'
import { formatCurrency, toDateInputValue } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Cookie } from '../types/database'

export function NewSalePage() {
  const navigate = useNavigate()
  const [cookies, setCookies] = useState<Cookie[]>([])
  const [customerName, setCustomerName] = useState('')
  const [cookieId, setCookieId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState('')
  const [soldAt, setSoldAt] = useState(toDateInputValue())
  const [priceTouched, setPriceTouched] = useState(false)
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
          setCookieId(list[0].id)
          setUnitPrice(String(list[0].default_price))
        }
      })
  }, [])

  useEffect(() => {
    if (priceTouched || !cookieId) return
    const cookie = cookies.find((c) => c.id === cookieId)
    if (cookie) setUnitPrice(String(cookie.default_price))
  }, [cookieId, cookies, priceTouched])

  const unit = Number.parseFloat(unitPrice) || 0
  const total = useMemo(() => quantity * unit, [quantity, unit])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!customerName.trim()) {
      setError('Informe o nome do cliente')
      return
    }
    if (!cookieId) {
      setError('Cadastre um sabor antes de registrar vendas')
      return
    }
    if (quantity < 1) {
      setError('Quantidade deve ser pelo menos 1')
      return
    }

    setSubmitting(true)
    try {
      const customer = await findOrCreateCustomer(customerName)
      const soldAtIso = new Date(`${soldAt}T12:00:00`).toISOString()

      const { error: insertError } = await supabase.from('sales').insert({
        customer_id: customer.id,
        cookie_id: cookieId,
        quantity,
        unit_price: unit,
        total,
        sold_at: soldAtIso,
      })

      if (insertError) throw insertError
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
          Anote rápido — o valor vem do sabor e pode ser ajustado
        </p>
      </div>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <CustomerAutocomplete
            value={customerName}
            onChange={setCustomerName}
            required
          />

          <Select
            label="Sabor"
            name="cookie"
            value={cookieId}
            onChange={(e) => {
              setCookieId(e.target.value)
              setPriceTouched(false)
            }}
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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantidade"
              type="number"
              name="quantity"
              min={1}
              step={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(Number.parseInt(e.target.value, 10) || 1)}
            />
            <Input
              label="Valor unitário (R$)"
              type="number"
              name="unit_price"
              min={0}
              step="0.01"
              required
              value={unitPrice}
              onChange={(e) => {
                setPriceTouched(true)
                setUnitPrice(e.target.value)
              }}
              hint="Preenchido pelo sabor; edite se quiser"
            />
          </div>

          <Input
            label="Data da venda"
            type="date"
            name="sold_at"
            required
            value={soldAt}
            onChange={(e) => setSoldAt(e.target.value)}
          />

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
