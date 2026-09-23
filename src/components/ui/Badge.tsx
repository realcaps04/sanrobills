import type { PaymentStatus, StockStatus } from '@/types'
import { cn, paymentStatusLabel, stockStatusLabel } from '@/lib/utils'

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        status === 'paid' && 'bg-emerald-50 text-success',
        status === 'partial' && 'bg-amber-50 text-warning',
        status === 'pending' && 'bg-red-50 text-danger',
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
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        status === 'in_stock' && 'bg-emerald-50 text-success',
        status === 'low_stock' && 'bg-amber-50 text-warning',
        status === 'out_of_stock' && 'bg-red-50 text-danger',
      )}
    >
      {stockStatusLabel(status)}
    </span>
  )
}
