import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const fieldClass =
  'w-full rounded-xl border border-biscuit-200 bg-white/80 px-3.5 py-2.5 text-cocoa-900 outline-none transition placeholder:text-cocoa-700/40 focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20'

type LabelProps = {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
}

export function Field({ label, htmlFor, hint, children }: LabelProps) {
  return (
    <label className="block space-y-1.5" htmlFor={htmlFor}>
      <span className="text-sm font-semibold text-cocoa-800">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-cocoa-700/60">{hint}</span> : null}
    </label>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }

export function Input({ label, hint, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name
  return (
    <Field label={label} htmlFor={inputId} hint={hint}>
      <input id={inputId} className={`${fieldClass} ${className}`} {...props} />
    </Field>
  )
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  hint?: string
  children: React.ReactNode
}

export function Select({ label, hint, id, className = '', children, ...props }: SelectProps) {
  const selectId = id ?? props.name
  return (
    <Field label={label} htmlFor={selectId} hint={hint}>
      <select id={selectId} className={`${fieldClass} ${className}`} {...props}>
        {children}
      </select>
    </Field>
  )
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  hint?: string
}

export function Textarea({ label, hint, id, className = '', ...props }: TextareaProps) {
  const areaId = id ?? props.name
  return (
    <Field label={label} htmlFor={areaId} hint={hint}>
      <textarea id={areaId} className={`${fieldClass} ${className}`} {...props} />
    </Field>
  )
}
