import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: Props) {
  return (
    <div
      className={`rounded-2xl border border-biscuit-200/80 bg-white/70 p-5 shadow-sm shadow-cocoa-900/5 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-cocoa-700/55">
        {label}
      </p>
      <p className="font-display text-2xl font-bold text-cocoa-900 sm:text-3xl">{value}</p>
      {hint ? <p className="text-sm text-cocoa-700/60">{hint}</p> : null}
    </Card>
  )
}
