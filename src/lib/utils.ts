import { format, parseISO } from 'date-fns'
import type { PaymentStatus, StockStatus } from '@/types'

export function cn(...classes: Array<string | false | null | undefined | 0 | ''>) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyExact(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy')
}

export function greetingForHour(hour = new Date().getHours()): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function paymentStatusLabel(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    paid: 'Paid',
    partial: 'Partial',
    pending: 'Pending',
  }
  return map[status]
}

export function stockStatusLabel(status: StockStatus): string {
  const map: Record<StockStatus, string> = {
    in_stock: 'In Stock',
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
  }
  return map[status]
}

export function calcLineTotal(
  quantity: number,
  rate: number,
  discount: number,
  gstRate: number,
) {
  const base = quantity * rate - discount
  const tax = (base * gstRate) / 100
  return {
    taxable: base,
    tax,
    total: base + tax,
  }
}
