type Props = {
  paid: boolean
  className?: string
}

export function PaymentBadge({ paid, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        paid
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-amber-100 text-amber-900'
      } ${className}`}
    >
      {paid ? 'Pago' : 'Pendente'}
    </span>
  )
}
