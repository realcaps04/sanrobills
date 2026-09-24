import type { SelectHTMLAttributes, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: ReactNode
  wrapperClassName?: string
}

export function Select({
  label,
  error,
  className,
  wrapperClassName,
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id || props.name

  return (
    <div className={cn(label ? 'w-full' : 'inline-block', wrapperClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn('sanro-select', error && 'sanro-select--error', className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 text-[#9CA3AF]',
            className?.includes('sanro-select--sm') ? 'right-2 h-3.5 w-3.5' : 'right-3 h-4 w-4',
          )}
          strokeWidth={1.75}
        />
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}
