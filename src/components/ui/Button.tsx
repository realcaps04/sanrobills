import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/25 disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' && 'h-8 px-3 text-[13px]',
        size === 'md' && 'h-9 px-3.5 text-sm',
        size === 'lg' && 'h-10 px-4 text-sm',
        variant === 'primary' &&
          'bg-brand-600 text-white hover:bg-brand-700',
        variant === 'secondary' &&
          'bg-brand-50 text-brand-700 hover:bg-brand-100',
        variant === 'outline' &&
          'bg-white sanro-control text-ink-secondary hover:bg-surface-muted hover:text-ink',
        variant === 'ghost' &&
          'text-ink-secondary hover:bg-surface-muted hover:text-ink',
        variant === 'danger' && 'bg-danger text-white hover:bg-red-700',
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
