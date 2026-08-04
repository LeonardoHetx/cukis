import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Customer } from '../types/database'
import { Field } from './Input'

type Props = {
  value: string
  onChange: (value: string) => void
  onSelect?: (customer: Customer) => void
  required?: boolean
}

export function CustomerAutocomplete({ value, onChange, onSelect, required }: Props) {
  const id = useId()
  const [suggestions, setSuggestions] = useState<Customer[]>([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    const q = value.trim()
    if (q.length < 1) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', `%${q}%`)
        .order('name')
        .limit(8)

      setSuggestions((data as Customer[]) ?? [])
      setOpen(true)
    }, 200)

    return () => clearTimeout(timer)
  }, [value])

  return (
    <div ref={wrapRef} className="relative">
      <Field
        label="Cliente"
        htmlFor={id}
        hint="Digite o nome — se for novo, será cadastrado na venda"
      >
        <input
          id={id}
          className="w-full rounded-xl border border-biscuit-200 bg-white/80 px-3.5 py-2.5 text-cocoa-900 outline-none transition placeholder:text-cocoa-700/40 focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Nome do cliente"
          autoComplete="off"
          required={required}
        />
      </Field>

      {open && suggestions.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-biscuit-200 bg-white py-1 shadow-lg shadow-cocoa-900/10">
          {suggestions.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                className="w-full px-3.5 py-2 text-left text-sm text-cocoa-900 hover:bg-biscuit-100"
                onClick={() => {
                  onChange(customer.name)
                  onSelect?.(customer)
                  setOpen(false)
                }}
              >
                {customer.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
