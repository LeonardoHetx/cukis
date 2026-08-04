import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  children: ReactNode
}

const variants = {
  primary:
    'bg-cocoa-900 text-biscuit-50 hover:bg-cocoa-800 shadow-sm shadow-cocoa-900/15',
  secondary:
    'bg-honey-500 text-cocoa-950 hover:bg-honey-400 shadow-sm shadow-honey-600/20',
  ghost:
    'bg-transparent text-cocoa-800 hover:bg-biscuit-100 border border-biscuit-200',
  danger: 'bg-red-700 text-white hover:bg-red-600',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
