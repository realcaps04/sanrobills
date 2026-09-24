import type { PaymentStatus, StockStatus } from '@/types'
import { cn, paymentStatusLabel, stockStatusLabel } from '@/lib/utils'

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium',
        status === 'paid' && 'bg-emerald-50 text-emerald-700',
        status === 'partial' && 'bg-amber-50 text-amber-700',
        status === 'pending' && 'bg-red-50 text-red-600',
      )}
    >
      {paymentStatusLabel(status)}
    </span>
  )
}

export function StockBadge({ status }: { status: StockStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium',
        status === 'in_stock' && 'bg-emerald-50 text-emerald-700',
        status === 'low_stock' && 'bg-amber-50 text-amber-700',
        status === 'out_of_stock' && 'bg-red-50 text-red-600',
      )}
    >
      {stockStatusLabel(status)}
    </span>
  )
}
