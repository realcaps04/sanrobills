import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns'
import {
  ArrowUpRight,
  Banknote,
  Box,
  FileText,
  MoreVertical,
  Package,
  ShoppingCart,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PaymentBadge } from '@/components/ui/Badge'
import { useCompanySettings } from '@/lib/company'
import { fetchInvoices, fetchProducts } from '@/lib/data'
import { useAsync } from '@/lib/useAsync'
import { cn, formatCurrency, formatDate, toISODate } from '@/lib/utils'
import type { Invoice, Product } from '@/types'

const PAYMENT_DUE_DAYS = 15

async function loadDashboard() {
  const [invoices, products] = await Promise.all([fetchInvoices(), fetchProducts()])
  return { invoices, products }
}

function monthKey(date: Date) {
  return format(date, 'yyyy-MM')
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

function dueDateOf(invoice: Invoice) {
  return addDays(parseISO(invoice.invoice_date), PAYMENT_DUE_DAYS)
}

function ChangeHint({
  value,
  risingIsBad,
}: {
  value: number | null
  risingIsBad?: boolean
}) {
  if (value === null) return null
  const up = value >= 0
  const bad = risingIsBad ? up : !up
  return (
    <span
      className={cn(
        'mt-2 inline-flex items-center gap-0.5 text-[12px] font-medium',
        bad ? 'text-red-600' : 'text-emerald-600',
      )}
    >
      <ArrowUpRight
        className={cn('h-3.5 w-3.5', !up && 'rotate-180')}
        strokeWidth={2}
      />
      {`${up ? '+ ' : ''}${Math.abs(value).toFixed(0)}% vs last month`}
    </span>
  )
}

export function DashboardPage() {
  const company = useCompanySettings()
  const [month, setMonth] = useState(() => monthKey(new Date()))
  const { data, loading, error } = useAsync(loadDashboard, [])

  const view = useMemo(() => {
    const invoices = data?.invoices ?? []
    const products = data?.products ?? []
    const monthDate = parseISO(`${month}-01`)
    const prevMonth = monthKey(subMonths(monthDate, 1))

    const inMonth = invoices.filter((i) => i.invoice_date.startsWith(month))
    const inPrev = invoices.filter((i) => i.invoice_date.startsWith(prevMonth))
    const sum = (list: Invoice[]) => list.reduce((s, i) => s + i.grand_total, 0)

    const unpaid = invoices
      .filter((i) => i.balance_due > 0)
      .sort((a, b) => b.balance_due - a.balance_due)

    const lowStock = products
      .filter((p) => p.stock_quantity <= p.minimum_stock)
      .sort((a, b) => a.stock_quantity - b.stock_quantity)

    const days = eachDayOfInterval({
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
    })
    const salesByDay = days.map((day) => {
      const key = toISODate(day)
      return {
        day: format(day, 'd'),
        total: invoices
          .filter((i) => i.invoice_date === key)
          .reduce((s, i) => s + i.grand_total, 0),
      }
    })
    const maxDaySales = Math.max(1, ...salesByDay.map((d) => d.total))

    return {
      totalSales: sum(inMonth),
      salesChange: percentChange(sum(inMonth), sum(inPrev)),
      invoiceCount: inMonth.length,
      invoiceChange: percentChange(inMonth.length, inPrev.length),
      pending: unpaid.reduce((s, i) => s + i.balance_due, 0),
      pendingChange: percentChange(
        unpaid.reduce((s, i) => s + i.balance_due, 0),
        inPrev.filter((i) => i.balance_due > 0).reduce((s, i) => s + i.balance_due, 0),
      ),
      lowStockCount: lowStock.length,
      recent: invoices.slice(0, 6),
      outstanding: unpaid.slice(0, 6),
      lowStock: lowStock.slice(0, 5),
      salesByDay,
      maxDaySales,
      monthLabel: format(monthDate, 'MMM yyyy'),
    }
  }, [data, month])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {company.company_name || 'Sanro Fibre Glass Industries'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-md bg-white px-3 text-sm text-ink sanro-control outline-none"
            aria-label="Select month"
          />
          <Link to="/bills/new">
            <Button size="sm">
              <FileText className="h-4 w-4" strokeWidth={1.75} />
              New Bill
            </Button>
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Sales"
          value={loading ? '—' : formatCurrency(view.totalSales)}
          icon={FileText}
          tone="bg-sky-50 text-sky-600"
        >
          <ChangeHint value={view.salesChange} />
        </KpiCard>
        <KpiCard
          label="Total Invoices"
          value={loading ? '—' : String(view.invoiceCount)}
          icon={ShoppingCart}
          tone="bg-violet-50 text-violet-600"
        >
          <ChangeHint value={view.invoiceChange} />
        </KpiCard>
        <KpiCard
          label="Pending Payments"
          value={loading ? '—' : formatCurrency(view.pending)}
          icon={Banknote}
          tone="bg-amber-50 text-amber-600"
        >
          <ChangeHint value={view.pendingChange} risingIsBad />
        </KpiCard>
        <KpiCard
          label="Low Stock Items"
          value={loading ? '—' : String(view.lowStockCount)}
          icon={Box}
          tone="bg-rose-50 text-rose-600"
        >
          <p className="mt-2 text-[12px] text-ink-muted">
            {view.lowStockCount > 0 ? 'Need attention.' : 'All stock levels are fine.'}
          </p>
        </KpiCard>
      </div>

      {/* Recent + Outstanding */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Recent Invoices"
          action={
            <Link to="/invoices" className="text-[13px] font-medium text-accent hover:underline">
              View all
            </Link>
          }
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5 font-semibold">Invoice No.</th>
                <th className="px-4 py-2.5 font-semibold">Customer</th>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Amount</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0F3]">
              {view.recent.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#FAFBFC]">
                  <td className="px-4 py-3 font-medium text-[#1e3a5f]">
                    {inv.invoice_number}
                  </td>
                  <td className="px-4 py-3 text-ink">{inv.customer_name || '—'}</td>
                  <td className="px-4 py-3 text-ink-muted">{formatDate(inv.invoice_date)}</td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {formatCurrency(inv.grand_total)}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge status={inv.payment_status} />
                  </td>
                  <td className="px-4 py-3">
                    <RowActions to={`/invoices/${inv.id}`} />
                  </td>
                </tr>
              ))}
              {!loading && view.recent.length === 0 && (
                <EmptyRow cols={6} message="No invoices yet." />
              )}
              {loading && <EmptyRow cols={6} message="Loading…" />}
            </tbody>
          </table>
        </Panel>

        <Panel
          title="Outstanding Payments"
          action={
            <Link to="/invoices" className="text-[13px] font-medium text-accent hover:underline">
              View all
            </Link>
          }
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5 font-semibold">Customer</th>
                <th className="px-4 py-2.5 font-semibold">Invoice No.</th>
                <th className="px-4 py-2.5 font-semibold">Due Amount</th>
                <th className="px-4 py-2.5 font-semibold">Due Date</th>
                <th className="px-4 py-2.5 font-semibold">Days</th>
                <th className="px-4 py-2.5 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0F3]">
              {view.outstanding.map((inv) => {
                const due = dueDateOf(inv)
                const daysLate = Math.max(0, differenceInCalendarDays(new Date(), due))
                return (
                  <tr key={inv.id} className="hover:bg-[#FAFBFC]">
                    <td className="px-4 py-3 font-medium text-ink">
                      {inv.customer_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#1e3a5f]">{inv.invoice_number}</td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {formatCurrency(inv.balance_due)}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{formatDate(due)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                          daysLate > 0
                            ? 'bg-red-50 text-red-600'
                            : 'bg-emerald-50 text-emerald-700',
                        )}
                      >
                        {daysLate}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RowActions to={`/invoices/${inv.id}`} />
                    </td>
                  </tr>
                )
              })}
              {!loading && view.outstanding.length === 0 && (
                <EmptyRow cols={6} message="No outstanding payments." />
              )}
              {loading && <EmptyRow cols={6} message="Loading…" />}
            </tbody>
          </table>
        </Panel>
      </div>

      {/* Low stock + Sales chart */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Low Stock Items"
          action={
            <Link to="/products" className="text-[13px] font-medium text-accent hover:underline">
              Manage
            </Link>
          }
        >
          <ul className="divide-y divide-[#EEF0F3]">
            {view.lowStock.map((p) => (
              <LowStockRow key={p.id} product={p} />
            ))}
            {!loading && view.lowStock.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-ink-muted">
                No low stock items.
              </li>
            )}
            {loading && (
              <li className="px-4 py-10 text-center text-sm text-ink-muted">Loading…</li>
            )}
          </ul>
        </Panel>

        <Panel title="Sales Overview" action={<span className="text-[13px] text-ink-muted">{view.monthLabel}</span>}>
          <div className="px-4 pb-4 pt-2">
            <div className="flex h-48 items-end gap-1">
              {view.salesByDay.map((d, i) => {
                const height = Math.max(2, (d.total / view.maxDaySales) * 100)
                const showLabel = i === 0 || i === view.salesByDay.length - 1 || Number(d.day) % 5 === 0
                return (
                  <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <div
                      className="w-full max-w-[14px] rounded-t-sm bg-gradient-to-t from-[#1e3a5f] to-[#60a5fa]"
                      style={{ height: `${height}%` }}
                      title={`${d.day}: ${formatCurrency(d.total)}`}
                    />
                    <span
                      className={cn(
                        'text-[10px] text-ink-muted',
                        !showLabel && 'invisible',
                      )}
                    >
                      {d.day}
                    </span>
                  </div>
                )
              })}
            </div>
            {!loading && view.totalSales === 0 && (
              <p className="mt-2 text-center text-sm text-ink-muted">
                No sales in {view.monthLabel}.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  children,
}: {
  label: string
  value: string
  icon: typeof FileText
  tone: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-xl bg-white p-5 sanro-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-ink-muted">{label}</div>
          <div className="mt-2 text-[1.5rem] font-semibold tracking-tight text-ink">
            {value}
          </div>
          {children}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone)}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-white sanro-panel">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sanro-divider">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}

function RowActions({ to }: { to: string }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        to={to}
        className="rounded-md px-2 py-1 text-[12px] font-medium text-accent hover:bg-blue-50"
      >
        View
      </Link>
      <button
        type="button"
        className="rounded-md p-1 text-ink-muted hover:bg-surface-muted"
        aria-label="More actions"
      >
        <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  )
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-sm text-ink-muted">
        {message}
      </td>
    </tr>
  )
}

function LowStockRow({ product }: { product: Product }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-ink-muted">
        <Package className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{product.name}</div>
        <div className="text-xs text-ink-muted">{product.product_code}</div>
      </div>
      <div className="text-right text-xs">
        <div>
          <span className="text-ink-muted">Current </span>
          <span className="font-semibold text-red-600">{product.stock_quantity}</span>
        </div>
        <div className="text-ink-muted">Min {product.minimum_stock}</div>
      </div>
      <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
        Low
      </span>
    </li>
  )
}
