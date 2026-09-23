import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({
  children,
  className,
  title,
  action,
}: {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-white',
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-5 py-10 text-center text-sm text-ink-muted">{message}</div>
  )
}
