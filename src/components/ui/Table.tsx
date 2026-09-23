import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border bg-surface-muted/80 text-xs font-medium uppercase tracking-wide text-ink-muted">
        {children}
      </tr>
    </thead>
  )
}

export function TH({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn('px-5 py-3 font-medium', className)}>{children}</th>
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>
}

export function TR({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn('hover:bg-surface-muted/50', className)}>{children}</tr>
}

export function TD({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn('px-5 py-3.5 text-ink', className)}>{children}</td>
}
