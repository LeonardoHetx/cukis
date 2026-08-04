import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { formatCurrency } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Cookie } from '../types/database'

const emptyForm = { name: '', default_price: '', active: true }

export function CookiesPage() {
  const [cookies, setCookies] = useState<Cookie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('cookies')
      .select('*')
      .order('name')

    if (err) setError(err.message)
    else setCookies((data as Cookie[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function startEdit(cookie: Cookie) {
    setEditingId(cookie.id)
    setForm({
      name: cookie.name,
      default_price: String(cookie.default_price),
      active: cookie.active,
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const price = Number.parseFloat(form.default_price)
    if (!form.name.trim() || !Number.isFinite(price) || price < 0) {
      setError('Preencha nome e preço válidos')
      return
    }

    setSubmitting(true)
    const payload = {
      name: form.name.trim(),
      default_price: price,
      active: form.active,
    }

    const result = editingId
      ? await supabase.from('cookies').update(payload).eq('id', editingId)
      : await supabase.from('cookies').insert(payload)

    setSubmitting(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    resetForm()
    await load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este sabor? Vendas antigas ficam vinculadas a ele.')) return
    const { error: err } = await supabase.from('cookies').delete().eq('id', id)
    if (err) {
      setError(
        err.code === '23503'
          ? 'Não é possível excluir: existem vendas com este sabor. Desative-o em vez disso.'
          : err.message,
      )
      return
    }
    await load()
  }

  async function toggleActive(cookie: Cookie) {
    const { error: err } = await supabase
      .from('cookies')
      .update({ active: !cookie.active })
      .eq('id', cookie.id)
    if (err) setError(err.message)
    else await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold text-cocoa-900">Sabores</h2>
        <p className="mt-1 text-sm text-cocoa-700/70">
          Cadastre cookies e o preço padrão usado nas vendas
        </p>
      </div>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <h3 className="font-display text-xl font-bold">
            {editingId ? 'Editar sabor' : 'Novo sabor'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nome"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Chocolate Chip"
            />
            <Input
              label="Preço padrão (R$)"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.default_price}
              onChange={(e) => setForm((f) => ({ ...f, default_price: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-cocoa-800">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="size-4 rounded border-biscuit-200"
            />
            Ativo (aparece na nova venda)
          </label>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando…' : editingId ? 'Salvar' : 'Cadastrar'}
            </Button>
            {editingId ? (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {loading ? <p className="text-cocoa-700/70">Carregando…</p> : null}
        {!loading && cookies.length === 0 ? (
          <Card>
            <p className="text-cocoa-700/70">Nenhum sabor cadastrado ainda.</p>
          </Card>
        ) : null}

        {cookies.map((cookie) => (
          <Card
            key={cookie.id}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p className="font-semibold text-cocoa-900">
                {cookie.name}
                {!cookie.active ? (
                  <span className="ml-2 text-xs font-semibold text-cocoa-700/50">
                    inativo
                  </span>
                ) : null}
              </p>
              <p className="text-sm text-cocoa-700/70">
                {formatCurrency(Number(cookie.default_price))}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => startEdit(cookie)}>
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toggleActive(cookie)}>
                {cookie.active ? 'Desativar' : 'Ativar'}
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(cookie.id)}>
                Excluir
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
