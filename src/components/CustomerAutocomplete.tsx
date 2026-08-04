import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Customer } from '../types/database'
import { Field } from './Input'

type Props = {
  value: string
  onChange: (value: string) => void
  onSelect?: (customer: Customer) => void
  required?: boolean
  label?: string
  hint?: string
  placeholder?: string
  /** Se true, só seleciona clientes existentes (não sugere criar novo). */
  selectOnly?: boolean
}

export function CustomerAutocomplete({
  value,
  onChange,
  onSelect,
  required,
  label = 'Cliente',
  hint = 'Digite para filtrar ou abra a lista — se for novo, será cadastrado na venda',
  placeholder = 'Buscar ou selecionar cliente',
  selectOnly = false,
}: Props) {
  const id = useId()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const loadCustomers = useCallback(async () => {
    if (loaded) return
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('name').limit(200)
    setCustomers((data as Customer[]) ?? [])
    setLoaded(true)
    setLoading(false)
  }, [loaded])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => c.name.toLowerCase().includes(q))
  }, [customers, value])

  const exactMatch = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return false
    return customers.some((c) => c.name.toLowerCase() === q)
  }, [customers, value])

  async function openList() {
    await loadCustomers()
    setOpen(true)
  }

  function pick(customer: Customer) {
    onChange(customer.name)
    onSelect?.(customer)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <Field label={label} htmlFor={id} hint={hint}>
        <div className="flex gap-2">
          <input
            id={id}
            className="w-full rounded-xl border border-biscuit-200 bg-white/80 px-3.5 py-2.5 text-cocoa-900 outline-none transition placeholder:text-cocoa-700/40 focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20"
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              void openList()
            }}
            onFocus={() => {
              void openList()
            }}
            placeholder={placeholder}
            autoComplete="off"
            required={required}
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
          />
          <button
            type="button"
            className="shrink-0 rounded-xl border border-biscuit-200 bg-white/80 px-3 text-sm font-semibold text-cocoa-800 transition hover:bg-biscuit-100"
            onClick={() => {
              if (open) setOpen(false)
              else void openList()
            }}
            aria-label="Abrir lista de clientes"
          >
            {open ? '▲' : '▼'}
          </button>
        </div>
      </Field>

      {open ? (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-biscuit-200 bg-white py-1 shadow-lg shadow-cocoa-900/10"
        >
          {loading ? (
            <li className="px-3.5 py-2 text-sm text-cocoa-700/60">Carregando clientes…</li>
          ) : null}

          {!loading && customers.length === 0 ? (
            <li className="px-3.5 py-2 text-sm text-cocoa-700/60">
              Nenhum cliente cadastrado ainda.
            </li>
          ) : null}

          {!loading && customers.length > 0 && filtered.length === 0 ? (
            <li className="px-3.5 py-2 text-sm text-cocoa-700/60">
              Nenhum cliente com “{value.trim()}”.
            </li>
          ) : null}

          {!loading &&
            filtered.map((customer) => (
              <li key={customer.id} role="option">
                <button
                  type="button"
                  className="w-full px-3.5 py-2 text-left text-sm text-cocoa-900 hover:bg-biscuit-100"
                  onClick={() => pick(customer)}
                >
                  {customer.name}
                </button>
              </li>
            ))}

          {!loading && !selectOnly && value.trim() && !exactMatch ? (
            <li className="border-t border-biscuit-100">
              <button
                type="button"
                className="w-full px-3.5 py-2 text-left text-sm font-semibold text-honey-600 hover:bg-biscuit-100"
                onClick={() => {
                  onChange(value.trim())
                  setOpen(false)
                }}
              >
                Usar novo cliente “{value.trim()}”
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
