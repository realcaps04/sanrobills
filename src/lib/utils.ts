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

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function currentMonthRange() {
  const today = new Date()
  return {
    from: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: toISODate(today),
  }
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy')
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function belowHundred(n: number): string {
  if (n < 20) return ONES[n]
  return [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(' ')
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', rest ? belowHundred(rest) : '']
    .filter(Boolean)
    .join(' ')
}

function integerToWords(n: number): string {
  if (n === 0) return 'Zero'
  const parts: string[] = []
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const rest = n % 1000
  if (crore) parts.push(`${integerToWords(crore)} Crore`)
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`)
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`)
  if (rest) parts.push(belowThousand(rest))
  return parts.join(' ')
}

export function amountInWords(amount: number): string {
  const totalPaise = Math.round(Math.abs(amount) * 100)
  const rupees = Math.floor(totalPaise / 100)
  const paise = totalPaise % 100
  const words = `${integerToWords(rupees)} Rupees`
  return paise ? `${words} and ${belowHundred(paise)} Paise only` : `${words} only`
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
