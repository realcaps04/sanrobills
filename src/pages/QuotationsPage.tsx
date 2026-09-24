import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
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
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { deleteQuotation, fetchQuotations, quotationStatusLabel } from '@/lib/quotations'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { cn, currentMonthRange, formatCurrency, formatDate } from '@/lib/utils'
import type { Quotation, QuotationStatus, QuotationType } from '@/types/quotation'

const PAGE_SIZE = 10

const STATUS_STYLES: Record<QuotationStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-50 text-amber-700',
  converted: 'bg-emerald-50 text-emerald-700',
  expired: 'bg-red-50 text-red-600',
}

const TYPE_LABELS: Record<QuotationType, string> = {
  standard: 'Standard',
  dealer: 'Dealer',
  project: 'Project',
  estimation: 'Estimation',
}

export function QuotationsPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<QuotationStatus | 'all'>('all')
  const [type, setType] = useState<QuotationType | 'all'>('all')
  const [dateRange, setDateRange] = useState(currentMonthRange)
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<Quotation | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const { data, loading, error, reload } = useAsync(fetchQuotations, [])
  const quotations = useMemo(() => data ?? [], [data])

  const stats = useMemo(() => {
    const inRange = quotations.filter(
      (q) => q.quotation_date >= dateRange.from && q.quotation_date <= dateRange.to,
    )
    return {
      total: inRange.length,
      converted: inRange.filter((q) => q.status === 'converted').length,
      pending: inRange.filter((q) => q.status === 'pending' || q.status === 'draft').length,
      expired: inRange.filter((q) => q.status === 'expired').length,
    }
  }, [dateRange, quotations])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return quotations.filter((item) => {
      const inDate =
        item.quotation_date >= dateRange.from && item.quotation_date <= dateRange.to
      const matchesStatus = status === 'all' || item.status === status
      const matchesType = type === 'all' || item.quotation_type === type
      const matchesQuery =
        !q ||
        item.quotation_number.toLowerCase().includes(q) ||
        item.customer_name.toLowerCase().includes(q) ||
        (item.customer_phone ?? '').includes(q)
      return inDate && matchesStatus && matchesType && matchesQuery
    })
  }, [query, status, type, dateRange, quotations])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const showingFrom = filtered.length === 0 ? 0 : pageStart + 1
  const showingTo = Math.min(pageStart + PAGE_SIZE, filtered.length)

  function clearFilters() {
    setQuery('')
    setStatus('all')
    setType('all')
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
          <h1 className="text-xl font-semibold text-ink">Quotations</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Manage and view all quotations
          </p>
        </div>
        <Link to="/quotations/new">
          <Button size="sm">
            <Plus className="h-4 w-4" strokeWidth={2} />
            New Quotation
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Quotations"
          value={loading ? '—' : String(stats.total)}
          icon={FileText}
          tone="bg-sky-50 text-sky-600"
        />
        <SummaryCard
          label="Converted"
          value={loading ? '—' : String(stats.converted)}
          icon={CheckCircle2}
          tone="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          label="Pending"
          value={loading ? '—' : String(stats.pending)}
          icon={Clock3}
          tone="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          label="Expired"
          value={loading ? '—' : String(stats.expired)}
          icon={XCircle}
          tone="bg-red-50 text-red-600"
        />
      </div>

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
              placeholder="Search quotation no, customer name..."
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
              setStatus(e.target.value as QuotationStatus | 'all')
              setPage(1)
            }}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="converted">Converted</option>
            <option value="expired">Expired</option>
          </Select>

          <Select
            className="sanro-select--sm w-auto min-w-[140px]"
            value={type}
            onChange={(e) => {
              setType(e.target.value as QuotationType | 'all')
              setPage(1)
            }}
          >
            <option value="all">All Types</option>
            {(Object.keys(TYPE_LABELS) as QuotationType[]).map((key) => (
              <option key={key} value={key}>
                {TYPE_LABELS[key]}
              </option>
            ))}
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
                <th className="px-4 py-3">Quotation No.</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Valid Till</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Amount (Rs)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0F4]">
              {pageItems.map((item, index) => (
                <tr key={item.id} className="hover:bg-[#F8F9FC]/80">
                  <td className="px-4 py-3.5 text-ink-muted">{pageStart + index + 1}</td>
                  <td className="px-4 py-3.5 font-medium text-[#1e3a5f]">
                    {item.quotation_number}
                  </td>
                  <td className="px-4 py-3.5 text-ink-muted">
                    {formatDate(item.quotation_date)}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-ink">
                    {item.customer_name || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-ink-muted">
                    {item.valid_till ? formatDate(item.valid_till) : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-ink-muted">
                    {item.item_count ?? 0} Item{(item.item_count ?? 0) === 1 ? '' : 's'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-ink">
                    {formatCurrency(item.grand_total)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        'inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium',
                        STATUS_STYLES[item.status],
                      )}
                    >
                      {quotationStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/quotations/${item.id}`}
                        className="rounded-md bg-sky-50 px-2.5 py-1 text-[12px] font-medium text-sky-700 hover:bg-sky-100"
                      >
                        View
                      </Link>
                      <Link
                        to={`/quotations/${item.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-700 hover:bg-amber-100"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError('')
                          setDeleting(item)
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
                      ? 'Loading quotations…'
                      : error
                        ? error
                        : quotations.length === 0
                          ? 'No quotations yet. Create your first quotation.'
                          : 'No quotations found for this filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-[inset_0_1px_0_0_rgba(15,23,42,0.06)]">
          <div className="text-sm text-ink-muted">
            Showing {showingFrom} to {showingTo} of {filtered.length} quotations
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
            aria-label="Delete quotation"
          >
            <div className="px-5 py-4 sanro-divider">
              <h2 className="text-base font-semibold text-ink">Delete quotation?</h2>
              <p className="mt-1 text-[13px] text-ink-muted">
                This will permanently remove quotation{' '}
                <span className="font-medium text-ink">{deleting.quotation_number}</span>
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
                        throw new Error('Connect Supabase in .env to delete quotations.')
                      }
                      await deleteQuotation(deleting.id)
                      setDeleting(null)
                      reload()
                    } catch (err) {
                      setDeleteError(
                        err instanceof Error
                          ? err.message
                          : 'Could not delete the quotation.',
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
}: {
  label: string
  value: string
  icon: typeof FileText
  tone: string
}) {
  return (
    <div className="rounded-xl bg-white p-5 sanro-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-medium text-ink-muted">{label}</div>
          <div className="mt-2 text-[1.5rem] font-semibold tracking-tight text-ink">
            {value}
          </div>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', tone)}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  )
}
