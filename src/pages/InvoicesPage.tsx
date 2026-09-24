import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO, subMonths } from 'date-fns'
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { fetchInvoices } from '@/lib/data'
import { deleteInvoice } from '@/lib/salesInvoices'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import {
  cn,
  currentMonthRange,
  formatCurrency,
  formatDate,
  paymentStatusLabel,
} from '@/lib/utils'
import type { Invoice, PaymentMethod, PaymentStatus } from '@/types'

const PAGE_SIZE = 12

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  credit: 'Credit',
  partial: 'Partial',
}

const METHOD_STYLES: Record<PaymentMethod, string> = {
  cash: 'bg-slate-100 text-slate-700',
  upi: 'bg-sky-50 text-sky-700',
  bank_transfer: 'bg-rose-50 text-rose-700',
  card: 'bg-violet-50 text-violet-700',
  credit: 'bg-amber-50 text-amber-700',
  partial: 'bg-blue-50 text-blue-700',
}

const STATUS_STYLES: Record<PaymentStatus, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  partial: 'bg-blue-50 text-blue-700',
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

export function InvoicesPage() {
  const emptyRange = currentMonthRange()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all')
  const [method, setMethod] = useState<PaymentMethod | 'all'>('all')
  const [dateRange, setDateRange] = useState(emptyRange)
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<Invoice | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const { data, loading, error, reload } = useAsync(fetchInvoices, [])
  const invoices = useMemo(() => data ?? [], [data])

  const stats = useMemo(() => {
    const inRange = invoices.filter(
      (i) => i.invoice_date >= dateRange.from && i.invoice_date <= dateRange.to,
    )
    const from = parseISO(dateRange.from)
    const prevFrom = format(subMonths(from, 1), 'yyyy-MM-dd')
    const prevTo = format(subMonths(parseISO(dateRange.to), 1), 'yyyy-MM-dd')
    const prevRange = invoices.filter(
      (i) => i.invoice_date >= prevFrom && i.invoice_date <= prevTo,
    )
    const sum = (list: typeof inRange) => list.reduce((s, i) => s + i.grand_total, 0)
    const pendingList = inRange.filter((i) => i.payment_status !== 'paid')
    const paidList = inRange.filter((i) => i.payment_status === 'paid')

    return {
      total: inRange.length,
      sales: sum(inRange),
      salesChange: percentChange(sum(inRange), sum(prevRange)),
      pendingAmount: pendingList.reduce((s, i) => s + i.balance_due, 0),
      pendingCount: pendingList.length,
      paidAmount: paidList.reduce((s, i) => s + i.amount_paid, 0),
      paidCount: paidList.length,
    }
  }, [dateRange, invoices])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return invoices.filter((inv) => {
      const inDate =
        inv.invoice_date >= dateRange.from && inv.invoice_date <= dateRange.to
      const matchesStatus = status === 'all' || inv.payment_status === status
      const matchesMethod = method === 'all' || inv.payment_method === method
      const matchesQuery =
        !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.customer_name.toLowerCase().includes(q) ||
        (inv.customer_phone ?? '').includes(q)
      return inDate && matchesStatus && matchesMethod && matchesQuery
    })
  }, [query, status, method, dateRange, invoices])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const showingFrom = filtered.length === 0 ? 0 : pageStart + 1
  const showingTo = Math.min(pageStart + PAGE_SIZE, filtered.length)

  function clearFilters() {
    setQuery('')
    setStatus('all')
    setMethod('all')
    setDateRange(currentMonthRange())
    setPage(1)
  }

  const pageButtons = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 4) return [1, 2, 3, 4, 5, -1, totalPages]
    if (currentPage >= totalPages - 3) {
      return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, -1, currentPage - 1, currentPage, currentPage + 1, -2, totalPages]
  }, [currentPage, totalPages])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Invoices</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Manage and view all sales invoices
          </p>
        </div>
        <Link to="/invoices/new">
          <Button size="sm">
            <Plus className="h-4 w-4" strokeWidth={2} />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Invoices"
          value={loading ? '—' : String(stats.total)}
          icon={FileText}
          tone="bg-sky-50 text-sky-600"
        />
        <SummaryCard
          label="Total Sales"
          value={loading ? '—' : formatCurrency(stats.sales)}
          icon={TrendingUp}
          tone="bg-emerald-50 text-emerald-600"
          hint="This Month"
          change={stats.salesChange}
        />
        <SummaryCard
          label="Pending Amount"
          value={loading ? '—' : formatCurrency(stats.pendingAmount)}
          icon={Clock3}
          tone="bg-amber-50 text-amber-600"
          hint={`${stats.pendingCount} Invoice${stats.pendingCount === 1 ? '' : 's'}`}
        />
        <SummaryCard
          label="Paid Amount"
          value={loading ? '—' : formatCurrency(stats.paidAmount)}
          icon={CheckCircle2}
          tone="bg-violet-50 text-violet-600"
          hint={`${stats.paidCount} Invoice${stats.paidCount === 1 ? '' : 's'}`}
        />
      </div>

      {/* Filters + table */}
      <div className="overflow-hidden rounded-xl bg-white sanro-panel">
        <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 sanro-divider">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search invoice no, customer name or mobile..."
              className="h-10 w-full rounded-md bg-[#F8F9FC] px-3 pl-10 text-sm outline-none placeholder:text-[#9CA3AF] sanro-control focus:bg-white"
            />
          </div>

          <DateRangeFilter
            from={dateRange.from}
            to={dateRange.to}
            onChange={(r) => {
              setDateRange(r)
              setPage(1)
            }}
          />

          <Select
            className="sanro-select--sm w-auto min-w-[130px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PaymentStatus | 'all')
              setPage(1)
            }}
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </Select>

          <Select
            className="sanro-select--sm w-auto min-w-[140px]"
            value={method}
            onChange={(e) => {
              setMethod(e.target.value as PaymentMethod | 'all')
              setPage(1)
            }}
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="credit">Credit</option>
            <option value="partial">Partial</option>
          </Select>

          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-ink-secondary hover:bg-surface-muted hover:text-ink sanro-control"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
            Clear
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead>
              <tr className="bg-[#F8F9FC] text-[11px] font-semibold uppercase tracking-wide text-ink-muted sanro-divider">
                <th className="w-12 px-4 py-3">#</th>
                <th className="px-4 py-3">Invoice No.</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Amount (Rs)</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0F4]">
              {pageItems.map((inv, index) => (
                <tr key={inv.id} className="hover:bg-[#F8F9FC]/80">
                  <td className="px-4 py-3.5 text-ink-muted">{pageStart + index + 1}</td>
                  <td className="px-4 py-3.5 font-medium text-[#1e3a5f]">
                    {inv.invoice_number}
                  </td>
                  <td className="px-4 py-3.5 text-ink-muted">
                    {formatDate(inv.invoice_date)}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-ink">
                    {inv.customer_name || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-ink-muted">
                    {inv.item_count ?? 0} Item{(inv.item_count ?? 0) === 1 ? '' : 's'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-ink">
                    {formatCurrency(inv.grand_total)}
                  </td>
                  <td className="px-4 py-3.5">
                    {inv.payment_method ? (
                      <span
                        className={cn(
                          'inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium',
                          METHOD_STYLES[inv.payment_method],
                        )}
                      >
                        {METHOD_LABELS[inv.payment_method]}
                      </span>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        'inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium',
                        STATUS_STYLES[inv.payment_status],
                      )}
                    >
                      {paymentStatusLabel(inv.payment_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="rounded-md bg-sky-50 px-2.5 py-1 text-[12px] font-medium text-sky-700 hover:bg-sky-100"
                      >
                        View
                      </Link>
                      <Link
                        to={`/invoices/${inv.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-700 hover:bg-amber-100"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError('')
                          setDeleting(inv)
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-[12px] font-medium text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-ink-muted">
                    {loading
                      ? 'Loading invoices…'
                      : error
                        ? error
                        : invoices.length === 0
                          ? 'No invoices yet. Create your first invoice from New Bill.'
                          : 'No invoices found for this filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-[inset_0_1px_0_0_rgba(15,23,42,0.06)]">
          <div className="text-sm text-ink-muted">
            Showing {showingFrom} to {showingTo} of {filtered.length} invoices
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md p-2 text-ink-muted hover:bg-surface-muted disabled:opacity-40 sanro-control"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageButtons.map((n, i) =>
              n < 0 ? (
                <span key={`e-${i}`} className="px-1 text-ink-muted">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    'min-w-9 rounded-md px-2.5 py-1.5 text-sm font-medium',
                    n === currentPage
                      ? 'bg-[#1e3a5f] text-white'
                      : 'text-ink-muted hover:bg-surface-muted',
                  )}
                >
                  {n}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md p-2 text-ink-muted hover:bg-surface-muted disabled:opacity-40 sanro-control"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onMouseDown={() => {
            if (!deletingBusy) {
              setDeleting(null)
              setDeleteError('')
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white sanro-panel"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Delete invoice"
          >
            <div className="px-5 py-4 sanro-divider">
              <h2 className="text-base font-semibold text-ink">Delete invoice?</h2>
              <p className="mt-1 text-[13px] text-ink-muted">
                This will permanently remove invoice{' '}
                <span className="font-medium text-ink">{deleting.invoice_number}</span>
                {deleting.customer_name ? (
                  <>
                    {' '}
                    for <span className="font-medium text-ink">{deleting.customer_name}</span>
                  </>
                ) : null}
                . This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4">
              {deleteError && (
                <p className="mr-auto max-w-[60%] text-[13px] text-danger">{deleteError}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={deletingBusy}
                onClick={() => {
                  setDeleting(null)
                  setDeleteError('')
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={deletingBusy}
                onClick={() => {
                  void (async () => {
                    setDeletingBusy(true)
                    setDeleteError('')
                    try {
                      if (!isSupabaseConfigured) {
                        throw new Error('Connect Supabase in .env to delete invoices.')
                      }
                      await deleteInvoice(deleting.id)
                      setDeleting(null)
                      reload()
                    } catch (err) {
                      setDeleteError(
                        err instanceof Error ? err.message : 'Could not delete the invoice.',
                      )
                    } finally {
                      setDeletingBusy(false)
                    }
                  })()
                }}
              >
                {deletingBusy ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
  change,
}: {
  label: string
  value: string
  icon: typeof FileText
  tone: string
  hint?: string
  change?: number | null
}) {
  return (
    <div className="rounded-xl bg-white p-5 sanro-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-ink-muted">{label}</div>
          <div className="mt-2 text-[1.5rem] font-semibold tracking-tight text-ink">
            {value}
          </div>
          {hint && <div className="mt-1.5 text-[12px] text-ink-muted">{hint}</div>}
          {change != null && (
            <div
              className={cn(
                'mt-1.5 inline-flex items-center gap-0.5 text-[12px] font-medium',
                change >= 0 ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              <ArrowUpRight
                className={cn('h-3.5 w-3.5', change < 0 && 'rotate-180')}
                strokeWidth={2}
              />
              {`${change >= 0 ? '+ ' : ''}${Math.abs(change).toFixed(0)}%`}
            </div>
          )}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone)}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  )
}
