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
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7539FF]/30 disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-11 px-5 text-[15px]',
        variant === 'primary' && 'bg-[#7539FF] text-white hover:bg-[#6428F0]',
        variant === 'secondary' && 'bg-[#7539FF]/10 text-[#7539FF] hover:bg-[#7539FF]/15',
        variant === 'outline' &&
          'border border-[#E6E8F0] bg-white text-[#1F2937] hover:bg-[#F5F6FA]',
        variant === 'ghost' && 'text-[#4B5563] hover:bg-[#F5F6FA] hover:text-[#1F2937]',
        variant === 'danger' && 'bg-[#DC2626] text-white hover:bg-red-700',
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
